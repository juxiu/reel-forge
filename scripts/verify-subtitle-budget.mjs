import fs from "node:fs";
import {SUBTITLE_BUDGET, charCount} from "../src/visual/textfit.mjs";

/**
 * 字幕块长度预算门（a2e 硬纪律：每块中文 ≤16 字 / 英文 ≤48 词）。
 *
 * ⚠ 预算是文案侧约束，不是渲染侧：超预算的正确修法是**回 narration.txt 调整 | 切分点**
 *   （在标点处拆两块），而不是靠 fitSize 缩号把 20 字塞进一行 —— 缩号会把字幕压小、
 *   把信息单元堆密，正是 a2e 用这条纪律挡掉的观感缺陷。
 *
 * 口径：「单元」= 汉字数 + 英文词/数字串数（一个汉字=1，一个 HTTP=1）。
 * 文本含 CJK → 用 zh 预算；纯拉丁 → 用 en 预算。输入是 script/timeline.json 的
 * subs（TTS 词边界切块后的最终字幕），不是 narration.txt 源 —— 门守的是真正上屏的东西。
 *
 * 检查在本地无需渲染、无需联网：纯读 JSON 秒级。
 * 可传 argv[2] 指定时间轴路径（Gate 9 受控失败实验用：注入超标块 → 门红 → 修复 → 门绿）。
 */
const timelinePath = process.argv[2] || "script/timeline.json";
if (!fs.existsSync(timelinePath)) {
  console.error(`subtitle-budget SKIP（无 ${timelinePath}）`);
  process.exit(0);
}
const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
const units = (s) => (String(s).match(/[㐀-鿿]/g) || []).length + (String(s).match(/[A-Za-z0-9]+/g) || []).length;
const isCJK = (s) => /[㐀-鿿]/.test(String(s));

const bad = [];
let total = 0;
for (const sent of timeline.sentences || []) {
  for (const sub of sent.subs || []) {
    total += 1;
    const text = sub.text || "";
    if (charCount(text) === 0) continue;
    const budget = isCJK(text) ? SUBTITLE_BUDGET.zh : SUBTITLE_BUDGET.en;
    const u = units(text);
    if (u > budget) bad.push({sentence: sent.id, units: u, budget, text});
  }
}
console.log(`subtitle-budget: ${total} blocks, ${bad.length} over budget`);
for (const b of bad) console.log(`  [${b.sentence}] ${b.units}>${b.budget} ${b.text}`);
if (bad.length) {
  console.error(`subtitle-budget FAIL: ${bad.length} blocks over ${SUBTITLE_BUDGET.zh}/${SUBTITLE_BUDGET.en} —— 回 narration.txt 在标点处调 | 切分，不要缩号`);
  process.exit(1);
}
