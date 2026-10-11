import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const project = JSON.parse(read("fixtures/project.json"));
const remotion = read("src/remotion/index.jsx");
const render = read("scripts/render.sh");
const materialize = read("scripts/materialize-ir.mjs");
const qc = read("scripts/qc.mjs");
const repair = read("scripts/repair-cycle.mjs");
const delivery = read("scripts/deliver.mjs");
const verifyDelivery = read("scripts/verify-delivery.mjs");
const verifyProduction = read("scripts/verify-production.mjs");
const skill = read("scripts/skill.mjs");
const debugShot = read("scripts/debug-shot.mjs");
const fingerprint = read("src/release/fingerprint.mjs");

assert.deepEqual(project.target_ratios, ["16:9"], "project target_ratios must contain only 16:9");
assert.match(remotion, /id="ReelForge16x9"/, "16:9 composition must remain registered");
assert.doesNotMatch(remotion, /ReelForge9x16|fixtureTall|render-ir-9x16\.json/, "portrait composition/import must not be active");
assert.equal((render.match(/npx remotion render/g) || []).length, 1, "render.sh must invoke only one production composition");
assert.match(render, /ReelForge16x9 artifacts\/render\/reel-forge-16x9\.mp4/);
assert.doesNotMatch(render, /ReelForge9x16|reel-forge-9x16\.mp4|extract artifacts\/render\/reel-forge-9x16/, "render.sh must not render or extract portrait video");
assert.match(render, /COUNT_16/);
assert.doesNotMatch(render, /COUNT_9/, "render.sh must not require portrait frame output");
assert.match(debugShot, /const RATIOS = \["16x9"\]/, "single-shot renderer must allow only 16:9");
assert.match(debugShot, /9:16 渲染暂时停用/, "single-shot renderer must explain the disabled ratio");

// Keep the portrait IR file available as a dormant reference, but stop regenerating it in production.
const activeMaterializeCode = materialize.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
assert.match(activeMaterializeCode, /fixtures\/render-ir-16x9\.json/);
assert.doesNotMatch(activeMaterializeCode, /width:720,height:1280|\["9x16",720,1280\]|render-ir-"\+name/, "materializer must not generate 9:16 production IR");

for (const [name, source] of [["qc", qc], ["repair-cycle", repair], ["deliver", delivery], ["verify-delivery", verifyDelivery], ["verify-production", verifyProduction]]) {
  assert.doesNotMatch(source, /for\s*\(\s*const ratio of \[\s*["']16x9["']\s*,\s*["']9x16["']\s*\]\s*\)/, name + " must not iterate portrait as an active ratio");
}
assert.doesNotMatch(delivery, /reel-forge-9x16\.mp4|frame_metrics_9x16|motion_9x16|visual_regression_9x16/, "delivery must not require portrait artifacts");
assert.match(skill, /values\("--ratio"\)\[0\]\|\|"16:9"/, "skill default should be 16:9");
assert.match(skill, /ratios\.length!==1\|\|ratios\[0\]!=="16:9"/, "skill must reject a portrait or multi-ratio request");
assert.doesNotMatch(fingerprint, /for\s*\(const f of \["fixtures\/render-ir-16x9\.json",\s*"fixtures\/render-ir-9x16\.json"\]\)/, "release fingerprint must not track inactive portrait IR");

const workflows = path.join(".github", "workflows");
const workflowFiles = fs.existsSync(workflows)
  ? fs.readdirSync(workflows).filter((file) => /\.(yml|yaml)$/i.test(file))
  : [];
assert.deepEqual(workflowFiles, [], "GitHub Actions workflow YAML files should remain absent in this temporary CI-disabled branch");

console.log("render mode PASS", JSON.stringify({
  activeRatios: project.target_ratios,
  registeredProductionCompositions: ["ReelForge16x9"],
  portrait: "disabled",
  githubActionsWorkflows: workflowFiles.length,
}));
