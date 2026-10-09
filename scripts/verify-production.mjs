import fs from "node:fs";
import crypto from "node:crypto";
import {releaseFingerprint} from "../src/release/fingerprint.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const root = "artifacts/" + project.project_id;
const required = [
  "research.json","research.md","script.json","qc/report.json","qc/report.md",
  "qc/frame_metrics_16x9.json","qc/frame_metrics_9x16.json",
  "qc/motion_16x9.json","qc/motion_9x16.json",
  "qc/visual_regression_16x9.json","qc/visual_regression_9x16.json","qc/text_provenance.json",
  "audio/asr-second-pass.json","repair/status.json","repair/source-repair.json",
];
for (const file of required) {
  const full = root + "/" + file;
  if (!fs.existsSync(full) || !fs.statSync(full).size) throw new Error("production artifact missing: " + full);
}
for (const ratio of ["16x9","9x16"]) {
  const render = "artifacts/render/reel-forge-" + ratio + ".mp4";
  if (!fs.existsSync(render) || !fs.statSync(render).size) throw new Error("production render missing: " + render);
  const frame = JSON.parse(fs.readFileSync(root + "/qc/frame_metrics_" + ratio + ".json","utf8"));
  const motion = JSON.parse(fs.readFileSync(root + "/qc/motion_" + ratio + ".json","utf8"));
  const visual = JSON.parse(fs.readFileSync(root + "/qc/visual_regression_" + ratio + ".json","utf8"));
  if (frame.summary?.status !== "PASS") throw new Error("frame metrics not PASS: " + ratio);
  if (motion.summary?.status !== "PASS") throw new Error("motion metrics not PASS: " + ratio);
  if (visual.gate !== "advisory" || visual.blocking !== false) throw new Error("visual regression must stay advisory: " + ratio);
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
for (const entry of manifest.files || []) {
  const file = "artifacts/delivery/" + project.project_id + "/" + entry.name;
  if (!fs.existsSync(file)) throw new Error("delivery artifact missing: " + file);
  const data = fs.readFileSync(file);
  const sha = crypto.createHash("sha256").update(data).digest("hex");
  if (sha !== entry.sha256 || data.length !== entry.size) throw new Error("delivery integrity mismatch: " + entry.name);
}
console.log("production gate PASS", JSON.stringify({
  project_id:project.project_id,
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
