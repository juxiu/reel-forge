import fs from "node:fs";
import path from "node:path";

/**
 * 相对坐标门：wrapper 已定位时，内部子元素**不得**再写全画布绝对坐标。
 *
 * ⚠ 这条 bug 的形态（2026-10-09 真渲染才发现，三处）：
 *   `style={{...abs(cx - cw / 2, top, cw, 56)}}` 已经把 wrapper 放到 (cx-cw/2, top)，
 *   里面的 `<Box x={cx - cw / 2} …>` 又写了一遍同样的值 —— 渲染出来偏移两次。
 *   后果在画面上各不相同，靠读代码看不出来：
 *     · comparetable：左列框被推到画面中央、右列框跑到 1320..1620 出画，
 *       看起来像「表头只剩一个、另一列没有框」，很容易误判成对比度问题；
 *     · reshape：两个形整个消失、只剩一根箭头，文字散在画布各处；
 *     · 第一版扫描器还漏了 reshape —— 它当时要求 wrapper 行内含 `display`，
 *       而 reshape 的 wrapper 没有 display，于是「已修」的报告是假的。
 *       所以这一版不靠行内关键词过滤，只靠「wrapper 原点非零 + 内部出现绝对坐标」判定。
 *
 * 为什么必须是静态门：syntax / imports / jsx-symbols / render-layer 全都过，
 * 只有像素里有答案。这类「结构没错、坐标错两次」的缺陷是门禁盲区里最贵的一类。
 *
 * 白名单：确实需要「内部用绝对坐标」的场景（wrapper 是 inset:0 的全画布层）不在这条规则内 ——
 * 本门只抓 wrapper 原点**非零**的情况。
 */

const FILES = ["src/shots/stage-kit.jsx", "src/shots/G1/stage.jsx", "src/shots/SemanticShots.jsx"];
// 绝对定位子元素：这些组件会自己按 x/y 绝对摆位，落在非零 wrapper 里就可能双重偏移。
const ABS_CHILD = /<(?:Box|Glyph|Label|MonoText)\b[^>]*?\b(?:x|cx)=\{/;

/** 归一化表达式：去空格，够用来比较「是不是同一个表达式」。 */
const norm = (s) => String(s).replace(/\s+/g, "");

/**
 * 判「重复定位」而不是「用了绝对坐标」。
 *
 * ⚠ 第一版把 `cx={half}` / `cx={s / 2}` 也报成错 —— 那是误报：wrapper 在 `cx - half`，
 *   内部再用 `half` 正好落在 wrapper 的中心，是**正确**的相对坐标。
 *   真正要抓的是**子元素把 wrapper 的原点表达式又写了一遍**：
 *   wrapper `abs(cx - cw / 2, …)` + child `x={cx - cw / 2}` = 偏移两次。
 *   所以判据收紧成「子坐标表达式与 wrapper 原点表达式相同」，零误报。
 */
function isRepeat(childExpr, originExpr) {
  const c = norm(childExpr);
  const o = norm(originExpr);
  return c === o || (o.length > 2 && c.includes(o));
}

const problems = [];
let wrappers = 0;

for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    // wrapper 原点：abs(x, y, ...) 且 x/y 不是 0
    const m = lines[i].match(/\.\.\.abs\(\s*([^,]+),\s*([^,]+),/);
    if (!m) continue;
    const ox = m[1].trim();
    const oy = m[2].trim();
    if (ox === "0" && oy === "0") continue; // inset:0 全画布层，内部绝对坐标正确
    wrappers++;

    // 向下找该 wrapper 的直接子元素（最多 8 行，遇到同层闭合就停）
    for (let j = i + 1; j < Math.min(i + 9, lines.length); j++) {
      if (ABS_CHILD.test(lines[j])) {
        const bad = lines[j].match(/(?:x|cx)=\{([^}]{1,48})\}/);
        const v = (bad?.[1] ?? "").trim();
        if (v && isRepeat(v, ox)) {
          problems.push(`${path.basename(file)}:${j + 1} 重复了 wrapper 的原点：wrapper 在 abs(${ox},…) 而子元素又用 ${bad[0]}`);
        }
        break;
      }
      // 子元素里已经闭合，wrapper 到此为止
      const opens = (lines[j].match(/<div/g) || []).length;
      const closes = (lines[j].match(/<\/div>/g) || []).length;
      if (closes > opens) break;
    }
  }
}

if (problems.length) {
  console.error("RELATIVE COORDS GATE FAIL " + JSON.stringify({wrappers_scanned: wrappers, problems: problems.length}, null, 2));
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("relative coords PASS " + JSON.stringify({wrappers_scanned: wrappers, note: "wrapper 非零原点时，内部子元素只用相对坐标"}));