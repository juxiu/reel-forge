import fs from "node:fs";
import path from "node:path";

/**
 * 成片缩略总表（a2e template/scripts/sheet.py 的等价物）：
 * 每 60 帧抽一张已导出的成片帧，旁边标帧号 / 秒数 / 该时刻的字幕，
 * 输出一张 HTML 供 QC 通读全片 —— a2e 的 QC 规程第一步就是「先看 sheet 列出可疑镜头，
 * 再逐节拍看单帧」，没有这张表就只剩逐帧翻目录。
 *
 * 帧源用 render.sh 已导出的 artifacts/frames/16x9/*.png（测量层同源，不另抽 jpg）。
 * 字幕查 script/timeline.json：帧 n 落在哪句的 from–to 内，就标那句的 id + 文本前 18 字。
 */
const framesDir = "artifacts/frames/16x9";
const timelinePath = "script/timeline.json";
const outPath = "artifacts/deliver/sheet-16x9.html";
const STEP = 60;
const COLS = 6;

if (!fs.existsSync(framesDir)) {
  console.error(`sheet-gen SKIP（无 ${framesDir} —— 先跑 render.sh 导帧）`);
  process.exit(0);
}
const files = fs.readdirSync(framesDir).filter((f) => f.startsWith("f_") && f.endsWith(".png")).sort();
if (!files.length) {
  console.error("sheet-gen SKIP（帧目录为空）");
  process.exit(0);
}
const tl = fs.existsSync(timelinePath) ? JSON.parse(fs.readFileSync(timelinePath, "utf8")) : null;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sentAt = (n) => {
  if (!tl) return "";
  for (const s of tl.sentences || []) if (s.from <= n && n <= s.to) return esc(`${s.id} ${String(s.text || "").slice(0, 18)}`);
  return "";
};
const cells = [];
for (let i = 0; i < files.length; i += STEP) {
  const n = i + 1;
  cells.push(`<div class="c"><img loading="lazy" src="../frames/16x9/${files[i]}"><div class="l">f${n} (${(n / 30).toFixed(1)}s) <span>${sentAt(n)}</span></div></div>`);
}
const html = `<!doctype html><meta charset="utf-8"><title>sheet · reel-forge 16x9</title>
<style>body{background:#111;color:#ddd;font:12px/1.4 -apple-system,sans-serif;margin:8px}.g{display:grid;grid-template-columns:repeat(${COLS},1fr);gap:6px}.c img{width:100%;display:block}.l{padding:2px 0 6px}.l span{color:#9a8}</style>
<h3>成片缩略图 · 每 ${STEP} 帧一张 · 共 ${files.length} 帧（16:9）</h3><div class="g">${cells.join("")}</div>`;
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, html);
console.log(`sheet ${outPath} ${cells.length} cells / ${files.length} frames`);
