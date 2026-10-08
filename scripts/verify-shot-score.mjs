import fs from "node:fs";
import {lintShotScores, scoreShot} from "../src/visual/shot-score.mjs";

function loadVisualByScene(ratio) {
  const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
  const file = "artifacts/" + project.project_id + "/qc/visual_regression_" + ratio + ".json";
  if (!fs.existsSync(file)) return {};
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.fromEntries((report.scenes || []).map(scene => [scene.scene, scene]));
}

for (const ratio of ["16x9", "9x16"]) {
  const file = "fixtures/render-ir-" + ratio + ".json";
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const visualByScene = loadVisualByScene(ratio);
  const issues = lintShotScores(ir, {visualByScene});
  if (issues.length) {
    console.error("shot score FAIL " + ratio);
    issues.forEach(issue => console.error("- " + issue));
    process.exit(1);
  }
  console.log("shot score PASS " + ratio, JSON.stringify(ir.scenes.map(scene => ({
    id: scene.id,
    score: scoreShot(scene, visualByScene[scene.id] || {}).score
  }))));
}
