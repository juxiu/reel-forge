import fs from "node:fs";
import path from "node:path";
import {maxShotsPerGroup} from "../src/build/limits.mjs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
if (!project.project_id || project.project_id !== ir.project_id) {
  throw new Error("project identity mismatch: fixtures/project.json and render IR must identify the same project");
}
const maxPerGroup = maxShotsPerGroup();
const root = "src/shots";
const authoredProjectFile = path.join(root, "AUTHORED_PROJECT.json");
const authoredProject = fs.existsSync(authoredProjectFile)
  ? JSON.parse(fs.readFileSync(authoredProjectFile, "utf8"))
  : null;

// Reuse the checked-in authored pack only for its exact topic/source identity.
// Otherwise route to IR-driven fallback wrappers instead of silently importing a previous topic.
const authoredPackMatches = Boolean(
  authoredProject &&
  authoredProject.project_id === project.project_id &&
  authoredProject.request === project.request &&
  JSON.stringify(authoredProject.source_urls || []) === JSON.stringify(project.source_urls || [])
);
function explicitlyTaggedForProject(file) {
  if (!fs.existsSync(file)) return false;
  const header = fs.readFileSync(file, "utf8").split(/\r?\n/).slice(0, 8).join("\n");
  return header.includes("@reel-forge-project: " + project.project_id);
}

const groups = [];
let authoredCount = 0;
let fallbackCount = 0;
for (let i = 0; i < ir.scenes.length; i += maxPerGroup) {
  const id = "G" + String(groups.length + 1);
  const scenes = ir.scenes.slice(i, i + maxPerGroup);
  const dir = path.join(root, id);
  fs.mkdirSync(dir, {recursive: true});
  const imports = [];
  const exports = [];
  const entries = [];
  const sceneSources = [];

  for (let j = 0; j < scenes.length; j++) {
    const scene = scenes[j];
    const shotId = "SC" + String(i + j + 1).padStart(2, "0");
    const shotFile = path.join(dir, shotId + ".jsx");
    const authored = fs.existsSync(shotFile) &&
      (authoredPackMatches || explicitlyTaggedForProject(shotFile));
    const componentFile = authored ? shotId + ".jsx" : "fallback-" + shotId + ".jsx";

    if (authored) {
      authoredCount++;
    } else {
      fallbackCount++;
      fs.writeFileSync(path.join(dir, componentFile), [
        "// Generated fallback for project " + JSON.stringify(project.project_id) + ".",
        "// Active scene data supplies copy/variant; stale authored files are intentionally not imported.",
        'import React from "react";',
        'import {ExplainerShot} from "../Shot.jsx";',
        'export const SHOT_RECIPE = { shot_id: ' + JSON.stringify(shotId) + ', variant: ' + JSON.stringify(scene.variant || "generic") + ', settle_frames: 30 };',
        'export function ' + shotId + '({scene}) { return <ExplainerShot scene={scene} recipe={SHOT_RECIPE} />; }',
        "",
      ].join("\n"));
    }

    imports.push('import {' + shotId + '} from "./' + componentFile + '";');
    exports.push('export {' + shotId + '} from "./' + componentFile + '";');
    entries.push('  ' + JSON.stringify(scene.id) + ": " + shotId + ",");
    sceneSources.push({scene_id: scene.id, shot_id: shotId, source: componentFile, mode: authored ? "authored" : "fallback"});
  }

  fs.writeFileSync(path.join(dir, "index.jsx"),
    imports.join("\n") + "\n" + exports.join("\n") + "\n\n" +
    "export const SHOTS_" + id + " = {\n" + entries.join("\n") + "\n};\n");

  const notesFile = path.join(dir, "BUILD_NOTES.md");
  const machine = "- " + id + " 登记 " + scenes.length + " 镜：" +
    sceneSources.map((entry) => entry.shot_id + "(" + entry.scene_id + ":" + entry.mode + ")").join(" ");
  if (!fs.existsSync(notesFile)) {
    fs.writeFileSync(notesFile, [
      "# " + id + " 构建记录", "", "镜头数：" + scenes.length, "",
      "活动镜头明确标记为 authored 或 fallback；未认证的旧主题镜头不会被静默导入。", "",
      "## 机器登记", machine,
    ].join("\n") + "\n");
  } else {
    fs.appendFileSync(notesFile, machine + "\n");
  }
  groups.push({id, scene_ids: scenes.map((scene) => scene.id), scene_sources: sceneSources, status: "generated"});
}

const registryImports = groups.map((group) =>
  'import * as ' + group.id + ' from "./' + group.id + '/index.jsx";'
).join("\n");
const registryEntries = [];
for (const group of groups) {
  for (const sceneId of group.scene_ids) {
    const number = Number(sceneId.split("-").at(-1));
    registryEntries.push('  ' + JSON.stringify(sceneId) + ": " + group.id + ".SC" + String(number).padStart(2, "0") + ',');
  }
}
fs.writeFileSync(path.join(root, "registry.jsx"),
  registryImports + "\n\nexport const SHOT_REGISTRY = {\n" + registryEntries.join("\n") + "\n};\n");
console.log("shot materialization PASS", JSON.stringify({
  project_id: project.project_id, groups: groups.length, authored: authoredCount, fallback: fallbackCount,
}));
