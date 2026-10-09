/**
 * 文本宽度估算与自适应字号——纯函数，不测 DOM，所以渲染是确定性的（同一帧在任何机器上一样）。
 *
 * em 宽取自 Noto Sans SC（wght 700–900）实测平均值：
 *   小写 .566  大写 .668  数字 .590  空格 .227  半角标点 .325  汉字 1.000
 *   带重音的拉丁字母（é ü ñ ß…）.49–.69 → 取 .58
 *   U+2000 起的标点/箭头/数学符号（— … “ ” → ∑ ≤ ×）在 CJK 字体里几乎都是 1em
 *   （例外：en dash .53、em dash .88——按 1 高估是安全方向，只会更早缩字号）
 *   Audiowide 大写 .788 / Orbitron 大写 .815 / Exo 2 大写 .606 → 用 EM_* 系数换算
 *
 * 为什么必须有这一层：字幕、进度条章名、章节卡标题、主角大字都要保证不出画、不折行。
 * 只靠「字符数 > N 就换小字号」会在中英混排时失效（一个汉字 = 1em，一个空格 = 0.227em），
 * 长英文句会被静默截断或压成两行字幕挤进内容区——这在样片 QC 里按缺陷处理。
 * 真正的约束仍在文案侧（每块中文 ≤16 字 / 英文 ≤48 字符）。
 */

export const EM_HEAVY = 1; // Noto Sans SC（正文 / 字幕 / 标题）
export const EM_WIDE = 1.18; // Audiowide（片名、大写缩写）
export const EM_ORB = 1.2; // Orbitron（数字 / 章序号）
export const EM_TECH = 0.92; // Exo 2（英文技术词，斜体窄）

/** 估算一段文字的宽度，单位 em（1em = fontSize px）。 */
export function textEm(s, emScale = 1) {
  let em = 0;
  for (const ch of String(s || '')) {
    const c = ch.codePointAt(0) ?? 32;
    if (c >= 0x2000) em += 1;
    else if (ch === ' ') em += 0.227;
    else if (c >= 65 && c <= 90) em += 0.668; // A–Z
    else if (c >= 48 && c <= 57) em += 0.59; // 0–9
    else if (c >= 97 && c <= 122) em += 0.566; // a–z
    else if (c >= 0xc0 && c < 0x250) em += 0.58; // Latin-1 / Extended-A/B
    else em += 0.325; // 半角标点
  }
  return em * emScale;
}

/** 码点数（不按 UTF-16 单元）。 */
export const charCount = (s) => [...String(s || '')].length;

/**
 * 估算宽度（px）。letterSpacing 是 CSS 的 px 值：Chromium 在每个字符后都加（含末字）且不随字号缩放，
 * 所以片名/章节卡这类带字距的大字必须把它算进去。
 */
export const textW = (s, size, emScale = 1, letterSpacing = 0) =>
  textEm(s, emScale) * size + letterSpacing * charCount(s);

/**
 * 超宽就等比缩字号，最低到 minSize（默认 78%）。返回 1 位小数，避免亚像素抖动。
 * letterSpacing 那部分宽度不随字号变，先从 maxW 扣掉再解字号。
 * 缩到 minSize 仍然超宽 → 文案违反了每块长度预算，改文案，不要指望这里。
 */
export function fitSize(s, maxW, size, minSize = size * 0.78, emScale = 1, letterSpacing = 0) {
  const em = textEm(s, emScale);
  const extra = letterSpacing * charCount(s);
  if (em * size + extra <= maxW) return size;
  return Math.max(minSize, Math.round(((maxW - extra) / Math.max(1e-6, em)) * 10) / 10);
}

/** 是否已缩到极限仍超宽（= 文案超预算，QC 应报缺陷）。 */
export const overflows = (s, maxW, size, emScale = 1, letterSpacing = 0) =>
  textW(s, size, emScale, letterSpacing) > maxW;

/** 每块字幕的长度预算（超出即视为文案缺陷，而不是靠缩字号硬塞）。 */
export const SUBTITLE_BUDGET = {zh: 16, en: 48};
export const isCJK = (s) => /[㐀-鿿぀-ヿ]/.test(String(s || ''));

/**
 * 按码点折行：中文可在任意字符后断，英文只在空格处断，绝不把单词拆开。
 * 返回行数组；行数 >1 时调用方应改小字号或退回文案预算，而不是把两行压进内容区。
 */
export function wrapText(s, maxW, size, emScale = 1, maxLines = 2) {
  const text = String(s || '');
  if (textW(text, size, emScale) <= maxW) return [text];
  const cjk = isCJK(text);
  const lines = [];
  let cur = '';
  const units = cjk ? [...text] : text.split(/(?<=\s)/);
  for (const u of units) {
    const next = cur + u;
    if (cur && textW(next, size, emScale) > maxW) {
      lines.push(cur.replace(/\s+$/, ''));
      cur = u;
      if (lines.length === maxLines - 1) {
        // 最后一行吸收剩余全部，超宽由调用方判缺陷
        continue;
      }
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur.replace(/\s+$/, ''));
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    head.push(lines.slice(maxLines - 1).join(cjk ? '' : ' '));
    return head;
  }
  return lines;
}
