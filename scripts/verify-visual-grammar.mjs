import fs from "node:fs";
import {buildBeatGraph} from "../src/director/beat-graph.mjs";
import {lintVisualGrammar, shotUnitSeconds} from "../src/visual/grammar.mjs";

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

// 反例自检：口径对齐镜头区间后，门必须仍能抓真短句。
// 1.0 s 语音 + 30 帧留白 = 2.0 s 独占一镜 → 必须报 too-short；3.5 s 语音 + 1.2 s 留白 → 必须放行。
const probe = (start, duration) => ({
  id: "probe", start, duration,
  hero: {type: "concept", size: "large"},
  camera: {type: "pan", amount: 0.04},
  state_change: "enter -> transform -> settle",
  asset_need: "diagram-or-code", settle_frames: 30,
  composition: {focus: "hero-plus-flow", hero_weight: 0.68},
  light: {mode: "hero-key", key_intensity: 0.8, accent: "purple"},
});
const catchesShort = lintVisualGrammar([probe(0, 1.0), probe(2.0, 6.0)]).some((i) => i.includes("too-short-for-shot-unit"));
const passesOk = lintVisualGrammar([probe(0, 3.5), probe(4.7, 6.0)]).some((i) => i.includes("too-short-for-shot-unit"));
if (!catchesShort) issues.push("self-check:too-short-gate-is-vacuous（1 秒独占一镜没被抓）");
if (passesOk) issues.push("self-check:too-short-gate-is-miscalibrated（3.5 秒语音的合格镜头被误判）");

if (issues.length) {
  console.error("visual grammar FAIL");
  for (const issue of issues) console.error("- " + issue);
  process.exit(1);
}

console.log("visual grammar PASS", JSON.stringify({
  beats: graph.beats.length,
  min_shot_unit: Math.round(Math.min(...shotUnitSeconds(graph.beats)) * 100) / 100,
  min_speech_seconds: Math.round(Math.min(...graph.beats.map((beat) => beat.duration)) * 100) / 100,
}));
