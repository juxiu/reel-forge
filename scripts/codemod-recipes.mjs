import fs from "node:fs";
import path from "node:path";

/**
 * 一次性 codemod：把 authored 镜头文件里**引擎不读**的 recipe 字段清掉，
 * 并把 hero_role 统一接到 narrative_job 上。
 *
 * 用法：node scripts/codemod-recipes.mjs [--write]
 * 默认干跑，只打印将要改动的文件；加 --write 才落盘。
 *
 * ⚠ 逐行处理，不做跨行正则。这仓库的工作区文件是 CRLF（core.autocrlf），
 *   而 JS 的 multiline `^` 把 `\r` 也算行首，`^\s*key:` 这种写法会顺着 `\n`
 *   把**上一行的换行符**一起吃掉，两行被合并成一行 —— 语法仍然合法、
 *   node --check 与 verify:imports 都不会报错，只有画面/阅读时才发现。
 *   所以这里显式按行切、按原 EOL 拼回，并在落盘前复核「一行一个键」。
 */

// 引擎（src/shots/plan.mjs + Shot.jsx + SemanticShots.jsx）真正读走的 recipe 键。
// 不在这张表里的键＝装饰品：分镜写了、渲染层从不看，留着就是假开关。
const CONSUMED = new Set(["shot_id", "variant", "hero_size", "hero_scale", "support_count", "labels", "accent_index", "settle_frames", "mirror", "hero_role", "camera", "stage", "fx", "effects", "highlight", "narrative_job", "fallback_hero", "hero"]);
const DROP = new Set(["layout", "seed"]);
const write = process.argv.includes("--write");

const files = [];
for (const group of fs.readdirSync("src/shots").filter((d) => /^G\d+$/.test(d))) {
  for (const name of fs.readdirSync(path.join("src/shots", group)).filter((f) => /^SC\d+\.jsx$/.test(f))) {
    files.push(path.join("src/shots", group, name).split(path.sep).join("/"));
  }
}

const OLD_CALL = /return <ExplainerShot scene=\{\{\.\.\.scene, variant:SHOT_RECIPE\.variant\}\} recipe=\{SHOT_RECIPE\} \/>;/;
const NEW_CALL = "return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;";

let changed = 0;
const problems = [];
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const eol = before.includes("\r\n") ? "\r\n" : "\n";
  const lines = before.split(/\r\n|\n/);
  const kept = [];
  for (const line of lines) {
    const key = /^\s*([a-z_]+):/.exec(line)?.[1];
    if (key && DROP.has(key)) continue;
    // 用 replace 而不是整行替换：正则没匹配行首缩进，整行替换会把两格缩进吃掉。
    kept.push(line.replace(OLD_CALL, NEW_CALL));
  }
  const after = kept.join(eol);

  // 落盘前自检：recipe 块必须保持「一行一个键」，且不能有裸 \r 混进行中间。
  const block = /export const SHOT_RECIPE = \{([\s\S]*?)\n\};/.exec(after)?.[1] ?? "";
  // 「一行一个键」复核。注意 `^` 在没有 m 标志时只锚定字符串开头，
  // 所以必须用「行首或空白后」来数键，否则合并行永远只数到 1 个，检查形同不存在。
  const dupKeyLine = block.split(eol).find((l) => (l.match(/(?:^|[ \t])[a-z_]+:/g) || []).length > 1);
  if (dupKeyLine) problems.push(`${file}: 一行出现多个键 ${JSON.stringify(dupKeyLine)}`);
  // ⚠ 判「裸 \r」只能用「\r 后面不是 \n」；`\n\r` 不是坏东西 —— CRLF 文件里的空行
  //    就是 `\r` + `\n` + `\r` + `\n`，天然含 `\n\r`。写这条时差点把它当成损坏，
  //    把一次好改动误报成失败。
  const loneCr = /\r(?!\n)/.test(after);
  const lfTotal = (after.match(/\n/g) || []).length;
  const crlfTotal = (after.match(/\r\n/g) || []).length;
  if (loneCr) problems.push(`${file}: 行中残留裸 \\r`);
  if (crlfTotal > 0 && crlfTotal !== lfTotal) problems.push(`${file}: 行尾混用 CRLF(${crlfTotal}) / LF(${lfTotal - crlfTotal})`);
  if (!after.includes(NEW_CALL)) problems.push(`${file}: 委托行没被识别（格式漂移，需人工看）`);

  if (after !== before) {
    changed++;
    console.log(`${write ? "write" : "dry-run"} ${file}`);
    if (write) fs.writeFileSync(file, after);
  }
}

if (problems.length) {
  console.error("codemod aborted, 结构复核未过：\n" + problems.join("\n"));
  process.exit(1);
}

const unknown = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const block = /export const SHOT_RECIPE = \{([\s\S]*?)\n\};/.exec(text)?.[1] ?? "";
  for (const line of block.split(/\r\n|\n/)) {
    const key = /^\s*([a-z_]+):/.exec(line)?.[1];
    if (key && !CONSUMED.has(key)) unknown.set(key, (unknown.get(key) || 0) + 1);
  }
}
console.log(JSON.stringify({files: files.length, changed, unconsumed_keys_left: [...unknown.entries()], write}, null, 2));
