import fs from "node:fs";
import {lintWordBoundaryTimeline} from "../src/visual/word-boundary.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const file = "artifacts/" + project.project_id + "/audio/timeline-source.json";

if (!fs.existsSync(file) || !fs.statSync(file).size) {
  throw new Error("word boundary source missing: " + file);
}

const words = JSON.parse(fs.readFileSync(file, "utf8"));
const issues = lintWordBoundaryTimeline(timeline, words, {maxDriftFrames: 2});

if (issues.length) {
  console.error("word boundary verification FAIL");
  issues.forEach((issue) => console.error("- " + issue));
  process.exit(1);
}

console.log("word boundary verification PASS", JSON.stringify({
  engine: timeline.engine,
  timing_mode: timeline.timing_mode,
  words: words.length,
  sentences: timeline.sentences.length,
}));