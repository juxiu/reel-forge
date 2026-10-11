import fs from "node:fs";
import path from "node:path";
import {durationTargetReport} from "../src/release/duration-target.mjs";

const projectFile = process.env.PROJECT_FILE || "fixtures/project.json";
const irFile = process.env.RENDER_IR_FILE || "fixtures/render-ir-16x9.json";
const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
const ir = JSON.parse(fs.readFileSync(irFile, "utf8"));
const report = durationTargetReport(project, ir.duration);
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
