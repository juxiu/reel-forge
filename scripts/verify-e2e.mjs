import fs from "node:fs";

// verify:e2e 是"跑完一次生产之后"的端到端契约校验，不是 CI 快速校验。
// 它依赖运行产物（TTS 时间轴 / 配音 / 调研），这些不入库，因此缺文件时给出可执行的提示。
const REMIND = "\n提示：先执行 npm run tts（生成 public/audio.mp3 与 script/timeline.json），再执行 npm run run-production。";
function need(file, hint) {
  if (!fs.existsSync(file) || !fs.statSync(file).size) {
    throw new Error("缺少运行产物：" + file + (hint ? "（应由 " + hint + " 生成）" : "") + REMIND);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const script = need("fixtures/script.json", "npm run run-production");
const timeline = need("script/timeline.json", "npm run tts");
const captions = need("fixtures/captions.json", "npm run tts");
const wide = need("fixtures/render-ir-16x9.json", "npm run materialize-ir");
const tall = need("fixtures/render-ir-9x16.json", "npm run materialize-ir");
const research = need("artifacts/" + project.project_id + "/research.json", "npm run run-production");

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
