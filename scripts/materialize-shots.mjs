import fs from "node:fs";
import path from "node:path";
import {maxShotsPerGroup} from "../src/build/limits.mjs";
import {checkShotSourceIdentity,sourceIdentityForScene} from "../src/shots/source-identity.mjs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const script = JSON.parse(fs.readFileSync("fixtures/script.json", "utf8"));
const maxPerGroup = maxShotsPerGroup();
if (ir.project_id !== project.project_id || script.project_id !== project.project_id) throw new Error("shot materialization blocked: project/script/IR identity mismatch");
for (let index=0; index<ir.scenes.length; index++) {
  const scene=ir.scenes[index],groupId="G"+String(Math.floor(index/maxPerGroup)+1),shotId="SC"+String(index+1).padStart(2,"0");
  const file=path.join("src/shots",groupId,shotId+".jsx");
  if (!fs.existsSync(file)) throw new Error("shot materialization blocked: missing authored source "+file+"; generic shells are not production shots");
  const expected=sourceIdentityForScene(project,script,scene),checked=checkShotSourceIdentity(fs.readFileSync(file,"utf8"),expected);
  if(!checked.ok) throw new Error("shot materialization blocked: stale/foreign source "+file+" ("+checked.reason+"); expected "+JSON.stringify(expected));
}
// 正整数校验原来在 :6（本地写的一份），现在由 limits.mjs 的 maxShotsPerGroup() 统一抛。

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

    if (!fs.existsSync(shotFile)) throw new Error("authored shot source disappeared during materialization: " + shotFile);
    imports.push('import {' + shotId + '} from "./' + shotId + '.jsx";');
    exports.push('export {' + shotId + '} from "./' + shotId + '.jsx";');
    entries.push('  "' + scene.id + '": ' + shotId + ',');
  }

  fs.writeFileSync(
    path.join(dir, "index.jsx"),
    imports.join("\n") + "\n" + exports.join("\n") + "\n\n" +
      "export const SHOTS_" + id + " = {\n" + entries.join("\n") + "\n};\n",
  );

  // BUILD_NOTES 是人 / build-agent 的构建记录：任务书要求往里写 motion_check 数字、主角尺寸、是否高光、
  // 运镜次数（src/agents/task-brief.mjs 的 build-agent 规则）。旧写法每次 materialize 都**整篇重写**，
  // 把那些记录抹掉；而它在全仓零读者（grep 确认），抹掉也没有任何东西变红 —— 见 agent-protocol §3.2 与 §8 第 5 条。
  // 现在的口径：不存在才建，已存在只**追加**机器这一段。追加不毁内容，也不假装它是人写的。
  // ⚠ 这一段仍然没有门守（BUILD_NOTES 零读者本身就是记录过的事实）；改这里请同步那两节。
  const notesFile = path.join(dir, "BUILD_NOTES.md");
  const machine = "- " + id + " 由 scripts/materialize-shots.mjs 登记 " + scenes.length + " 镜："
    + scenes.map((scene, n) => "SC" + String(i + n + 1).padStart(2, "0") + "(" + scene.id + ")").join(" ");
  if (!fs.existsSync(notesFile)) fs.writeFileSync(notesFile, [
    "# " + id + " 构建记录", "",
    "镜头数：" + scenes.length, "",
    "每个镜头独立组件，共用 ExplainerShot 图元；已有 authored scene 不会被覆盖（BUILD_NOTES 自身除外：它只追加）。", "",
    "## 机器登记", machine,
  ].join("\n") + "\n");
  else fs.appendFileSync(notesFile, machine + "\n");

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
