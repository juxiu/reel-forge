import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const root = path.join("artifacts", project.project_id, "audio");
const source = path.join(root, "timeline-source.json");
if (!fs.existsSync(source)) throw new Error("timeline source missing: " + source);
const words = JSON.parse(fs.readFileSync(source, "utf8"));

function proxySegments() {
  return timeline.sentences.map(sentence => {
    const sentenceWords = words.filter(word => Number(word.start) >= (sentence.from - 1) / timeline.fps && Number(word.end) <= sentence.to / timeline.fps + 0.1);
    return {id: sentence.id, text: sentence.text, start:(sentence.from - 1)/timeline.fps, end:sentence.to/timeline.fps, words:sentenceWords};
  });
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
const provider = requiredReal ? (process.env.ASR_PROVIDER || "command") : "tts-alignment-proxy";
const segments = requiredReal ? realAsrSegments() : proxySegments();
const asr = {
  version:"0.2",
  provider,
  required_real_asr:requiredReal,
  source:requiredReal ? "external-asr-provider" : "timeline-source.json",
  thresholds:{text_similarity:0.92},
  segments,
};
fs.writeFileSync(path.join(root,"asr-second-pass.json"),JSON.stringify(asr,null,2));
console.log("ASR SECOND PASS",JSON.stringify({provider:asr.provider,segments:segments.length}));
