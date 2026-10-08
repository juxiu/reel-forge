import fs from "node:fs";
import path from "node:path";
import {buildScenes} from "../src/build/parallel-scenes.mjs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const maxPerGroup = Number(process.env.MAX_SHOTS_PER_GROUP || 5);
const groups = [];
for (let i = 0; i < ir.scenes.length; i += maxPerGroup) {
  groups.push({
    id: "G" + String(groups.length + 1),
    scenes: ir.scenes.slice(i, i + maxPerGroup),
  });
}

const built = await buildScenes(groups, async (group) => ({
  id: group.id,
  scene_ids: group.scenes.map((scene) => scene.id),
  source: group.scenes.map((scene) => ({
    scene_id: scene.id,
    from: Math.round(scene.start * ir.fps),
    to: Math.round((scene.start + scene.duration) * ir.fps),
  })),
  status: "built",
}), {concurrency: Number(process.env.BUILD_CONCURRENCY || 4)});

const outDir = path.join("artifacts", ir.project_id, "build-groups");
fs.mkdirSync(outDir, {recursive: true});
for (const group of built) {
  fs.writeFileSync(path.join(outDir, group.id + ".json"), JSON.stringify(group, null, 2));
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({
  project_id: ir.project_id,
  concurrency: Number(process.env.BUILD_CONCURRENCY || 4),
  groups: built.map((group) => group.id),
  status: "built",
}, null, 2));
console.log("build groups PASS", built.length);
