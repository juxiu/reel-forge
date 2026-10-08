import fs from "node:fs";
import path from "node:path";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const root = path.join("artifacts", project.project_id, "audio");
const source = path.join(root, "timeline-source.json");
if (!fs.existsSync(source)) throw new Error("timeline source missing: " + source);
const words = JSON.parse(fs.readFileSync(source, "utf8"));
const segments = timeline.sentences.map(sentence => {
  const sentenceWords = words.filter(word => Number(word.start) >= (sentence.from - 1) / timeline.fps && Number(word.end) <= sentence.to / timeline.fps + 0.1);
  return {
    id: sentence.id,
    text: sentence.text,
    start: (sentence.from - 1) / timeline.fps,
    end: sentence.to / timeline.fps,
    words: sentenceWords,
  };
});
const asr = {
  version: "0.1",
  provider: "tts-alignment-proxy",
  required_real_asr: process.env.ASR_REQUIRED === "1",
  source: "timeline-source.json",
  thresholds: {text_similarity: 0.92},
  segments,
};
fs.writeFileSync(path.join(root, "asr-second-pass.json"), JSON.stringify(asr, null, 2));
console.log("ASR SECOND PASS", JSON.stringify({provider: asr.provider, segments: segments.length}));
