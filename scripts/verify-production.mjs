import fs from "node:fs";
import crypto from "node:crypto";
import {releaseFingerprint} from "../src/release/fingerprint.mjs";
import {productionContentFingerprints} from "../src/release/content-gates.mjs";
import {durationTargetReport} from "../src/release/duration-target.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const root = "artifacts/" + project.project_id;
const required = [
  "research.json","research.md","script.json","agent-review-gate.json","duration-target.json","qc/report.json","qc/report.md",
  "qc/frame_metrics_16x9.json",
  "qc/motion_16x9.json",
  "qc/visual_regression_16x9.json","qc/text_provenance.json",
  "audio/asr-second-pass.json","repair/status.json","repair/source-repair.json",
];
for (const file of required) {
  const full = root + "/" + file;
  if (!fs.existsSync(full) || !fs.statSync(full).size) throw new Error("production artifact missing: " + full);
}
// Research/Director Agent outputs must be complete, clean, and bound to this exact research + script.
const reviewGate = JSON.parse(fs.readFileSync(root + "/agent-review-gate.json","utf8"));
if (reviewGate.status !== "PASS" || !Array.isArray(reviewGate.errors) || reviewGate.errors.length) {
  throw new Error("agent review gate not PASS");
}
const researchArtifact = JSON.parse(fs.readFileSync(root + "/research.json","utf8"));
const scriptArtifact = JSON.parse(fs.readFileSync(root + "/script.json","utf8"));
const reviewFingerprints = productionContentFingerprints(researchArtifact,scriptArtifact);
if (reviewGate.project_id !== project.project_id
  || reviewGate.research_fingerprint !== reviewFingerprints.research_fingerprint
  || reviewGate.script_fingerprint !== reviewFingerprints.script_fingerprint
  || reviewGate.claim_count !== (researchArtifact.claims || []).length
  || reviewGate.segment_count !== (scriptArtifact.segments || []).length) {
  throw new Error("agent review gate is stale or bound to different research/script inputs");
}
// 临时单画幅生产门：只要求与 16:9 输出对应的渲染和 QC 产物，9:16 不参与当前发布条件。
const ACCEPT = new Set(["16x9"]);
if (!ACCEPT.has("16x9")) throw new Error("ACCEPT_RATIOS 必须包含 16x9（16:9 是验收基准，不可移出范围）");
for (const ratio of ["16x9"]) {
  const render = "artifacts/render/reel-forge-" + ratio + ".mp4";
  if (!fs.existsSync(render) || !fs.statSync(render).size) throw new Error("production render missing: " + render);
  const frame = JSON.parse(fs.readFileSync(root + "/qc/frame_metrics_" + ratio + ".json","utf8"));
  const motion = JSON.parse(fs.readFileSync(root + "/qc/motion_" + ratio + ".json","utf8"));
  const visual = JSON.parse(fs.readFileSync(root + "/qc/visual_regression_" + ratio + ".json","utf8"));
  if (ACCEPT.has(ratio)) {
    if (frame.summary?.status !== "PASS") throw new Error("frame metrics not PASS: " + ratio);
    if (motion.summary?.status !== "PASS") throw new Error("motion metrics not PASS: " + ratio);
  }
  if (visual.gate !== "advisory" || visual.blocking !== false) throw new Error("visual regression must stay advisory: " + ratio);

  // ---- 测量覆盖度：量到的镜头集必须与 IR 一致 ----
  // ⚠ 事故记录：QC 曾经只报「status: PASS」，不证明它量的是**这版 IR 的每一个镜头**。
  //   2026-10-08 的 4 镜测量一路配着 44 镜的 IR 报 PASS —— status 是 PASS，但只 PASS 了 4 个镜头。
  //   「量过的都对」不等于「该量的都量了」，这里把后者补上。
  const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-" + ratio + ".json","utf8"));
  if (ir.project_id !== project.project_id) throw new Error("production project/IR identity mismatch: " + ir.project_id + " != " + project.project_id);
  const durationGate = durationTargetReport(project, ir.duration);
  if (durationGate.status !== "PASS") throw new Error("production duration target FAIL: " + durationGate.issues.join(" | "));
  const durationArtifact = JSON.parse(fs.readFileSync(root + "/duration-target.json","utf8"));
  if (durationArtifact.status !== "PASS"
    || durationArtifact.project_id !== project.project_id
    || durationArtifact.target_seconds !== durationGate.target_seconds
    || durationArtifact.actual_seconds !== durationGate.actual_seconds
    || durationArtifact.tolerance_ratio !== durationGate.tolerance_ratio) {
    throw new Error("duration target artifact is stale or does not match the active Render IR");
  }
  const fps = Number(ir.fps) || 30;
  const want = new Map((ir.scenes || []).map((s) => {
    const from = Math.round(Number(s.start) * fps);
    const to = Math.max(from, Math.ceil((Number(s.start) + Number(s.duration)) * fps) - 1);
    return [s.id, {from, to}];
  }));
  for (const [name, measured] of [["motion", motion], ["frame_metrics", frame]]) {
    const got = measured.summary?.scenes || [];
    if (got.length !== want.size) {
      throw new Error(
        `测量覆盖不足：${name}_${ratio} 量了 ${got.length} 个镜头，IR 有 ${want.size} 个` +
        "（测量文件是旧 输入跑出来的，重跑 render → QC 再交付）",
      );
    }
    for (const scene of got) {
      const ref = want.get(scene.id);
      if (!ref) throw new Error(`测量覆盖越界：${name}_${ratio} 量到 IR 里没有的镜头 ${scene.id}`);
      if (scene.from !== ref.from || scene.to !== ref.to) {
        throw new Error(
          `测量区间漂移：${name}_${ratio} ${scene.id} 量为 [${scene.from},${scene.to}]，IR 为 [${ref.from},${ref.to}]`,
        );
      }
    }
  }
}
// 阻断项：画面文字必须可溯源到解说词 / 调研（a2e 硬性原则 2「事实有出处」）。
const provenance = JSON.parse(fs.readFileSync(root + "/qc/text_provenance.json", "utf8"));
if (provenance.status !== "PASS") throw new Error("text provenance not PASS");
const qc = JSON.parse(fs.readFileSync(root + "/qc/report.json","utf8"));
if (qc.status !== "PASS") throw new Error("production QC not PASS");

// ---- 产物新鲜度：这份 QC 是不是**当前**输入跑出来的 ----
// ⚠ 事故记录：这道门以前只查「文件在不在 / status 是不是 PASS」，于是 2026-10-08 的 4 镜产物
//   一路配着 2026-10-09 才换成 44 镜的 render-ir 照样报 PASS（delivery_files:29）。
//   「文件都在」与「产物对得上」是两件事，后者才是「生产完成」的意思。
const current = releaseFingerprint();
const recorded = qc.input_fingerprint;
if (!recorded || typeof recorded.fingerprint !== "string") {
  throw new Error(
    "production QC 没有记录输入指纹（input_fingerprint）—— 无法证明这些产物对应当前输入。" +
    "重跑 npm run qc 让它写入指纹。",
  );
}
if (recorded.fingerprint !== current.fingerprint) {
  throw new Error(
    "production 产物已过期：QC 记录的输入指纹与当前不一致\n" +
    `  当前: ${current.fingerprint.slice(0, 16)}…（IR ${current.scenes} 镜 / 镜头源 ${current.shots} 个）\n` +
    `  产物: ${String(recorded.fingerprint).slice(0, 16)}…（记于 ${recorded.at || "?"}）\n` +
    "  输入改了就得重跑 render → QC → repair → delivery，别拿旧产物当完成。",
  );
}

const asr = JSON.parse(fs.readFileSync(root + "/audio/asr-second-pass.json","utf8"));
if (asr.provider !== "tts-word-boundary" || asr.source !== "tts-word-boundary" || asr.alignment_mode !== "tts-word-boundary") {
  throw new Error("production timeline alignment must use tts-word-boundary");
}

const repair = JSON.parse(fs.readFileSync(root + "/repair/status.json","utf8"));
const sourceRepair = JSON.parse(fs.readFileSync(root + "/repair/source-repair.json","utf8"));
if (!Array.isArray(sourceRepair.entries)) throw new Error("source repair audit malformed");
if (!["patched","not-needed"].includes(repair.status)) throw new Error("invalid repair status: " + repair.status);

const manifestPath = "artifacts/delivery/" + project.project_id + "/delivery-manifest.json";
if (!fs.existsSync(manifestPath)) throw new Error("delivery manifest missing");
const manifest = JSON.parse(fs.readFileSync(manifestPath,"utf8"));
if (manifest.metadata?.qc_status !== "PASS") throw new Error("delivery QC metadata not PASS");
// ---- 打包对账：交付包必须装的是「当前这次渲染」 ----
// ⚠ 事故（2026-10-11，发现于本次终验）：渲染更新后旧包照样过生产门 —— 门只验包内
//   sha256 自洽，从不问「包里的 mp4 是不是 QC 量的那一版」。这里用 deliver 写进 metadata 的
//   render_hashes（打包时 artifacts/render 成片的哈希）与 input_fingerprint 做两道回验：
//   a) 成片哈希对不上 → 渲染在打包后被更新，必须重新 deliver；
//   b) 包指纹对不上 → 输入在打包后被改过，同样必须重新 deliver。
//   旧版清单没有这些字段时直接判失败（不支持无对账能力的旧包装作新包）。
const recordedHashes = manifest.metadata?.render_hashes;
if (!recordedHashes || typeof recordedHashes !== "object" || !Object.keys(recordedHashes).length) {
  throw new Error("delivery manifest 未记录 render_hashes（旧版清单），重跑 npm run deliver");
}
for (const [file, hash] of Object.entries(recordedHashes)) {
  if (!fs.existsSync(file)) throw new Error("packaged render source missing: " + file);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (actual !== hash) throw new Error("交付包与当前渲染不一致：" + file + " 在打包后被更新，重跑 npm run deliver");
}
if (!manifest.metadata?.input_fingerprint) {
  throw new Error("delivery manifest 未记录 input_fingerprint（旧版清单），重跑 npm run deliver");
}
if (manifest.metadata.input_fingerprint !== current.fingerprint) {
  throw new Error("交付包已过期：打包时的输入指纹与当前不一致，重跑 npm run deliver");
}
for (const entry of manifest.files || []) {
  const file = "artifacts/delivery/" + project.project_id + "/" + entry.name;
  if (!fs.existsSync(file)) throw new Error("delivery artifact missing: " + file);
  const data = fs.readFileSync(file);
  const sha = crypto.createHash("sha256").update(data).digest("hex");
  if (sha !== entry.sha256 || data.length !== entry.size) throw new Error("delivery integrity mismatch: " + entry.name);
}
console.log("production gate PASS", JSON.stringify({
  project_id:project.project_id,
  accept_ratios:[...ACCEPT],
  rendering_ratios:["16x9"],
  disabled_ratios:["9x16"],
  alignment_mode:asr.alignment_mode,
  timeline_source:"tts-word-boundary",
  qc:qc.status,
  input_fingerprint:current.fingerprint.slice(0,16),
  scenes:current.scenes,
  shot_sources:current.shots,
  visual_regression:"advisory",
  text_provenance:provenance.status,
  delivery_files:manifest.files.length
}));
