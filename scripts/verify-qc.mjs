import fs from "node:fs";
import path from "node:path";
import {runMediaQc} from "../src/qc/run.mjs";

const ratios = [
  {id: "16x9", file: "artifacts/render/reel-forge-16x9.mp4", frames: "artifacts/frames/16x9", frameReport: "frame_metrics_16x9.json", motionReport: "motion_16x9.json"},
  {id: "9x16", file: "artifacts/render/reel-forge-9x16.mp4", frames: "artifacts/frames/9x16", frameReport: "frame_metrics_9x16.json", motionReport: "motion_9x16.json"},
];

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const qcDir = path.join("artifacts", project.project_id, "qc");
const reports = [];
const issues = [];

for (const ratio of ratios) {
  if (!fs.existsSync(ratio.file)) {
    reports.push({ratio: ratio.id, file: ratio.file, status: "FAIL", issues: [{node: "render-" + ratio.id, type: "missing_media"}]});
    issues.push({node: "render-" + ratio.id, type: "missing_media", ratio: ratio.id});
    continue;
  }

  const report = await runMediaQc(ratio.file);
  reports.push({ratio: ratio.id, file: ratio.file, ...report});

  for (const issue of report.issues || []) {
    issues.push({
      node: issue.node || "render-" + ratio.id,
      type: issue.type,
      file: ratio.file,
      ratio: ratio.id,
    });
  }

  const frameFile = path.join(qcDir, ratio.frameReport);
  if (fs.existsSync(frameFile)) {
    const frameReport = JSON.parse(fs.readFileSync(frameFile, "utf8"));
    if (frameReport.summary?.status === "FAIL") {
      const failures = frameReport.summary?.scenes?.filter((scene) => scene.status === "FAIL") || [];
      if (failures.length) {
        for (const scene of failures) issues.push({node: scene.id, type: "freeze", ratio: ratio.id});
      } else {
        issues.push({node: "layout-" + ratio.id, type: "frame_metrics_fail", ratio: ratio.id});
      }
    }
  }

  const motionFile = path.join(qcDir, ratio.motionReport);
  if (fs.existsSync(motionFile)) {
    const motionReport = JSON.parse(fs.readFileSync(motionFile, "utf8"));
    if (motionReport.summary?.status === "FAIL") {
      const failures = motionReport.summary?.scenes?.filter((scene) => scene.status === "FAIL") || [];
      if (failures.length) {
        for (const scene of failures) issues.push({node: scene.id, type: "motion_too_low", ratio: ratio.id});
      } else {
        issues.push({node: "layout-" + ratio.id, type: "motion_too_low", ratio: ratio.id});
      }
    }
  }
}

const result = {
  project_id: project.project_id,
  status: issues.length ? "FAIL" : "PASS",
  issues,
  media: reports.map((report) => ({
    ratio: report.ratio,
    file: report.file,
    status: report.status,
    motion_frames: report.motion_frames,
    black_segments: report.black_segments,
    duration: report.probe?.format?.duration || 0,
  })),
  generated_at: new Date().toISOString(),
};

fs.mkdirSync(qcDir, {recursive: true});
fs.writeFileSync(path.join(qcDir, "report.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(
  path.join(qcDir, "report.md"),
  "# QC 报告\n\n状态：" + result.status + "\n\n" +
    result.media.map((item) => "- " + item.ratio + " / " + item.file + "：duration=" + item.duration + "s / motion=" + item.motion_frames + " / black=" + item.black_segments).join("\n") +
    "\n\n## 问题\n" +
    (issues.length ? issues.map((issue) => "- " + issue.node + " / " + issue.type + " / " + (issue.ratio || "media")).join("\n") : "- 无") +
    "\n"
);

console.log("QC", result.status);
if (result.status !== "PASS") process.exit(1);
