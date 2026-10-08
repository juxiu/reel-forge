import fs from "node:fs";
import path from "node:path";
import {runMediaQc} from "../src/qc/run.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const files = [
  "artifacts/render/reel-forge-16x9.mp4",
  "artifacts/render/reel-forge-9x16.mp4",
];

const reports = [];
for (const file of files) {
  if (!fs.existsSync(file)) {
    reports.push({file, status: "FAIL", issues: [{node: "render", type: "missing_media"}]});
    continue;
  }
  const report = await runMediaQc(file);
  reports.push({file, ...report});
}

const issues = [];
const qcDir = path.join("artifacts", project.project_id, "qc");

for (const ratio of ["16x9", "9x16"]) {
  const frameFile = path.join(qcDir, "frame_metrics_" + ratio + ".json");
  const motionFile = path.join(qcDir, "motion_" + ratio + ".json");
  const visualFile = path.join(qcDir, "visual_regression_" + ratio + ".json");

  if (fs.existsSync(frameFile)) {
    const frameReport = JSON.parse(fs.readFileSync(frameFile, "utf8"));
    if (frameReport.summary?.status === "FAIL") {
      const sceneFailures = frameReport.summary?.scenes?.filter((scene) => scene.status === "FAIL") || [];
      if (sceneFailures.length) {
        for (const scene of sceneFailures) issues.push({node: scene.id, type: "freeze", ratio});
      } else issues.push({node: "layout-" + ratio, type: "frame_metrics_fail", ratio});
    }
  }

  if (fs.existsSync(motionFile)) {
    const motionReport = JSON.parse(fs.readFileSync(motionFile, "utf8"));
    if (motionReport.summary?.status === "FAIL") {
      const sceneFailures = motionReport.summary?.scenes?.filter((scene) => scene.status === "FAIL") || [];
      if (sceneFailures.length) {
        for (const scene of sceneFailures) issues.push({node: scene.id, type: "motion_too_low", ratio});
      } else issues.push({node: "layout-" + ratio, type: "motion_too_low", ratio});
    }
  }

  if (fs.existsSync(visualFile)) {
    const visualReport = JSON.parse(fs.readFileSync(visualFile, "utf8"));
    for (const scene of visualReport.scenes || []) {
      if (scene.status === "FAIL") {
        issues.push({node: scene.scene, type: "visual_regression_fail", ratio});
      }
    }
    if (visualReport.status === "FAIL" && !(visualReport.scenes || []).length) {
      issues.push({node: "visual-" + ratio, type: "visual_regression_fail", ratio});
    }
  }
}

for (const report of reports) {
  for (const issue of report.issues || []) {
    issues.push({
      node: issue.node || (report.file.includes("9x16") ? "layout-tall" : "layout-wide"),
      type: issue.type,
      file: report.file,
    });
  }
}

const result = {
  project_id: project.project_id,
  status: issues.length ? "FAIL" : "PASS",
  issues,
  media: reports.map((report) => ({
    file: report.file,
    status: report.status,
    motion_frames: report.motion_frames,
    black_segments: report.black_segments,
    duration: report.probe?.format?.duration || 0,
  })),
  visual_regression: ["16x9", "9x16"].map((ratio) => {
    const file = path.join(qcDir, "visual_regression_" + ratio + ".json");
    if (!fs.existsSync(file)) return {ratio, status: "MISSING"};
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ratio,
      status: report.status,
      scenes: (report.scenes || []).map((scene) => ({
        scene: scene.scene,
        reference_similarity: scene.reference_similarity,
        anti_similarity: scene.anti_similarity,
        quality_band: scene.quality_band,
      })),
    };
  }),
  generated_at: new Date().toISOString(),
};

const outDir = path.join("artifacts", project.project_id, "qc");
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(
  path.join(outDir, "report.md"),
  "# QC 报告\n\n状态：" + result.status + "\n\n" +
  result.media.map((item) => "- " + item.file + "：duration=" + item.duration + "s / motion=" + item.motion_frames + " / black=" + item.black_segments).join("\n") +
  "\n\n## Visual Regression\n" +
  result.visual_regression.map((item) => "- " + item.ratio + "：" + item.status + (item.scenes ? " / scenes=" + item.scenes.length : "")).join("\n") +
  "\n\n## 问题\n" +
  (issues.length ? issues.map((issue) => "- " + issue.node + " / " + issue.type + " / " + (issue.ratio || "media")).join("\n") : "- 无") + "\n"
);
console.log("QC", result.status);
if (result.status !== "PASS") process.exit(1);
