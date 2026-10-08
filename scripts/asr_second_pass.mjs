import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {deriveWordBoundarySegments} from "../src/visual/word-boundary.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const root = path.join("artifacts", project.project_id, "audio");
const source = path.join(root, "timeline-source.json");
if (!fs.existsSync(source)) throw new Error("timeline source missing: " + source);
const words = JSON.parse(fs.readFileSync(source, "utf8"));

function referenceAlignedSegments() {
  return deriveWordBoundarySegments(timeline, words);
}

function realAsrSegments() {
  const command = process.env.ASR_COMMAND;
  if (!command) throw new Error("ASR_REQUIRED=1 requires ASR_COMMAND");
  const input = path.resolve("artifacts/" + project.project_id + "/audio/final.wav");
  const output = path.resolve(root + "/asr-provider-output.json");
  const result = spawnSync(command, [input, output], {stdio:"inherit", shell:true, encoding:"utf8"});
  if (result.status !== 0) throw new Error("ASR_COMMAND failed: " + result.status);
  if (!fs.existsSync(output)) throw new Error("ASR_COMMAND did not produce " + output);
  const parsed = JSON.parse(fs.readFileSync(output, "utf8"));
  if (!Array.isArray(parsed.segments)) throw new Error("ASR provider output requires segments[]");
  return parsed.segments;
}

const requiredReal = process.env.ASR_REQUIRED === "1";
const provider = requiredReal ? (process.env.ASR_PROVIDER || "command") : "tts-word-boundary";
const segments = requiredReal ? realAsrSegments() : referenceAlignedSegments();
const asr = {
  version:"0.3",
  provider,
  required_real_asr:requiredReal,
  source:requiredReal ? "external-asr-provider" : "tts-word-boundary",
  alignment_mode:requiredReal ? "external-asr" : "tts-word-boundary",
  word_boundary_source:"edge-tts",
  thresholds:{text_similarity:0.92, word_boundary_drift_frames:2},
  segments,
};
fs.writeFileSync(path.join(root,"asr-second-pass.json"),JSON.stringify(asr,null,2));
console.log("ASR SECOND PASS",JSON.stringify({provider:asr.provider,mode:asr.alignment_mode,segments:segments.length}));