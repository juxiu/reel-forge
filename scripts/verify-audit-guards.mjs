import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function requireText(condition, message) {
  if (!condition) throw new Error("audit guard missing: " + message);
}

const packageJson = read("package.json");
const fast = read("scripts/verify-fast.mjs");
const materializer = read("scripts/materialize-shots.mjs");
const buildGroups = read("scripts/build-groups.mjs");
const sourceIdentity = read("src/shots/source-identity.mjs");
const taskBrief = read("src/agents/task-brief.mjs");
const fingerprint = read("src/release/fingerprint.mjs");
const skill = read("scripts/skill.mjs");
const shotSourceGate = read("scripts/verify-shot-source.mjs");

requireText(materializer.includes("checkShotSourceIdentity") && materializer.includes("sourceIdentityForScene") && materializer.includes("identity mismatch"),
  "shot materialization must fail closed on project/script/IR or source identity mismatch");
requireText(buildGroups.includes("checkShotSourceIdentity") && buildGroups.includes("sourceIdentityForScene") && buildGroups.includes("BUILD BLOCKED"),
  "build groups must validate every authored source against the exact active script");
requireText(sourceIdentity.includes("script_sha256") && sourceIdentity.includes("project_id") && sourceIdentity.includes("script_id"),
  "shot source identity must bind project, script segment, and content digest");
requireText(taskBrief.includes("input.shots[].source_identity") && taskBrief.includes("reel-forge-source"),
  "Build Agent task must preserve the canonical source identity marker");
requireText(packageJson.includes('"verify:shot-source"') && fast.includes('"verify:shot-source"'),
  "the source identity negative tests must stay enabled in fast verification");
requireText(fingerprint.includes("fixtures/project.json") && fingerprint.includes("fixtures/script.json") &&
  fingerprint.includes("script/timeline.json") && fingerprint.includes("public/audio.wav"),
  "release freshness must include project, script, timeline, and audio inputs");
requireText(fingerprint.includes("src/shots") && fingerprint.includes("src/remotion") && fingerprint.includes("src/visual"),
  "release fingerprint must cover all active visual code");
requireText(skill.includes("inputFingerprint") && skill.includes('createHash("sha256")'),
  "topic runs must use a collision-resistant input-specific project ID");
requireText(shotSourceGate.includes("shot source is stale or belongs to another narration") && shotSourceGate.includes("negative_cases:3"),
  "shot source gate must retain negative checks for stale, foreign, and missing markers");
requireText(buildGroups.includes('source_status:"bound-to-script"') && buildGroups.includes('status:changed?"updated":"reused"'),
  "agent invocation or skipped status must not be mislabeled as a successful build");

console.log("audit guards PASS", JSON.stringify({
  guards: 10,
  scope: "source-level safety contracts; not a visual-render acceptance test",
}));
