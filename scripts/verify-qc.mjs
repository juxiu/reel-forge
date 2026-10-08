import fs from "node:fs";
import {runMediaQc} from "../src/qc/run.mjs";

// 阻断项：媒体探测、frame/motion 指标、画面文字出处。
// 非阻断项：visual-pixel-v1 回归记录（参考资产为 64x36 合成图，embedding 非语义模型）。
const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const qcDir = "artifacts/" + project.project_id + "/qc";
const results = [];
for (const ratio of ["16x9", "9x16"]) {
  const file = "artifacts/render/reel-forge-" + ratio + ".mp4";
  if (!fs.existsSync(file)) throw new Error("render missing: " + file);
  const report = await runMediaQc(file);
  if (report.status !== "PASS") throw new Error("QC failed for " + ratio + ": " + JSON.stringify(report.issues));

  const frameFile = qcDir + "/frame_metrics_" + ratio + ".json";
  const motionFile = qcDir + "/motion_" + ratio + ".json";
  for (const [label, file] of [["frame metrics", frameFile], ["motion", motionFile]]) {
    if (!fs.existsSync(file)) throw new Error(label + " missing: " + file);
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    if (report.summary?.status !== "PASS") throw new Error(label + " failed for " + ratio);
  }

  const visualFile = qcDir + "/visual_regression_" + ratio + ".json";
  if (!fs.existsSync(visualFile)) throw new Error("visual regression record missing: " + visualFile);
  const visual = JSON.parse(fs.readFileSync(visualFile, "utf8"));
  if (visual.gate !== "advisory" || visual.blocking !== false) throw new Error("visual regression must stay advisory: " + ratio);

  results.push({
    ratio,
    status: report.status,
    motion_frames: report.motion_frames,
    black_segments: report.black_segments,
    duration: Number(report.probe?.format?.duration || 0),
    visual_record: visual.status,
    mean_reference_similarity: Number((visual.scenes || []).reduce((sum, s) => sum + Number(s.reference_similarity || 0), 0) / Math.max(1, (visual.scenes || []).length).toFixed(3)),
  });
}
const provenanceFile = qcDir + "/text_provenance.json";
if (!fs.existsSync(provenanceFile)) throw new Error("text provenance missing: " + provenanceFile);
const provenance = JSON.parse(fs.readFileSync(provenanceFile, "utf8"));
if (provenance.status !== "PASS") throw new Error("text provenance failed: " + JSON.stringify((provenance.issues || []).slice(0, 8)));
for (const item of results) {
  if (!(item.duration > 0)) throw new Error("invalid duration: " + item.ratio);
  if (!(item.motion_frames >= 2)) throw new Error("insufficient motion: " + item.ratio);
}
console.log("qc PASS", JSON.stringify({ media: results, text_provenance: provenance.status, traced_elements: provenance.traced_elements }));