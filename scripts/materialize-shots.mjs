import fs from "node:fs";
import path from "node:path";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const maxPerGroup = Number(process.env.MAX_SHOTS_PER_GROUP || 6);
if (!Number.isInteger(maxPerGroup) || maxPerGroup < 1) throw new Error("MAX_SHOTS_PER_GROUP must be a positive integer");

const root = "src/shots";
const groups = [];

for (let i = 0; i < ir.scenes.length; i += maxPerGroup) {
  const id = "G" + String(groups.length + 1);
  const scenes = ir.scenes.slice(i, i + maxPerGroup);
  const dir = path.join(root, id);
  fs.mkdirSync(dir, {recursive: true});
  const imports = [];
  const exports = [];
  const entries = [];

  for (let j = 0; j < scenes.length; j++) {
    const scene = scenes[j];
    const shotId = "SC" + String(i + j + 1).padStart(2, "0");
    const shotFile = path.join(dir, shotId + ".jsx");

    if (!fs.existsSync(shotFile)) {
      fs.writeFileSync(
        shotFile,
        [
          'import React from "react";',
          'import {ExplainerShot} from "../Shot.jsx";',
          'export const SHOT_RECIPE = { shot_id: "' + shotId + '", variant: "' + (scene.variant || "generic") + '", settle_frames: 30 };',
          'export function ' + shotId + '({scene}) { return <ExplainerShot scene={scene} recipe={SHOT_RECIPE} />; }',
          "",
        ].join("\n"),
      );
    }

    imports.push('import {' + shotId + '} from "./' + shotId + '.jsx";');
    exports.push('export {' + shotId + '} from "./' + shotId + '.jsx";');
    entries.push('  "' + scene.id + '": ' + shotId + ',');
  }

  fs.writeFileSync(
    path.join(dir, "index.jsx"),
    imports.join("\n") + "\n" + exports.join("\n") + "\n\n" +
      "export const SHOTS_" + id + " = {\n" + entries.join("\n") + "\n};\n",
  );

  fs.writeFileSync(
    path.join(dir, "BUILD_NOTES.md"),
    [
      "# " + id + " 构建记录",
      "",
      "镜头数：" + scenes.length,
      "",
      ...scenes.map((scene, n) =>
        "- " + ("SC" + String(i + n + 1).padStart(2, "0")) + " / " + scene.id + " / " +
        Math.round(scene.start * ir.fps) + "–" + Math.round((scene.start + scene.duration) * ir.fps) + "f"
      ),
      "",
      "每个镜头独立组件，共用 ExplainerShot 图元；已有 authored scene 不会被覆盖。",
    ].join("\n") + "\n",
  );

  groups.push({id, scene_ids: scenes.map((scene) => scene.id), status: "generated"});
}

const registryImports = groups.map((group) =>
  'import * as ' + group.id + ' from "./' + group.id + '/index.jsx";'
).join("\n");

const registryEntries = [];
for (const group of groups) {
  for (const sceneId of group.scene_ids) {
    const number = Number(sceneId.split("-").at(-1));
    registryEntries.push(
      '  "' + sceneId + '": ' + group.id + '.SC' + String(number).padStart(2, "0") + ','
    );
  }
}

fs.writeFileSync(
  path.join(root, "registry.jsx"),
  registryImports + "\n\nexport const SHOT_REGISTRY = {\n" +
    registryEntries.join("\n") + "\n};\n",
);

console.log("shot materialization PASS", groups.length + " groups");
