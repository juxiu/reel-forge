import fs from "node:fs";
import {buildBeatGraph} from "../src/director/beat-graph.mjs";
import {lintVisualGrammar} from "../src/visual/grammar.mjs";

const script = JSON.parse(fs.readFileSync("fixtures/script.json", "utf8"));
const timeline = fs.existsSync("script/timeline.json")
  ? JSON.parse(fs.readFileSync("script/timeline.json", "utf8"))
  : null;
const graph = buildBeatGraph(script, timeline);
const issues = lintVisualGrammar(graph.beats);
const genericCount = graph.beats.filter((beat) => beat.visual_variant === "generic").length;
if (graph.beats.length >= 4 && genericCount / graph.beats.length > 0.75) {
  issues.push("semantic-variant-coverage-too-low");
}

if (issues.length) {
  console.error("visual grammar FAIL");
  for (const issue of issues) console.error("- " + issue);
  process.exit(1);
}

console.log("visual grammar PASS", JSON.stringify({
  beats: graph.beats.length,
  min_duration: Math.min(...graph.beats.map((beat) => beat.duration)),
}));
