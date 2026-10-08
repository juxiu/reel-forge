import fs from "node:fs";

const blueprint = JSON.parse(fs.readFileSync("fixtures/reference-shot-blueprint.json", "utf8"));
const shots = blueprint.shots || [];
if (blueprint.shot_count !== 44 || shots.length !== 44) throw new Error("authored shot blueprint must contain 44 shots");
if (blueprint.group_count !== 8) throw new Error("authored shot blueprint must contain 8 groups");

const groups = new Map();
for (const shot of shots) {
  const list = groups.get(shot.group) || [];
  list.push(shot);
  groups.set(shot.group, list);

  const file = "src/shots/" + shot.group + "/" + shot.shot_id + ".jsx";
  if (!fs.existsSync(file)) throw new Error("authored shot source missing: " + file);
  const source = fs.readFileSync(file, "utf8");

  for (const required of [
    'import {ExplainerShot} from "../Shot.jsx";',
    "export const SHOT_RECIPE",
    'shot_id:"' + shot.shot_id + '"',
    'variant:"' + shot.variant + '"',
    "hero_size:" + shot.hero_size,
    'camera:"' + shot.camera + '"',
    "settle_frames:30",
    "export function " + shot.shot_id
  ]) {
    if (!source.includes(required)) throw new Error(shot.shot_id + " authored recipe mismatch: " + required);
  }
  if (source.includes("SemanticShot")) throw new Error(shot.shot_id + " still references SemanticShot");
}

for (let i = 1; i <= 7; i++) {
  const count = (groups.get("G" + i) || []).length;
  if (count !== 6) throw new Error("G" + i + " must contain 6 shots");
}
if ((groups.get("G8") || []).length !== 2) throw new Error("G8 must contain 2 shots for the 44-shot blueprint");

console.log("authored shots PASS", shots.length, "shots /", groups.size, "groups");
