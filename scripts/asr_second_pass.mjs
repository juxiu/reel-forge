import fs from "node:fs";
import path from "node:path";
import {deriveWordBoundarySegments} from "../src/visual/word-boundary.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const root = path.join("artifacts", project.project_id, "audio");
const source = path.join(root, "timeline-source.json");
if (!fs.existsSync(source)) throw new Error("timeline source missing: " + source);
const words = JSON.parse(fs.readFileSync(source, "utf8"));

const segments = deriveWordBoundarySegments(timeline, words);
const asr = {
  version:"0.4",
  provider:"tts-word-boundary",
  required_real_asr:false,
  source:"tts-word-boundary",
  alignment_mode:"tts-word-boundary",
  word_boundary_source:"edge-tts",
  thresholds:{text_similarity:0.92, word_boundary_drift_frames:2},
  segments,
};
fs.writeFileSync(path.join(root,"asr-second-pass.json"),JSON.stringify(asr,null,2));
console.log("ASR SECOND PASS",JSON.stringify({provider:asr.provider,mode:asr.alignment_mode,segments:segments.length}));
