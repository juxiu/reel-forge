import fs from "node:fs";
import {runMediaQc} from "../src/qc/run.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const results = [];
for (const ratio of ["16x9", "9x16"]) {
  const file = "artifacts/render/reel-forge-" + ratio + ".mp4";
  if (!fs.existsSync(file)) throw new Error("render missing: " + file);
  const report = await runMediaQc(file);
  if (report.status !== "PASS") throw new Error("QC failed for " + ratio + ": " + JSON.stringify(report.issues));

  const visualFile = "artifacts/" + project.project_id + "/qc/visual_regression_" + ratio + ".json";
  if (!fs.existsSync(visualFile)) throw new Error("visual regression missing: " + visualFile);
  const visual = JSON.parse(fs.readFileSync(visualFile, "utf8"));
  if (visual.status !== "PASS") throw new Error("visual regression failed for " + ratio);
  results.push({
    ratio,
    status: report.status,
    motion_frames: report.motion_frames,
    black_segments: report.black_segments,
    duration: Number(report.probe?.format?.duration || 0),
    reference_similarity: Number(Math.min(...(visual.scenes || []).map(s => s.reference_similarity ?? 0))),
  });
}
for (const item of results) {
  if (!(item.duration > 0)) throw new Error("invalid duration: " + item.ratio);
  if (!(item.motion_frames >= 2)) throw new Error("insufficient motion: " + item.ratio);
  if (!(item.reference_similarity >= 0.62)) throw new Error("reference similarity below gate: " + item.ratio);
}
console.log("qc PASS", JSON.stringify(results));
