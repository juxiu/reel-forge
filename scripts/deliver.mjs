import fs from "node:fs";
import {packageDelivery} from "../src/delivery/package.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const base = "artifacts/" + project.project_id + "/";
const required = [
  "artifacts/render/reel-forge-16x9.mp4",
  "artifacts/render/reel-forge-9x16.mp4",
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
  base + "qc/frame_metrics_9x16.json",
  base + "qc/motion_16x9.json",
  base + "qc/motion_9x16.json",
  base + "qc/visual_regression_16x9.json",
  base + "qc/visual_regression_9x16.json",
  base + "qc/text_provenance.json",
  base + "audio/asr-second-pass.json",
  "fixtures/render-ir-16x9.json",
  "fixtures/render-ir-9x16.json",
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
// visual-pixel-v1 仅为回归记录，不参与交付判定。
for (const ratio of ["16x9", "9x16"]) {
  const frame = JSON.parse(fs.readFileSync(base + "qc/frame_metrics_" + ratio + ".json", "utf8"));
  const motion = JSON.parse(fs.readFileSync(base + "qc/motion_" + ratio + ".json", "utf8"));
  const visual = JSON.parse(fs.readFileSync(base + "qc/visual_regression_" + ratio + ".json", "utf8"));
  if (frame.summary?.status !== "PASS" || motion.summary?.status !== "PASS") {
    throw new Error("delivery requires PASS frame/motion metrics: " + ratio);
  }
  if (visual.gate !== "advisory" || visual.blocking !== false) {
    throw new Error("visual regression must stay advisory: " + ratio);
  }
}

const result = packageDelivery({
  projectId: project.project_id,
  files,
  metadata: {
    contract_version: "0.3",
    ratios: ["16x9", "9x16"],
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
