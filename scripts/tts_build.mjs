import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {edgeTts} from "../src/providers/tts/edge.mjs";
import {captionsFromWords} from "../src/captions/pipeline.mjs";

const FPS = 30;
const LEAD_FRAMES = Number(process.env.LEAD_FRAMES || 45);
const SENTENCE_GAP_FRAMES = Number(process.env.SENTENCE_GAP_FRAMES || 10);
const PARAGRAPH_GAP_FRAMES = Number(process.env.PARAGRAPH_GAP_FRAMES || 30);
const CHAPTER_GAP_FRAMES = Number(process.env.CHAPTER_GAP_FRAMES || 45);
const TAIL_FRAMES = Number(process.env.TAIL_FRAMES || 60);

function parseNarration(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let chapter = 1;
  let title = "";
  let pendingGap = 0;
  let paragraphBreak = false;
  let hasSpeech = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      if (hasSpeech && items.at(-1)?.type === "sentence") {
        items.at(-1).paragraphEnd = true;
        paragraphBreak = true;
      }
      continue;
    }

    const chapterMatch = line.match(/^# CHAPTER\s+(\d+)\s+(.+)$/i);
    if (chapterMatch) {
      chapter = Number(chapterMatch[1]);
      title = chapterMatch[2].trim();
      items.push({type: "chapter", chapter, title});
      paragraphBreak = false;
      continue;
    }

    const gapMatch = line.match(/^## gap\s+(\d+)$/i);
    if (gapMatch) {
      pendingGap += Number(gapMatch[1]);
      continue;
    }

    if (line.startsWith("#")) continue;

    const gapBefore = hasSpeech
      ? pendingGap + (paragraphBreak ? PARAGRAPH_GAP_FRAMES : SENTENCE_GAP_FRAMES)
      : 0;

    items.push({
      type: "sentence",
      chapter,
      text: line,
      gapBefore,
      paragraphEnd: false,
      chapterTitle: title,
    });
    pendingGap = 0;
    paragraphBreak = false;
    hasSpeech = true;
  }

  if (items.some((item) => item.type === "sentence")) {
    items.filter((item) => item.type === "sentence").at(-1).paragraphEnd = true;
  }

  return items;
}

function alignedChunks(text, chunks, words, duration) {
  const charTiming = new Array(text.length).fill(null);
  let cursor = 0;

  for (const word of words) {
    const raw = String(word.text ?? "");
    const clean = raw.replace(/[\s，。、！？：；“”（）,.!?:;()\\-—…]/g, "");
    if (!clean) continue;

    let pos = text.indexOf(clean, cursor);
    if (pos < 0) pos = text.indexOf(clean[0], cursor);
    if (pos < 0) continue;

    for (let i = pos; i < Math.min(text.length, pos + clean.length); i++) {
      charTiming[i] = {start: Number(word.start), end: Number(word.end)};
    }
    cursor = pos + clean.length;
  }

  const result = [];
  let searchCursor = 0;
  for (const chunk of chunks) {
    const startOffset = Math.max(0, text.indexOf(chunk, searchCursor));
    const actualStart = startOffset < 0 ? searchCursor : startOffset;
    const endOffset = actualStart + chunk.length;
    searchCursor = endOffset;

    let start = null;
    let end = null;
    for (let i = actualStart; i < Math.min(text.length, endOffset); i++) {
      if (charTiming[i]) {
        start ??= charTiming[i].start;
        end = charTiming[i].end;
      }
    }

    if (start == null || end == null) {
      const ratioStart = actualStart / Math.max(1, text.length);
      const ratioEnd = endOffset / Math.max(1, text.length);
      start = ratioStart * duration;
      end = ratioEnd * duration;
    }

    result.push({start: Math.max(0, start), end: Math.max(start, end)});
  }

  return result;
}

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, {encoding: "utf8"});
  if (result.status !== 0) {
    throw new Error("ffmpeg failed: " + (result.stderr || "").slice(-1000));
  }
}

function mixAudio(parts, totalSeconds, outFile) {
  if (!parts.length) throw new Error("no audio parts");
  const args = ["-y"];
  for (const part of parts) args.push("-i", part.file);

  const inputs = parts.map((part, index) => {
    const delay = Math.max(0, Math.round(part.start * 1000));
    return `[${index}:a]adelay=${delay}|${delay}[a${index}]`;
  });
  const labels = parts.map((_, index) => `[a${index}]`).join("");
  const filter = [
    ...inputs,
    `${labels}amix=inputs=${parts.length}:duration=longest:normalize=0,apad,atrim=0:${totalSeconds},alimiter=limit=0.89[out]`,
  ].join(";");

  runFfmpeg([
    ...args,
    "-filter_complex", filter,
    "-map", "[out]",
    "-ar", "48000",
    "-ac", "2",
    "-c:a", "libmp3lame",
    "-b:a", "192k",
    outFile,
  ]);
}

const narrationFile = process.argv[2] || "script/narration.txt";
const items = parseNarration(fs.readFileSync(narrationFile, "utf8"));
const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const language = project.language || "zh";
const voice = process.env.TTS_VOICE || (language === "zh" ? "zh-CN-YunxiNeural" : "en-US-JennyNeural");
const root = path.join("artifacts", project.project_id, "audio");
fs.mkdirSync(root, {recursive: true});

let cursorSeconds = LEAD_FRAMES / FPS;
let sentenceIndex = 0;
let activeChapter = 0;
let speechSeconds = 0;
const sentences = [];
const audioParts = [];
const allWords = [];

for (const item of items) {
  if (item.type === "chapter") {
    activeChapter = item.chapter;
    if (sentenceIndex > 0) cursorSeconds += CHAPTER_GAP_FRAMES / FPS;
    continue;
  }

  cursorSeconds += item.gapBefore / FPS;
  const chunks = item.text.split("|").map((value) => value.trim()).filter(Boolean);
  const cleanText = chunks.join(language === "en" ? " " : "");
  const chapterDir = path.join(root, `sentence-${String(sentenceIndex + 1).padStart(3, "0")}`);
  const result = await edgeTts({text: cleanText, voice, outDir: chapterDir});
  const words = JSON.parse(fs.readFileSync(result.timings, "utf8")).words;
  if (!words.length) throw new Error("no real word timing for sentence " + (sentenceIndex + 1));

  const offset = cursorSeconds;
  for (const word of words) {
    allWords.push({
      ...word,
      start: Number(word.start) + offset,
      end: Number(word.end) + offset,
    });
  }

  const timings = alignedChunks(cleanText, chunks, words, result.manifest.duration_s);
  const from = Math.round((offset + Number(words[0].start)) * FPS) + 1;
  const to = Math.max(from, Math.round((offset + Number(words.at(-1).end)) * FPS));
  const subs = chunks.map((chunk, index) => {
    const timing = timings[index];
    return {
      from: Math.round((offset + timing.start) * FPS) + 1,
      to: Math.max(
        Math.round((offset + timing.start) * FPS) + 1,
        Math.round((offset + timing.end) * FPS),
      ),
      text: chunk,
    };
  });

  const id = "S" + String(sentenceIndex + 1).padStart(2, "0");
  sentences.push({
    id,
    chapter: item.chapter,
    from,
    to,
    text: cleanText,
    para: Boolean(item.paragraphEnd),
    subs,
  });
  audioParts.push({file: result.audio, start: offset});
  cursorSeconds = offset + Number(result.manifest.duration_s);
  speechSeconds += Number(result.manifest.duration_s);
  sentenceIndex += 1;
}

const tailSeconds = TAIL_FRAMES / FPS;
const totalSeconds = cursorSeconds + tailSeconds;
const audioFile = path.join(root, "audio.mp3");
mixAudio(audioParts, totalSeconds, audioFile);

fs.mkdirSync("public", {recursive: true});
fs.copyFileSync(audioFile, "public/audio.mp3");

const chapterItems = items.filter((item) => item.type === "chapter");
const chapters = chapterItems.length
  ? chapterItems.map((item) => {
      const first = sentences.find((sentence) => sentence.chapter === item.chapter);
      return {
        n: item.chapter,
        title: item.title,
        from: first?.from ?? 1,
      };
    })
  : [{n: 1, title: "", from: 1}];

const captionSource = captionsFromWords(allWords, {language});
const timeline = {
  fps: FPS,
  total_frames: Math.max(1, Math.ceil(totalSeconds * FPS)),
  engine: "edge-tts",
  voice,
  rate: process.env.TTS_RATE || "+0%",
  language,
  timing_mode: "per-sentence-word-boundary",
  chapters,
  sentences,
  speech_seconds: Number(speechSeconds.toFixed(3)),
};

fs.mkdirSync("script", {recursive: true});
fs.writeFileSync("script/timeline.json", JSON.stringify(timeline, null, 2));
fs.writeFileSync(
  "script/timeline.md",
  [
    "# 时间轴",
    "",
    "| 句 | 章 | 帧 from–to | 时长 | 段末 | 文本 |",
    "|---|---|---:|---:|---|---|",
    ...sentences.map((sentence) =>
      `| ${sentence.id} | ${sentence.chapter} | ${sentence.from}–${sentence.to} | ${((sentence.to - sentence.from + 1) / FPS).toFixed(1)}s | ${sentence.para ? "¶" : ""} | ${sentence.text.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## 章节起始帧",
    ...chapters.map((chapter) => `- 第${chapter.n}章 ${chapter.title}：f${chapter.from}`),
  ].join("\n"),
);
fs.writeFileSync(path.join(root, "timeline-source.json"), JSON.stringify(allWords, null, 2));
fs.writeFileSync("fixtures/captions.json", JSON.stringify(captionSource.captions, null, 2));

console.log(
  "TTS/TIMELINE PASS",
  JSON.stringify({
    language,
    voice,
    sentences: sentences.length,
    chapters: chapters.length,
    speech_seconds: speechSeconds,
    total_seconds: totalSeconds,
  }),
);
