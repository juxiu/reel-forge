import fs from "node:fs";
import {lintShotScores, scoreShot} from "../src/visual/shot-score.mjs";

for (const ratio of ["16x9", "9x16"]) {
  const file = "fixtures/render-ir-" + ratio + ".json";
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const issues = lintShotScores(ir);
  if (issues.length) {
    console.error("shot score FAIL " + ratio);
    issues.forEach(issue => console.error("- " + issue));
    process.exit(1);
  }
  console.log("shot score PASS " + ratio, JSON.stringify(ir.scenes.map(scene => ({id: scene.id, score: scoreShot(scene).score}))));
}
