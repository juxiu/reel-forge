import {Execution} from "../core/runtime.mjs";
import {fetchSource} from "../providers/research/web.mjs";
import {buildClaimGraph} from "../research/claim-graph.mjs";
import {buildBeatGraph, beatToScene} from "./beat-graph.mjs";
import {toRenderIR} from "../backends/render-ir.mjs";

export async function runProduction(project, {script, agent = null, root = "artifacts"} = {}) {
  const ex = new Execution(project, root);
  ex.emit("production.started", {project_id: project.project_id});

  try {
    if (!(project.source_urls || []).length) {
      throw new Error("source_urls required");
    }

    ex.emit("research.started", {sources: project.source_urls.length});
    const sources = [];
    for (const url of project.source_urls) {
      sources.push(await fetchSource(url));
    }
    const research = buildClaimGraph(project, sources);
    if (!research.claims.length) {
      throw new Error("research produced no claims");
    }
    ex.emit("research.completed", {
      claims: research.claims.length,
      sources: research.sources.length,
    });

    if (!script) {
      if (!agent) {
        throw new Error("script missing and no agent provider configured");
      }
      ex.emit("script.started");
      script = await agent.run({project, research});
      ex.emit("script.completed", {segments: script.segments?.length || 0});
    }

    if (script.project_id !== project.project_id) {
      throw new Error("script project_id mismatch");
    }
    if (!Array.isArray(script.segments) || !script.segments.length) {
      throw new Error("script requires at least one segment");
    }

    const claimIds = new Set(research.claims.map((claim) => claim.id));
    for (const segment of script.segments) {
      for (const claimId of segment.claim_ids || []) {
        if (!claimIds.has(claimId)) {
          throw new Error("script claim has no research evidence: " + claimId);
        }
      }
    }

    const graph = buildBeatGraph(script);
    ex.emit("director.completed", {beats: graph.beats.length});

    const scenes = script.segments.map((segment, index) => beatToScene(graph.beats[index], segment));
    const renderIR = toRenderIR(project, scenes, {
      width: 1280,
      height: 720,
      fps: 30,
    });
    ex.emit("render-ir.completed", {scenes: renderIR.scenes.length});
    ex.complete();

    return {execution: ex, research, script, beats: graph, scenes, renderIR};
  } catch (error) {
    ex.fail(error);
    throw error;
  }
}
