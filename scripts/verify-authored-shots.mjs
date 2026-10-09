import fs from "node:fs";
import path from "node:path";
import {HERO_MIN} from "../src/visual/style.mjs";
import {CAMERA_LIMITS, isCameraPreset, cameraVocabulary} from "../src/visual/camera.mjs";
import {expectedGroupSizes, maxShotsPerGroup} from "../src/build/limits.mjs";

/**
 * authored 镜头合规门（结构解析版，替代旧的字串包含判断）。
 *
 * 旧版只做 `source.includes('variant:"network"')` 这类子串比对，于是它能对着一堆
 * 真问题报绿：
 *   · recipe 根本不是合法对象字面量（少个逗号、括号不配）→ 子串照样命中；
 *   · 分镜写了引擎不读的键（layout / seed 就是这种装饰品）→ 没人管；
 *   · variant 不在渲染层 switch 里 → 静默掉进 `default: rowLayout()`，
 *     画面变成通用列表，而门禁还以为 authored 生效了；
 *   · 委托行被改坏（多包一层组件 / 不再传 recipe）→ 检测不到。
 * 这里改成：把 SHOT_RECIPE 解析成对象、和渲染层真实识别的集合比对，
 * 并且把「一行一个键 / 行尾一致」也纳入检查 —— 这一批文件是 CRLF，
 * 跨行正则在 CRLF 上会顺走上一行的换行符，把两行并成一行，
 * 语法仍合法、`node --check` 与 verify:imports 都不报，只有画面会歪。
 */

// 渲染层（plan.mjs + Shot.jsx + SemanticShots.jsx）真正读走的 recipe 键。
// 表外的键＝假开关：分镜写了、引擎从不看，留着就是在骗 QC。
const CONSUMED = new Set(["shot_id", "variant", "hero_size", "hero_scale", "support_count", "labels", "accent_index", "settle_frames", "mirror", "hero_role", "camera", "stage", "fx", "effects", "highlight", "narrative_job", "fallback_hero", "hero"]);
const REQUIRED = ["shot_id", "variant", "hero_size", "camera", "settle_frames"];
const BANNED = [
  [/Math\.random/, "渲染层禁用 Math.random（画面不可复现）"],
  [/Date\.now|new Date/, "渲染层禁用时钟（同一帧必须永远同一画面）"],
  [/SemanticShot/, "authored 镜头不得直接引用 SemanticShot，必须经 ExplainerShot 委托"],
];

const blueprint = JSON.parse(fs.readFileSync("fixtures/reference-shot-blueprint.json", "utf8"));
const shots = blueprint.shots || [];
// 数量从蓝图自己派生，不再在这里写死 44 / 8：写死就成了「校验阈值与被校验产物各存一份数」，
// 换一部片要改脚本，而改脚本没有门守（docs/knowledge/agent-protocol.md §7、§8.8）。
if (shots.length < 1) throw new Error("authored shot blueprint has no shots[]");
if (blueprint.shot_count !== shots.length) throw new Error(`authored shot blueprint 自相矛盾：shot_count=${blueprint.shot_count} 而 shots.length=${shots.length}`);

/** 渲染层 itemSlots 的 switch (plan.variant) 真实认识的 variant 集合。 */
function recognisedVariants() {
  const src = fs.readFileSync("src/shots/SemanticShots.jsx", "utf8").replace(/\r\n/g, "\n");
  const head = src.indexOf("switch (plan.variant)");
  if (head < 0) throw new Error("SemanticShots.jsx 里没有 switch (plan.variant) —— 门根本没法判断 variant 是否生效");
  let depth = 0, end = -1;
  for (let i = src.indexOf("{", head); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { end = i; break; }
  }
  const cases = [...src.slice(head, end).matchAll(/case\s+['"]([a-z_]+)['"]/g)].map((m) => m[1]);
  if (!cases.length) throw new Error("switch (plan.variant) 一个 case 都没有");
  return new Set(cases);
}

/** 把 SHOT_RECIPE 字面量解析成对象；解析不了就交错误，不做子串兜底。 */
function parseRecipe(source, file) {
  const decl = source.match(/export const SHOT_RECIPE\s*=\s*\{/);
  if (!decl) return {error: `${file}: 没有 export const SHOT_RECIPE = {`};
  const brace = decl.index + decl[0].length - 1;
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      if (--depth === 0) {
        const literal = source.slice(brace, i + 1);
        try {
          return {value: new Function(`return (${literal});`)(), literal};
        } catch (e) {
          return {error: `${file}: SHOT_RECIPE 不是可求值的对象字面量 —— ${e.message}`};
        }
      }
    }
  }
  return {error: `${file}: SHOT_RECIPE 花括号不配`};
}

function structuralChecks(source, file) {
  const out = [];
  const crlf = (source.match(/\r\n/g) || []).length;
  const lf = (source.match(/\n/g) || []).length;
  if (/\r(?!\n)/.test(source)) out.push(`${file}: 行中残留裸 \\r`);
  if (crlf > 0 && crlf !== lf) out.push(`${file}: 行尾混用 CRLF(${crlf}) / LF(${lf - crlf})`);
  const block = /export const SHOT_RECIPE\s*=\s*\{([\s\S]*?)\n\};/.exec(source)?.[1];
  if (block !== undefined) {
    // 用「行首或空白后」数键：`^` 不带 m 标志只锚定字符串开头，
    // 写成 /^\s*[a-z_]+:/g 时每行最多只数到 1 个，这条检查就等于不存在。
    const merged = block.split(/\r\n|\n/).filter((l) => (l.match(/(?:^|[ \t])[a-z_]+:/g) || []).length > 1);
    if (merged.length) out.push(`${file}: recipe 一行出现多个键 → ${JSON.stringify(merged[0])}`);
  }
  const calls = source.match(/<ExplainerShot\b/g) || [];
  if (calls.length !== 1) out.push(`${file}: ExplainerShot 委托 ${calls.length} 次（必须恰好 1 次）`);
  if (!/recipe=\{SHOT_RECIPE\}/.test(source)) out.push(`${file}: 委托没有将 recipe={SHOT_RECIPE} 传下去`);
  return out;
}

const variants = recognisedVariants();
const byId = new Map();
const errors = [];
const stats = {checked: 0, cameras: new Set(), variantCases: variants.size};

for (const shot of shots) {
  if (byId.has(shot.shot_id)) errors.push(`blueprint shot_id 重复: ${shot.shot_id}`);
  byId.set(shot.shot_id, shot);
  const file = "src/shots/" + shot.group + "/" + shot.shot_id + ".jsx";
  if (!fs.existsSync(file)) {
    errors.push(`${shot.shot_id}: 镜头源文件缺失 ${file}`);
    continue;
  }
  stats.checked++;
  const source = fs.readFileSync(file, "utf8");
  errors.push(...structuralChecks(source, file));

  const parsed = parseRecipe(source, file);
  if (parsed.error) {
    errors.push(parsed.error);
    continue;
  }
  const recipe = parsed.value;
  const name = (k) => `${shot.shot_id} / ${k}`;

  for (const key of Object.keys(recipe)) if (!CONSUMED.has(key)) errors.push(`${name(key)}: 引擎不读的键（假开关），删掉或先在渲染层实现它`);
  for (const key of REQUIRED) if (recipe[key] === undefined) errors.push(`${name(key)}: 必需键缺失`);

  const variant = String(recipe.variant || "").toLowerCase();
  if (!variants.has(variant)) errors.push(`${name("variant")}: 「${variant}」不在渲染层 case 集合里，会静默退回通用行布局`);
  const camera = String(recipe.camera || "").toLowerCase();
  if (!isCameraPreset(camera)) errors.push(`${name("camera")}: 「${camera}」不在运镜词表（${cameraVocabulary().join("/")}）`);
  else stats.cameras.add(camera);

  const hero = Number(recipe.hero_size);
  if (!(hero >= HERO_MIN)) errors.push(`${name("hero_size")}: ${hero} < 主角下限 ${HERO_MIN}`);
  const settle = Number(recipe.settle_frames);
  if (!(settle >= CAMERA_LIMITS.clear)) errors.push(`${name("settle_frames")}: ${settle} < 相机最短让位帧 ${CAMERA_LIMITS.clear}`);
  if (recipe.accent_index !== undefined && Number(recipe.accent_index) >= Number(recipe.support_count ?? Infinity) && Number(recipe.support_count) > 0) {
    errors.push(`${name("accent_index")}: 强调序号 ${recipe.accent_index} 超出 support_count ${recipe.support_count}`);
  }

  for (const [re, why] of BANNED) if (re.test(source)) errors.push(`${name("source")}: ${why}`);

  // 与 blueprint 对齐（blueprint 是参考片的记录，authored 不得悄悄漂移）。
  for (const field of ["shot_id", "variant", "hero_size", "camera", "settle_frames"]) {
    if (shot[field] !== undefined && recipe[field] !== shot[field]) errors.push(`${name(field)}: 与 blueprint 不一致（${recipe[field]} vs ${shot[field]}）`);
  }
}

// 盘上的 authored 文件必须都在 blueprint 里 —— 不然新增一镜可以完全不过这道门。
for (const group of fs.readdirSync("src/shots").filter((d) => /^G\d+$/.test(d))) {
  for (const name of fs.readdirSync(path.join("src/shots", group))) {
    if (!/^SC\d+\.jsx$/.test(name)) continue;
    if (!byId.has(name.replace(".jsx", ""))) errors.push(`${group}/${name}: 不在 reference-shot-blueprint 里（孤儿镜头）`);
  }
}

const groups = new Map();
for (const shot of shots) groups.set(shot.group, (groups.get(shot.group) || 0) + 1);
// 每组条数按分组公式派生（原来是「G1–G7 各 6、G8 恰 2」四条写死），
// 于是 24–32 镜 / 4–6 组的校验片不需要改这道门就能判 —— src/build/limits.mjs。
const expected = expectedGroupSizes(shots.length, maxShotsPerGroup());
if (groups.size !== expected.length) throw new Error(`蓝图实有 ${groups.size} 组，分组公式（每 ${maxShotsPerGroup()} 镜一组）给 ${expected.length} 组`);
for (let i = 1; i <= expected.length; i++) {
  const got = groups.get("G" + i) || 0;
  if (got !== expected[i - 1]) throw new Error(`G${i} 有 ${got} 镜，分组公式期望 ${expected[i - 1]} 镜（前组装满、末组装余数）`);
}

if (errors.length) {
  console.error("authored shots FAIL");
  for (const line of errors) console.error("  - " + line);
  process.exit(1);
}

console.log("authored shots PASS", JSON.stringify({shots: stats.checked, groups: groups.size, variants_recognised: stats.variantCases, cameras_used: [...stats.cameras].sort()}));
