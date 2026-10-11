import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function requireText(condition, message) {
  if (!condition) throw new Error("audit guard missing: " + message);
}
const materializer = read("scripts/materialize-shots.mjs");
const verifyShots = read("scripts/verify-shots.mjs");
const fingerprint = read("src/release/fingerprint.mjs");
const skill = read("scripts/skill.mjs");
const buildGroups = read("scripts/build-groups.mjs");
const taskBrief = read("src/agents/task-brief.mjs");
const orchestrator = read("src/agents/orchestrator.mjs");
const manifest = JSON.parse(read("src/shots/AUTHORED_PROJECT.json"));

requireText(/project identity mismatch/.test(materializer), "project and render IR identity mismatch must fail closed");
requireText(/active shot import missing/.test(verifyShots) && /fallback-SCxx/.test(verifyShots), "shot verification must validate the component selected by the group index");
requireText(/AUTHORED_PROJECT\.json/.test(materializer), "authored shot pack must declare its topic identity");
requireText(/authoredPackMatches/.test(materializer) && /source_urls/.test(materializer), "authored pack reuse must be bound to topic and sources");
requireText(/@reel-forge-project/.test(materializer) && /fallback-/.test(materializer), "unmatched authored shots must route through isolated fallback components");
requireText(/fixtures\/project\.json/.test(fingerprint) && /fixtures\/script\.json/.test(fingerprint) && /research\.json/.test(fingerprint), "release fingerprint must cover project, script, and research inputs");
requireText(/createHash\("sha256"\)/.test(skill) && /hasNonAscii/.test(skill), "non-ASCII topic slugs must receive collision-resistant identity");
requireText(/agentReview\.status === "skipped"/.test(buildGroups) && /review-required/.test(buildGroups), "skipped agent work must not be marked built");
requireText(/projectIdentityRule/.test(taskBrief) && /@reel-forge-project/.test(taskBrief), "build-agent task must stamp the project identity");
requireText(/projectId: input\.project\?\.project_id/.test(orchestrator), "active project identity must reach the task brief");
requireText(Boolean(manifest.project_id && manifest.request && Array.isArray(manifest.source_urls)), "authored pack must declare its identity");

console.log("audit guards PASS", JSON.stringify({
  authored_pack: manifest.project_id,
  guards: 11,
  test_scope: "source-level contracts only; not a render or pixel acceptance test",
}));
