import fs from "node:fs";
import path from "node:path";

/**
 * 解说词 → `fixtures/script.json`（一段 = 一个 segment = 一个镜头）。
 *
 * ⚠ 为什么需要这一步（单真源事故的另一半）：
 *   `buildBeatGraph(script, timeline)` 按 `script.segments[i]` 与 `timeline.sentences[i]`
 *   **一一对应**取时间。所以只要 segments 是 4 段而解说词有 44 段，IR 就只会出 4 个镜头 ——
 *   于是 IR 只能由别的脚本另写，而那份脚本用的是人造帧率，与真实 TTS 无关。
 *   结果就是：IR 7657 帧、真实配音 13235 帧，**成片比配音短 186 秒**。
 *
 *   参考项目（anything2explainer）没有这一层：`tts_build.py` 直接从 `narration.txt`
 *   产出时间轴，镜头按句 id 查表，中间**不存在**第二份需要对齐的 segment 列表。
 *   这里保留 script.json（契约要求 `segments`），但把它降级成**派生产物**而不是手工维护的输入。
 */

const NARRATION = process.env.NARRATION_FILE || "script/narration.txt";
const OUT = process.env.SCRIPT_FILE || "fixtures/script.json";

const text = fs.readFileSync(NARRATION, "utf8");
const blocks = text.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);

const segments = [];
let chapter = 0;
let chapterTitle = "";
for (const block of blocks) {
  const heading = /^#\s*CHAPTER\s+(\d+)\s*(.*)$/.exec(block);
  if (heading) {
    chapter = Number(heading[1]);
    chapterTitle = heading[2].trim();
    continue;
  }
  // 段内以 | 切开的字幕块保留在subtitles 里，供 tts_build 复用同一套切分
  const subtitles = block.split("|").map((s) => s.trim()).filter(Boolean);
  segments.push({
    id: "seg-" + String(segments.length + 1).padStart(3, "0"),
    chapter,
    chapter_title: chapterTitle,
    text: subtitles.join(language_sep()),
    subtitles,
    // 段末 = 镜头末（a2e 规则：一段一个镜头）
    paragraph_end: true,
  });
}

function language_sep() {
  const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
  return (project.language || "zh") === "en" ? " " : ",";
}

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const out = {project_id: project.project_id, segments};
fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

// 时间轴在位时，顺手把字幕块也按**同一份数据**重写 —— captions 不再是独立维护的 fixture。
const TL = "script/timeline.json";
let captionsNote = "timeline.json 不在，跳过 captions 重写";
if (fs.existsSync(TL)) {
  const tl = JSON.parse(fs.readFileSync(TL, "utf8"));
  const captions = [];
  let n = 0;
  for (const s of tl.sentences || []) {
    for (const sub of s.subs || []) {
      captions.push({
        id: "cap-" + String(++n).padStart(3, "0"),
        text: sub.text,
        start: +((sub.from - 1) / tl.fps).toFixed(3),
        end: +(sub.to / tl.fps).toFixed(3),
      });
    }
  }
  fs.writeFileSync("fixtures/captions.json", JSON.stringify(captions, null, 2) + "\n");
  captionsNote = `captions.json 由timeline 的 ${captions.length} 个 sub块重写`;
}

console.log("sync script PASS " + JSON.stringify({
  segments: segments.length,
  chapters: [...new Set(segments.map((s) => s.chapter))].length,
  out: OUT,
  captions: captionsNote,
}));