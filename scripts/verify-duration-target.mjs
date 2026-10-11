import fs from "node:fs";
import path from "node:path";
import {durationTargetReport} from "../src/release/duration-target.mjs";

/**
 * 目标时长门：把**真实生成**的成片时长与项目声明的 `duration_target_s` 对齐。
 *
 * 时长真源优先级：TTS 时间线（`script/timeline.json`，逐词边界的真实结果）> Render IR
 * （`ir.duration`，由 materialize-ir 从时间线推导）。时间线在盘上时以它为准，并要求它与
 * Render IR 自洽 —— 只改 JSON 数值（改 ir.duration 或项目目标）不足以通过这道门。
 *
 * 长视频与短视频走的是同一条逻辑：目标来自各自项目的 `duration_target_s`，容差默认 ±20%、
 * 可用 `duration_tolerance_ratio`（0–0.5）按项目覆盖，没有全局固定时长。
 */
const projectFile = process.env.PROJECT_FILE || "fixtures/project.json";
const irFile = process.env.RENDER_IR_FILE || "fixtures/render-ir-16x9.json";
const timelineFile = process.env.TIMELINE_FILE || "script/timeline.json";
const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
const ir = JSON.parse(fs.readFileSync(irFile, "utf8"));

let actual = Number(ir.duration);
let actualSource = "render-ir";
if (fs.existsSync(timelineFile)) {
  const timeline = JSON.parse(fs.readFileSync(timelineFile, "utf8"));
  const fps = Number(timeline.fps) || 30;
  const derived = Number(timeline.total_frames) / fps;
  if (!Number.isFinite(derived) || derived <= 0) {
    console.error("duration target FAIL: timeline duration invalid in " + timelineFile);
    process.exit(1);
  }
  if (Number.isFinite(actual) && actual > 0 && Math.abs(derived - actual) > 0.5) {
    console.error("duration target FAIL: timeline-derived " + derived.toFixed(2)
      + "s does not match Render IR " + actual.toFixed(2) + "s");
    process.exit(1);
  }
  actual = derived;
  actualSource = "timeline";
}

const report = durationTargetReport(project, actual);
report.actual_source = actualSource;
if (ir.project_id !== project.project_id) {
  report.issues.push("project/Render IR identity mismatch: " + project.project_id + " != " + ir.project_id);
  report.status = "FAIL";
}
const out = path.join("artifacts", project.project_id, "duration-target.json");
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
if (report.status !== "PASS") {
  console.error("duration target FAIL", JSON.stringify(report));
  process.exit(1);
}
console.log("duration target PASS", JSON.stringify(report));
