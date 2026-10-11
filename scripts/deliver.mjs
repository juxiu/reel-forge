import fs from "node:fs";
import crypto from "node:crypto";
import {packageDelivery} from "../src/delivery/package.mjs";
import {releaseFingerprint} from "../src/release/fingerprint.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const base = "artifacts/" + project.project_id + "/";
const required = [
  "artifacts/render/reel-forge-16x9.mp4",
  "script/timeline.json",
  "script/timeline.md",
  "script/timeline-source.json",
  "分镜表.md",
  base + "research.json",
  base + "research.md",
  base + "script.json",
  base + "qc/report.json",
  base + "qc/report.md",
  base + "qc/frame_metrics_16x9.json",
  base + "qc/motion_16x9.json",
  base + "qc/visual_regression_16x9.json",
  base + "qc/text_provenance.json",
  base + "audio/asr-second-pass.json",
  "fixtures/render-ir-16x9.json",
];
const optional = [
  base + "audio/voice-manifest.json",
  base + "audio/asr-provider-output.json",
  base + "build-groups/manifest.json",
  base + "runtime/state.json",
  base + "runtime/checkpoints.json",
  "artifacts/preview/manifest.json",
  base + "repair/repair-plan.json",
  base + "repair/status.json",
  base + "repair/source-repair.json",
];
const files = [...required, ...optional.filter((file) => fs.existsSync(file))];
for (const file of required) {
  if (!fs.existsSync(file) || !fs.statSync(file).size) throw new Error("delivery input missing or empty: " + file);
}

const asr = JSON.parse(fs.readFileSync(base + "audio/asr-second-pass.json", "utf8"));
if (asr.required_real_asr === true && asr.source !== "external-asr-provider") {
  throw new Error("real ASR was required but delivery artifact is not provider-backed");
}
const qc = JSON.parse(fs.readFileSync(base + "qc/report.json", "utf8"));
if (qc.status !== "PASS") throw new Error("delivery requires PASS QC");
const provenance = JSON.parse(fs.readFileSync(base + "qc/text_provenance.json", "utf8"));
if (provenance.status !== "PASS") throw new Error("delivery requires traceable on-screen text");
// visual-pixel 回归记录仅为 run-to-run 位移，不参与交付判定（清单/脚本 embedding 版本由 verify:visual-benchmark 对撞）。
// 临时单画幅交付：只打包并验证 16:9；9:16 的旧产物不会被纳入本次交付。
const ACCEPT = new Set(["16x9"]);
for (const ratio of ["16x9"]) {
  const frame = JSON.parse(fs.readFileSync(base + "qc/frame_metrics_" + ratio + ".json", "utf8"));
  const motion = JSON.parse(fs.readFileSync(base + "qc/motion_" + ratio + ".json", "utf8"));
  const visual = JSON.parse(fs.readFileSync(base + "qc/visual_regression_" + ratio + ".json", "utf8"));
  if (ACCEPT.has(ratio) && (frame.summary?.status !== "PASS" || motion.summary?.status !== "PASS")) {
    throw new Error("delivery requires PASS frame/motion metrics: " + ratio);
  }
  if (visual.gate !== "advisory" || visual.blocking !== false) {
    throw new Error("visual regression must stay advisory: " + ratio);
  }
}
// 交付包必须能自证「装的是当前这次渲染」：把当前 16:9 成片的 sha256 与打包时输入指纹写进 metadata，
// verify:production 会重算 artifacts/render 的哈希比对 —— 事故（2026-10-11）：渲染更新后旧包
// 照样过生产门（门只验包内自洽，不验包内 mp4 与当前渲染一致）。
const renderHashes = {};
for (const ratio of ["16x9"]) {
  const file = "artifacts/render/reel-forge-" + ratio + ".mp4";
  renderHashes[file] = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const result = packageDelivery({
  projectId: project.project_id,
  files,
  metadata: {
    contract_version: "0.3",
    ratios: ["16x9"],
    accept_ratios: [...ACCEPT],
    input_fingerprint: releaseFingerprint().fingerprint,
    render_hashes: renderHashes,
    qc_status: qc.status,
    visual_regression: "advisory",
    text_provenance: provenance.status,
    asr_provider: asr.provider,
    real_asr: asr.required_real_asr === true,
    required_files: required.map((file) => file.split("/").pop()),
    optional_files: optional.filter((file) => fs.existsSync(file)).map((file) => file.split("/").pop()),
  },
});
if (result.files.length < required.length || result.files.some((file) => !file.sha256 || !file.size)) {
  throw new Error("delivery manifest incomplete");
}
console.log("delivery PASS", JSON.stringify(result));
