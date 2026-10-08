import fs from "node:fs";
import {packageDelivery} from "../src/delivery/package.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const required = [
  "artifacts/render/reel-forge-16x9.mp4",
  "artifacts/render/reel-forge-9x16.mp4",
  "script/timeline.json",
  "script/timeline.md",
  "script/timeline-source.json",
  "分镜表.md",
  "artifacts/" + project.project_id + "/research.json",
  "artifacts/" + project.project_id + "/research.md",
  "artifacts/" + project.project_id + "/script.json",
  "artifacts/" + project.project_id + "/qc/report.json",
];
const optional = [
  "artifacts/" + project.project_id + "/audio/voice-manifest.json",
  "artifacts/" + project.project_id + "/build-groups/manifest.json",
  "artifacts/" + project.project_id + "/runtime/state.json",
  "artifacts/" + project.project_id + "/runtime/checkpoints.json",
  "artifacts/preview/manifest.json",
  "artifacts/" + project.project_id + "/repair/repair-plan.json",
];
const files = [...required, ...optional.filter((file) => fs.existsSync(file))];
for (const file of required) {
  if (!fs.existsSync(file) || !fs.statSync(file).size) throw new Error("delivery input missing or empty: " + file);
}
const result = packageDelivery({projectId: project.project_id, files});
if (result.files.length < required.length || result.files.some((file) => !file.sha256 || !file.size)) {
  throw new Error("delivery manifest incomplete");
}
console.log("delivery PASS", JSON.stringify(result));
