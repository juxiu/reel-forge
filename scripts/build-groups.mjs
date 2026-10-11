import fs from "node:fs";
import path from "node:path";
import {buildScenes} from "../src/build/parallel-scenes.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {runNamedAgent} from "../src/agents/orchestrator.mjs";
import {maxShotsPerGroup} from "../src/build/limits.mjs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const maxPerGroup = maxShotsPerGroup();
const concurrency = Number(process.env.BUILD_CONCURRENCY || 4);
const agent = createAgentProvider();
const strict = process.env.AGENT_STRICT === "1";
const videoShotcraftDir = String(process.env.VIDEO_SHOTCRAFT_DIR || "").trim()
  ? path.resolve(process.env.VIDEO_SHOTCRAFT_DIR)
  : null;
const groups = [];
for (let i = 0; i < ir.scenes.length; i += maxPerGroup) {
  groups.push({id: "G" + String(groups.length + 1), scenes: ir.scenes.slice(i, i + maxPerGroup)});
}

const built = await buildScenes(groups, async (group) => {
  const deterministic = {
    id: group.id,
    scene_ids: group.scenes.map((scene) => scene.id),
    source: group.scenes.map((scene) => ({
      scene_id: scene.id,
      from: Math.round(scene.start * ir.fps),
      to: Math.round((scene.start + scene.duration) * ir.fps),
      variant: scene.variant || "generic",
    })),
  };
  const agentReview = await runNamedAgent(agent, "build-agent", {
    project,
    group: {id: group.id, scene_ids: deterministic.scene_ids},
    videoShotcraftDir,
    constraints: {
      only_paths: ["src/shots/" + group.id + "/**"],
      six_stills_per_shot: true,
      test_render_frames: 30,
      semantic_renderer_required: true,
      settle_frames_min: 30,
      project_marker_required: "// @reel-forge-project: " + project.project_id,
    },
    shots: deterministic.source,
  }, {strict});
  const status = agentReview.status === "completed" ? "built"
    : agentReview.status === "skipped" ? "review-required" : "failed";
  return {...deterministic, status, agent: agentReview};
}, {concurrency});

const overallStatus = built.every((group) => group.status === "built") ? "built"
  : built.some((group) => group.status === "failed") ? "failed" : "review-required";
const outDir = path.join("artifacts", ir.project_id, "build-groups");
fs.mkdirSync(outDir, {recursive: true});
for (const group of built) fs.writeFileSync(path.join(outDir, group.id + ".json"), JSON.stringify(group, null, 2));
const summary = {
  project_id: ir.project_id,
  concurrency,
  agent_mode: agent ? "external-agent" : "deterministic",
  status: overallStatus,
  groups: built.map((group) => ({id: group.id, scene_ids: group.scene_ids, status: group.status, agent_status: group.agent.status})),
};
fs.writeFileSync("fixtures/build-groups.json", JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({
  ...summary,
  groups: built.map((group) => group.id),
}, null, 2));
console.log("build groups " + overallStatus.toUpperCase(), JSON.stringify({
  groups: built.length,
  built: built.filter((group) => group.status === "built").length,
  review_required: built.filter((group) => group.status === "review-required").length,
  failed: built.filter((group) => group.status === "failed").length,
  agent: agent ? "external" : "deterministic",
}));
if (overallStatus === "failed") process.exitCode = 1;
