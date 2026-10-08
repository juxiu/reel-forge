import fs from "node:fs";
import {runMediaQc} from "../src/qc/run.mjs";

const ratios = [
  {id: "16x9", file: "artifacts/render/reel-forge-16x9.mp4"},
  {id: "9x16", file: "artifacts/render/reel-forge-9x16.mp4"},
];

const results = [];
for (const ratio of ratios) {
  if (!fs.existsSync(ratio.file)) {
    throw new Error("render missing: " + ratio.file);
  }
  const report = await runMediaQc(ratio.file);
  results.push({
    ratio: ratio.id,
    status: report.status,
    motion_frames: report.motion_frames,
    black_segments: report.black_segments,
    duration: Number(report.probe?.format?.duration || 0),
  });
  if (report.status !== "PASS") {
    throw new Error("QC failed for " + ratio.id + ": " + JSON.stringify(report.issues));
  }
}

for (const item of results) {
  if (!(item.duration > 0)) throw new Error("invalid duration: " + item.ratio);
  if (!(item.motion_frames >= 2)) throw new Error("insufficient motion: " + item.ratio);
}

console.log("qc PASS", JSON.stringify(results));
