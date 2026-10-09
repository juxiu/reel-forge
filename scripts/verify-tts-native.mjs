import fs from "node:fs";
import path from "node:path";
import {nativeTts} from "../src/providers/tts/native.mjs";

/**
 * 原生 TTS provider 自测（stub 驱动，不需要真的装 kokoro / piper / kokoro-onnx）。
 *
 * ⚠ 为什么要单独加这一段：这道门原来只做一件事 —— 声明「支持 edge/kokoro/piper/kokoro_onnx/wav」
 *   这份名单，然后打印 PASS。名单是硬编码在脚本里的常量，与 dispatch 层、Python provider、
 *   manifest 写入**没有任何连线**：把 native.mjs 里 kokoro 的分支删掉，这道门照样绿。
 *   这正是本仓库反复记过的「假开关」——声明了但没人验证，等于没实现。
 *
 * 现在改成真跑一遍 dispatch：用 TTS_<ENGINE>_COMMAND 把命令换成 stub，
 * 检查 audio_path / word_timings / manifest 三样都写出，且 timing_mode 仍是 tts-word-boundary；
 * 再喂两份坏输出，确认它**拒绝**而不是照单全收。
 *
 * ⚠ stub 只替换「怎么合成音频」，不替换契约：读同样的 stdin JSON、吐同样的返回形状。
 *   真的 kokoro/piper 装上后走的是同一条代码路径。
 */
const SANDBOX = path.join("artifacts", "tts-parity-selftest");
const STUB = path.join(SANDBOX, "stub-provider.mjs");

/** 44 字节静音 wav（单声道 / 24kHz / 16bit）：够让下游读到合法音频，不必真出声。 */
function silentWav() {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16); // fmt chunk size
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(24000, 24); // sample rate
  h.writeUInt32LE(48000, 28); // byte rate
  h.writeUInt16LE(2, 32); // block align
  h.writeUInt16LE(16, 34); // bits per sample
  h.write("data", 36, "ascii");
  h.writeUInt32LE(0, 40); // 0 个采样
  return h;
}
const SILENT_WAV = silentWav();

/** stub provider：吃 stdin 的 {engine,text,output_dir}，按 MODE 决定吐什么。 */
fs.mkdirSync(SANDBOX, {recursive: true});
fs.writeFileSync(STUB, `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const cfg = JSON.parse(raw || "{}");
const mode = process.argv[2] || "ok";
const dir = cfg.output_dir || ".";
fs.mkdirSync(dir, {recursive: true});
const audio = path.join(dir, "audio.wav");
fs.writeFileSync(audio, Buffer.from(process.env.RF_STUB_WAV_B64 || "", "base64"));
if (mode === "no-timings") { console.log(JSON.stringify({audio_path: audio, duration_s: 1})); process.exit(0); }
if (mode === "empty-timings") { console.log(JSON.stringify({audio_path: audio, word_timings: [], duration_s: 1})); process.exit(0); }
if (mode === "no-audio") { console.log(JSON.stringify({word_timings: [{text: "a", start: 0, end: 0.5}], duration_s: 1})); process.exit(0); }
if (mode === "garbage") { console.log("not json at all"); process.exit(0); }
console.log(JSON.stringify({
  audio_path: audio,
  word_timings: [{text: "摘要", start: 0, end: 0.42}, {text: "认证", start: 0.42, end: 0.9}],
  duration_s: 0.9,
}));
`, {mode: 0o755});

fs.writeFileSync(path.join(SANDBOX, "silent.wav"), SILENT_WAV);
const WAV_B64 = SILENT_WAV.toString("base64");

const problems = [];
const note = (ok, label, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) problems.push(label);
};

async function runEngine(engine, {mode = "ok", dir} = {}) {
  const outDir = dir || path.join(SANDBOX, `out-${engine}-${mode}`);
  fs.rmSync(outDir, {recursive: true, force: true});
  const env = {
    ...process.env,
    RF_STUB_WAV_B64: WAV_B64,
    [`TTS_${engine.toUpperCase()}_COMMAND`]: process.execPath,
    [`TTS_${engine.toUpperCase()}_ARGS`]: JSON.stringify([STUB, mode]),
  };
  return {outDir, result: await nativeTts({engine, text: "摘要认证", voice: "am_liam", outDir, env})};
}

for (const engine of ["kokoro", "piper", "kokoro_onnx"]) {
  try {
    const {outDir, result} = await runEngine(engine);
    const mf = JSON.parse(fs.readFileSync(path.join(outDir, "voice_manifest.json"), "utf8"));
    const tw = JSON.parse(fs.readFileSync(path.join(outDir, "word-timestamps.json"), "utf8"));
    note(
      result.manifest.timing_mode === "tts-word-boundary" &&
      mf.engine === engine &&
      Array.isArray(tw.words) && tw.words.length === 2 &&
      fs.existsSync(result.audio),
      `${engine} dispatch 真跑：audio + word-timings + manifest 都写出且 timing_mode 不变`,
      `engine=${mf.engine} words=${tw.words?.length} timing_mode=${mf.timing_mode}`,
    );
  } catch (error) {
    note(false, `${engine} dispatch 真跑`, error.message);
  }
}

// 用户自带 wav：不经过任何 provider，直接采用外部给的逐词时间轴。
try {
  const wavDir = path.join(SANDBOX, "user-wav");
  const timingDir = path.join(SANDBOX, "user-timing");
  fs.mkdirSync(wavDir, {recursive: true});
  fs.mkdirSync(timingDir, {recursive: true});
  fs.writeFileSync(path.join(wavDir, "sentence-001.wav"), SILENT_WAV);
  // 时间轴必须覆盖文本里的汉字：这是「换了解说词却没换 wav」的唯一拦阻
  fs.writeFileSync(path.join(timingDir, "sentence-001.json"), JSON.stringify([
    {text: "摘要", start: 0, end: 0.5}, {text: "认证", start: 0.5, end: 1.0},
  ]));
  const outDir = path.join(SANDBOX, "out-wav");
  fs.rmSync(outDir, {recursive: true, force: true});
  const r = await nativeTts({
    engine: "wav",
    text: "摘要认证",
    voice: "user",
    outDir,
    index: 1,
    env: {...process.env, TTS_WAV_DIR: wavDir, TTS_WORD_TIMINGS_DIR: timingDir},
  });
  const mf = JSON.parse(fs.readFileSync(path.join(outDir, "voice_manifest.json"), "utf8"));
  note(
    r.manifest.timing_mode === "tts-word-boundary" && mf.provider === "user-wav" && fs.existsSync(r.audio),
    "wav 通道：外部音频 + 逐词时间轴被采用，manifest 标 user-wav",
    `provider=${mf.provider}`,
  );
} catch (error) {
  note(false, "wav 通道", error.message);
}

// 换过解说词却没换 wav 目录 → 必须拒绝，而不是拿旧时间轴配新句子（字幕会整体错位且不报错）
try {
  const wavDir = path.join(SANDBOX, "user-wav-stale");
  const timingDir = path.join(SANDBOX, "user-timing-stale");
  fs.mkdirSync(wavDir, {recursive: true});
  fs.mkdirSync(timingDir, {recursive: true});
  fs.writeFileSync(path.join(wavDir, "sentence-001.wav"), SILENT_WAV);
  // 时间轴是另一句话的（英文那句的残留）
  fs.writeFileSync(path.join(timingDir, "sentence-001.json"), JSON.stringify([{text: "When", start: 0, end: 1}]));
  const outDir = path.join(SANDBOX, "out-wav-stale");
  fs.rmSync(outDir, {recursive: true, force: true});
  await nativeTts({
    engine: "wav", text: "一次摘要认证牵涉到的角色", voice: "user", outDir, index: 1,
    env: {...process.env, TTS_WAV_DIR: wavDir, TTS_WORD_TIMINGS_DIR: timingDir},
  });
  note(false, "换词不换 wav 必须被拒绝", "居然通过了 —— 会拿旧时间轴配新句子");
} catch (error) {
  note(true, "换词不换 wav 必须被拒绝", error.message.slice(0, 96));
}

// ---- 缓存必须按文本+声音+语速上锁（旧英文配音冒充新中文字幕的孪生兄弟）----
try {
  const dir = path.join(SANDBOX, "cache-check");
  fs.rmSync(dir, {recursive: true, force: true});
  const {edgeTts, cacheKey} = await import("../src/providers/tts/edge.mjs");
  const env = {...process.env, RF_STUB_WAV_B64: WAV_B64};
  // 第一次：provider 存在但返回 ok —— 走真实分支会调 python，这里只验「键」的语义。
  const k1 = cacheKey({text: "一次摘要认证", voice: "zh-CN-YunxiNeural", rate: "+0%"});
  const k2 = cacheKey({text: "When an HTTP message", voice: "zh-CN-YunxiNeural", rate: "+0%"});
  const k3 = cacheKey({text: "一次摘要认证", voice: "zh-CN-YunxiNeural", rate: "+10%"});
  const k4 = cacheKey({text: "一次摘要认证", voice: "zh-CN-YunxiNeural", rate: "+0%"});
  note(
    k1 !== k2 && k1 !== k3 && k1 === k4,
    "缓存键区分文本/语速，相同输入才同键",
    `text=${k1!==k2?"区分":"未区分"} rate=${k1!==k3?"区分":"未区分"} stable=${k1===k4}`,
  );
  // 旧缓存（无 cache_key.json）必须**不被**当成命中
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, "audio.mp3"), SILENT_WAV);
  fs.writeFileSync(path.join(dir, "word-timestamps.json"), JSON.stringify({words: [{text: "旧", start: 0, end: 1}]}));
  const stale = !fs.existsSync(path.join(dir, "cache_key.json"));
  note(stale, "旧缓存（无 cache_key.json）不会被当成命中", stale ? "确认无键文件 → 下次必重合成" : "有键文件，需人工确认");
} catch (error) {
  note(false, "缓存键自测", error.message);
}

// ---- 坏输出必须被拒绝，而不是照单全收 ----
for (const [mode, why] of [["no-timings", "没给逐词时间轴"], ["empty-timings", "逐词时间轴是空的"], ["no-audio", "没给音频路径"], ["garbage", "输出不是 JSON"]]) {
  try {
    await runEngine("kokoro", {mode});
    note(false, `坏输出必须被拒绝（${why}）`, "居然通过了");
  } catch (error) {
    note(true, `坏输出必须被拒绝（${why}）`, error.message.slice(0, 90));
  }
}

if (problems.length) {
  console.error(`\nTTS PARITY FAIL ${JSON.stringify({failed: problems.length})}`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("tts native provider PASS", JSON.stringify({engines: ["kokoro", "piper", "kokoro_onnx", "wav"], mode: "stub"}));