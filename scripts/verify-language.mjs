import fs from "node:fs";

/**
 * 语言一致性门：`project.language` 必须与 `script/narration.txt` 的实际内容一致。
 *
 * ⚠ 事故（2026-10-09 实测，浪费了一整轮）：
 *   `fixtures/project.json` 里 `language` 一直是 `"en"`（旧英文样片留下的），而解说词早已换成中文。
 *   tts_build 于是把 voice 解析成 `en-US-JennyNeural` —— **一个英文声音去念中文**，
 *   edge-tts 对每一句都返回 `NoAudioReceived: No audio was received. Please verify that your
 *   parameters are correct.`。那条报错把矛头指向「参数」，于是我先怀疑文本、怀疑限流、
 *   怀疑重试退避 —— 实际原因是配置里的一个字段和内容对不上。
 *
 *   更糟的是它**不会自己好**：英文声音念中文时不是「念错」，是根本产不出音频，
 *   于是每句都失败，而错误信息永远在讲参数。
 *
 * 这一门在**合成之前**判：语言字段与解说词实际字符集不符就 FAIL，并直接说出该改哪个字段。
 * 判据用 CJK 字符占比（参照片也用同一套：中文片 cjk ≥ 20% 走逐字切词，否则按空格切词）。
 */

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const narrationFile = process.env.NARRATION_FILE || "script/narration.txt";

if (!fs.existsSync(narrationFile)) {
  console.log(`language gate SKIP ${JSON.stringify({reason: "no narration file", file: narrationFile})}`);
  process.exit(0);
}

const text = fs.readFileSync(narrationFile, "utf8");
const spoken = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).join(" ");
const cjk = (spoken.match(/[㐀-䶿一-鿿]/g) || []).length;
const latin = (spoken.match(/[A-Za-z]/g) || []).length;
const total = cjk + latin;
const cjkShare = total ? cjk / total : 0;

// 与 tts_build / native_tts_provider 共用的同一套阈值：≥20% 视为中文片。
const looksChinese = cjkShare >= 0.2;
const declared = String(project.language || "").toLowerCase();
const problems = [];

if (!["zh", "en"].includes(declared)) {
  problems.push(`project.language="${declared}" 不是 zh/en —— tts_build 会用兜底 voice，猜错语言`);
} else if (declared === "zh" && !looksChinese) {
  problems.push(
    `project.language="zh" 但解说词里汉字只占 ${(cjkShare * 100).toFixed(1)}%（latin ${latin} 字）` +
    " —— 要么 language 该是 en，要么解说词换错了",
  );
} else if (declared === "en" && cjkShare >= 0.5) {
  problems.push(
    `project.language="en" 但解说词 ${(cjkShare * 100).toFixed(1)}% 是汉字` +
    ` → voice 会解析成英文声音（如 en-US-JennyNeural），念中文时 edge-tts 每句都报` +
    " NoAudioReceived，而那条报错会把矛头指向参数而不是这里",
  );
}

if (problems.length) {
  console.error("LANGUAGE GATE FAIL " + JSON.stringify({
    declared_language: declared,
    narration_file: narrationFile,
    cjk_chars: cjk,
    latin_chars: latin,
    cjk_share: +(cjkShare * 100).toFixed(1),
    resolved_voice_would_be: declared === "zh" ? "zh-CN-YunxiNeural" : "en-US-JennyNeural",
  }, null, 2));
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

console.log(
  "language gate PASS " +
    JSON.stringify({
      declared_language: declared,
      cjk_share: +(cjkShare * 100).toFixed(1),
      voice: declared === "zh" ? "zh-CN-YunxiNeural" : "en-US-JennyNeural",
    }),
);