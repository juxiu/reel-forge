import fs from "node:fs";
import assert from "node:assert/strict";

const schema = JSON.parse(fs.readFileSync("schemas/shotbook.schema.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const fast = fs.readFileSync("scripts/verify-fast.mjs", "utf8");
const validator = fs.readFileSync("scripts/preflight/validate-director.mjs", "utf8");
const required = [
  "shotId","narrationBeat","storyPurpose","visualRelationship","visualMetaphor","heroElement",
  "layerPlan","entryState","keyAction","holdState","exitState","transitionIntent","continuityIds",
  "timing","layoutBudget","assetManifest","motionRecipe","riskLevel","validationPlan"
];
assert.deepEqual(schema.required, ["version","projectId","source","shots"]);
assert.deepEqual(schema.$defs.shot.required, required);
assert.equal(schema.$defs.shot.properties.visualRelationship.enum.length, 13);
assert.deepEqual(schema.$defs.shot.properties.riskLevel.enum, ["low","medium","high"]);
assert.equal(pkg.scripts["verify:director-preflight"], "node scripts/preflight/validate-director.mjs");
assert.equal(pkg.scripts["verify:director-preflight:static"], "node scripts/preflight/validate-director.mjs --static-only");
assert.equal(pkg.scripts["verify:director-contract"], "node scripts/verify-director-contract.mjs");
assert.match(fast, /"verify:director-contract"/);
assert.match(fast, /"verify:director-preflight:static"/);
for (const rule of ["duplicate-shot-id","registry-mapping-missing","script-segment-mapping","invalid-timing","scene-overlap","high-risk-shot-review","disabledRatios"]) {
  assert.ok(validator.includes(rule), `missing production preflight rule: ${rule}`);
}

// Negative contract cases: missing mandatory fields and unknown relation labels must be rejected.
const validateShotShape = (shot) => {
  const missing = required.filter((key) => !(key in shot));
  if (missing.length) return false;
  if (!schema.$defs.shot.properties.visualRelationship.enum.includes(shot.visualRelationship)) return false;
  if (!schema.$defs.shot.properties.riskLevel.enum.includes(shot.riskLevel)) return false;
  return true;
};
const valid = Object.fromEntries(required.map((key) => [key, {}]));
valid.visualRelationship = "flow";
valid.riskLevel = "low";
assert.equal(validateShotShape(valid), true);
const missingId = {...valid};
delete missingId.shotId;
assert.equal(validateShotShape(missingId), false);
assert.equal(validateShotShape({...valid, visualRelationship:"cinematic-vibes"}), false);
assert.equal(validateShotShape({...valid, riskLevel:"urgent"}), false);

console.log("director contract PASS: schema, production integration, required negative cases");
