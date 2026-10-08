import fs from "node:fs";
import {packageDelivery} from "../src/delivery/package.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const candidates = [
  "artifacts/render/reel-forge-16x9.mp4",
  "artifacts/render/reel-forge-9x16.mp4",
  "script/timeline.json",
  "script/timeline.md",
  "分镜表.md",
  "artifacts/" + project.project_id + "/research.json",
  "artifacts/" + project.project_id + "/script.json",
  "artifacts/" + project.project_id + "/qc/report.json",
];
const files = candidates.filter((file) => fs.existsSync(file));
const result = packageDelivery({projectId: project.project_id, files});
console.log("delivery PASS", JSON.stringify(result));
