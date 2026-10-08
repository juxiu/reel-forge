import fs from "node:fs";
import {lintAsrSecondPass} from "../src/visual/asr-contract.mjs";

const script = JSON.parse(fs.readFileSync("fixtures/script.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const file = "artifacts/" + project.project_id + "/audio/asr-second-pass.json";
if (!fs.existsSync(file)) throw new Error("ASR second-pass artifact missing: " + file);
const asr = JSON.parse(fs.readFileSync(file, "utf8"));
const issues = lintAsrSecondPass(script, timeline, asr);
if (issues.length) {
  console.error("ASR second pass FAIL");
  issues.forEach(issue => console.error("- " + issue));
  process.exit(1);
}
console.log("ASR second pass PASS", JSON.stringify({provider: asr.provider, segments: asr.segments.length}));
