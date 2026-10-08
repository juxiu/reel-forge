import fs from "node:fs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const script = JSON.parse(fs.readFileSync("fixtures/script.json", "utf8"));
const timeline = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const captions = JSON.parse(fs.readFileSync("fixtures/captions.json", "utf8"));
const wide = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const tall = JSON.parse(fs.readFileSync("fixtures/render-ir-9x16.json", "utf8"));
const research = JSON.parse(fs.readFileSync("artifacts/" + project.project_id + "/research.json", "utf8"));

if (script.project_id !== project.project_id) throw new Error("script project mismatch");
if (!timeline.sentences.length || timeline.total_frames < 1) throw new Error("timeline missing");
if (!fs.existsSync("script/timeline-source.json") || !fs.statSync("script/timeline-source.json").size) throw new Error("timeline source missing");
if (!Array.isArray(captions) || !captions.length) throw new Error("captions missing");
if (!fs.existsSync("public/audio.mp3") || !fs.statSync("public/audio.mp3").size) throw new Error("final audio missing");
if (wide.width !== 1280 || wide.height !== 720 || tall.width !== 720 || tall.height !== 1280) throw new Error("multi-ratio IR invalid");
if (wide.scenes.length !== script.segments.length || tall.scenes.length !== script.segments.length) throw new Error("scene/script coverage mismatch");

const claimIds = new Set(research.claims.map((claim) => claim.id));
for (const segment of script.segments) {
  for (const claimId of segment.claim_ids || []) {
    if (!claimIds.has(claimId)) throw new Error("segment claim missing evidence: " + claimId);
  }
}

let previousEnd = 0;
for (const scene of wide.scenes) {
  if (!(scene.duration > 0)) throw new Error("invalid scene duration: " + scene.id);
  const start = Math.round(scene.start * wide.fps);
  const end = Math.round((scene.start + scene.duration) * wide.fps);
  if (start < previousEnd) throw new Error("scene overlap: " + scene.id);
  previousEnd = end;
}
for (const sentence of timeline.sentences) {
  if (!(sentence.to >= sentence.from)) throw new Error("invalid sentence timing: " + sentence.id);
  if (!sentence.subs?.length) throw new Error("sentence has no subtitle timing: " + sentence.id);
  for (const sub of sentence.subs) if (!(sub.to >= sub.from)) throw new Error("invalid subtitle timing: " + sentence.id);
}

if (Math.abs(wide.duration - timeline.total_frames / 30) > 0.1) throw new Error("wide IR duration mismatch");
if (Math.abs(tall.duration - timeline.total_frames / 30) > 0.1) throw new Error("tall IR duration mismatch");

console.log("e2e contract PASS", {
  frames: timeline.total_frames,
  sentences: timeline.sentences.length,
  captions: captions.length,
  scenes: wide.scenes.length,
  claims: research.claims.length,
});
