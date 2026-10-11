import fs from "node:fs";

/**
 * 人可读分镜表生成器（a2e「分镜表=导演意图文档」的等价物，C1）。
 *
 * a2e 的分镜表是 QC 判「分镜表有而画面没有」的依据，也是节拍检查的帧号真源。
 * 我们的镜头蓝图由 IR 自动物化，但没有把「帧区间 × 字幕块节拍 × 画面元素」
 * 拼成一张人能通读的表 —— QC 与人工审片都缺这一层。
 *
 * 数据源（都是已存在的真源，不引入新事实）：
 *   fixtures/render-ir-16x9.json —— 镜头区间与元素（装配层的唯一输入）
 *   script/timeline.json         —— 字幕块帧号（TTS 词边界，节拍列）
 * 输出 artifacts/digest-explainer/storyboard.md。
 */
const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const tl = JSON.parse(fs.readFileSync("script/timeline.json", "utf8"));
const fps = ir.fps || 30;

/** 字幕块按帧号摊平，然后按镜头区间归属。 */
const subs = (tl.sentences || []).flatMap((s) =>
  (s.subs || []).map((b) => ({from: Math.round(b.from), to: Math.round(b.to), text: (b.text || "").trim()}))
);

const rows = [];
for (const sc of ir.scenes || []) {
  const from = Math.round(sc.start * fps);
  const to = from + Math.round(sc.duration * fps);
  const beats = subs.filter((b) => b.from >= from - 8 && b.from <= to + 2);
  const elements = (sc.elements || [])
    .filter((e) => e.type !== "narration")
    .slice(0, 6)
    .map((e) => `${e.id}:${e.type}${e.text ? `「${String(e.text).slice(0, 18)}」` : ""}`)
    .join(" · ");
  const beatCol = beats.map((b) => `${b.from} ${b.text}`).join("<br>") || "—";
  rows.push({id: sc.id, from, to, job: sc.narrative_job || sc.variant || "", beat: beatCol, elements: elements || "—"});
}

const lines = [
  "# 分镜表（由 IR 自动生成，勿手改；重新物化后运行 `npm run storyboard:gen` 刷新）",
  "",
  `总帧数 ${Math.round(ir.duration * fps)}（${fps}fps）。镜头 ${rows.length} 个。`,
  "节拍列 = 字幕块起始帧（TTS 词边界）；元素入场锚定在块起始 −6…+3 窗口内。",
  "",
  "| 镜头 | 帧区间 | 节拍（字幕块） | 语义 | 画面元素 |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | ${r.from}–${r.to} | ${r.beat} | ${r.job} | ${r.elements} |`),
  "",
];
fs.writeFileSync("artifacts/digest-explainer/storyboard.md", lines.join("\n"));
console.log(`storyboard.md: ${rows.length} shots, ${subs.length} subtitle blocks`);
