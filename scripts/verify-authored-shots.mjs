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

/**
 * 扫出 SHOT_RECIPE 里**顶层**（深度 0）的键及其所在行号。
 *
 * ⚠ 为什么要按深度扫而不是逐行正则：recipe 有了嵌套结构（stage.hub / stage.items[]）之后，
 *   `/[a-z_]+:/g` 会把 `hub: {cx: 640, cy: 372}` 里的 `cx:` / `cy:` 也数成顶层键，
 *   于是「一行一个键」这条检查对任何带嵌套的 recipe 都误报 —— 检查必须跟得上数据结构。
 *   字符串与转义要跳过，否则文案里的冒号会把深度算错。
 */
function topLevelKeys(source) {
  const decl = source.match(/export const SHOT_RECIPE\s*=\s*\{/);
  if (!decl) return [];
  const start = decl.index + decl[0].length - 1;
  const out = [];
  let depth = 0;
  let line = 1;
  let keyStart = -1;
  let key = "";
  let inStr = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === "\n") line++;
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{" || c === "[" || c === "(") {
      // 顶层键后面紧跟的 { 是它的值，不算进入新层。
      if (c === "{" && depth === 1 && keyStart >= 0) { keyStart = -1; key = ""; depth++; continue; }
      depth++;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0) break;
      continue;
    }
    if (depth === 1 && c === ":") {
      out.push({key, line});
      keyStart = -1;
      key = "";
      continue;
    }
    if (depth === 1 && keyStart < 0 && /[A-Za-z_]/.test(c)) { keyStart = i; key = c; continue; }
    if (depth === 1 && keyStart >= 0 && /[A-Za-z0-9_]/.test(c)) { key += c; continue; }
    if (depth === 1 && keyStart >= 0 && !/\s/.test(c)) { keyStart = -1; key = ""; }
  }
  return out;
}

function structuralChecks(source, file) {
  const out = [];
  const crlf = (source.match(/\r\n/g) || []).length;
  const lf = (source.match(/\n/g) || []).length;
  if (/\r(?!\n)/.test(source)) out.push(`${file}: 行中残留裸 \\r`);
  if (crlf > 0 && crlf !== lf) out.push(`${file}: 行尾混用 CRLF(${crlf}) / LF(${lf - crlf})`);
  // 一行一个顶层键：CRLF 下跨行正则会把两行并成一行，语法仍合法、node --check 也不报，只有画面会歪。
  const byLine = new Map();
  for (const {key, line} of topLevelKeys(source)) {
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line).push(key);
  }
  for (const [line, keys] of byLine) {
    if (keys.length > 1) out.push(`${file}: recipe 第 ${line} 行出现多个顶层键 → ${keys.join(" / ")}`);
  }
  const calls = source.match(/<ExplainerShot\b/g) || [];
  if (calls.length !== 1) out.push(`${file}: ExplainerShot 委托 ${calls.length} 次（必须恰好 1 次）`);
  if (!/recipe=\{SHOT_RECIPE\}/.test(source)) out.push(`${file}: 委托没有将 recipe={SHOT_RECIPE} 传下去`);
  return out;
}

const variants = recognisedVariants();
const byId = new Map();
const errors = [];
const stats = {checked: 0, cameras: new Set(), variantCases: variants.size, stages: new Set(), kinds: new Map()};

/**
 * 组私有舞台的接线审计。
 *
 * 这一段是整道门里唯一能回答「这 44 镜是不是真的各有构图」的地方。以前这道门只查
 * variant 名在不在 switch 里，于是 44 个只有 variant/hero_size/camera 之差的空壳
 * 一样报 PASS —— 它们全塌进 SemanticShots 的同一条两带布局里，画面的差别只来自
 * hero_size 那几个数字。这和仓库已经记过的 motion_too_low「假修复」是同一类缺陷：
 * 校验对象与校验强度不匹配。
 *
 * 判据（逐条都可证伪，不靠人眼）：
 *   1. 每个镜头必须声明 stage.kind —— 没有它就是空壳，直接 FAIL；
 *   2. stage.kind 在**组内**必须互不相同 —— 同组两镜同拓扑 = 复制粘贴；
 *   3. 组私有模块 stage.jsx 必须真的导出该镜的组件（查 components 映射表），
 *      且镜头文件必须把 stage={...} 传下去 —— 声明了不接���是「假开关」；
 *   4. stage.jsx 的 topologies 清单必须与组内实际用到的 kind 一致（不多不少），
 *      否则清单会变成装饰；
 *   5. 全片任何一种 kind 占比不得超过 MAX_KIND_SHARE —— 挡住「一种版式铺满全片」。
 */
const MAX_KIND_SHARE = 0.15;

const stageSrc = new Map();
function stageModule(group) {
  if (!stageSrc.has(group)) {
    const f = `src/shots/${group}/stage.jsx`;
    stageSrc.set(group, fs.existsSync(f) ? {file: f, src: fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n")} : null);
  }
  return stageSrc.get(group);
}

/** 抓 `components: {SC01: Radial, ...}` 里声明的 shot_id → 组件名映射。 */
function stageComponents(src) {
  const head = src.indexOf("components:");
  if (head < 0) return null;
  const open = src.indexOf("{", head);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) {
      const out = new Map();
      for (const m of src.slice(open, i + 1).matchAll(/([A-Z]{2}\d{2,})\s*:\s*([A-Za-z0-9_]+)/g)) out.set(m[1], m[2]);
      return out;
    }
  }
  return null;
}

/** 抓 `topologies: [...]`。 */
function stageTopologies(src) {
  const m = /topologies:\s*\[([^\]]*)\]/.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/["']([a-z0-9_]+)["']/g)].map((x) => x[1]);
}

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

  // ---- 组私有舞台 ----
  const kind = String(recipe.stage?.kind || "");
  if (!kind) {
    errors.push(`${name("stage")}: 没有 stage.kind —— 这是一个空壳镜头（全塌进通用两带布局），必须给本镜声明拓扑`);
  } else {
    stats.stages.add(shot.group);
    stats.kinds.set(kind, (stats.kinds.get(kind) || 0) + 1);
    const mod = stageModule(shot.group);
    if (!mod) {
      errors.push(`${name("stage")}: 本镜声明了拓扑「${kind}」但 ${shot.group}/stage.jsx 不存在`);
    } else {
      const comps = stageComponents(mod.src);
      if (!comps) errors.push(`${shot.group}/stage.jsx: 没有 components 映射表，镜头接不上舞台`);
      else if (!comps.has(shot.shot_id)) errors.push(`${name("stage")}: ${shot.group}/stage.jsx 的 components 里没有 ${shot.shot_id}`);
    }
    if (!/stage=\{[A-Za-z0-9_.]+\}/.test(source)) {
      errors.push(`${name("stage")}: 声明了拓扑却没把 stage={...} 传给 ExplainerShot —— 声明了不接 = 假开关`);
    }
  }

  for (const [re, why] of BANNED) if (re.test(source)) errors.push(`${name("source")}: ${why}`);

  // 与 blueprint 对齐（blueprint 是参考片的记录，authored 不得悄悄漂移）。
  for (const field of ["shot_id", "variant", "hero_size", "camera", "settle_frames"]) {
    if (shot[field] !== undefined && recipe[field] !== shot[field]) errors.push(`${name(field)}: 与 blueprint 不一致（${recipe[field]} vs ${shot[field]}）`);
  }
}

// 组内拓扑互不相同（复制粘贴检测）；同时校验 stage.jsx 的 topologies 清单不多不少。
const groupKinds = new Map();
for (const shot of shots) {
  const file = "src/shots/" + shot.group + "/" + shot.shot_id + ".jsx";
  if (!fs.existsSync(file)) continue;
  const parsed = parseRecipe(fs.readFileSync(file, "utf8"), file);
  if (parsed.error) continue;
  const kind = String(parsed.value?.stage?.kind || "");
  if (!kind) continue;
  if (!groupKinds.has(shot.group)) groupKinds.set(shot.group, new Map());
  const seen = groupKinds.get(shot.group);
  if (seen.has(kind)) errors.push(`${shot.group}: ${seen.get(kind)} 与 ${shot.shot_id} 同用拓扑「${kind}」—— 组内两镜同版式`);
  else seen.set(kind, shot.shot_id);

  const mod = stageModule(shot.group);
  if (!mod) continue;
  const declared = stageTopologies(mod.src);
  if (declared && !declared.includes(kind)) {
    errors.push(`${shot.group}/stage.jsx: topologies 清单里没有「${kind}」（${shot.shot_id} 在用）`);
  }
}
for (const [group, mod] of stageSrc) {
  if (!mod) continue;
  const declared = stageTopologies(mod.src);
  if (!declared) continue;
  const used = new Set([...(groupKinds.get(group)?.keys() || [])]);
  for (const k of declared) if (!used.has(k)) errors.push(`${group}/stage.jsx: topologies 声明了「${k}」但组内没有镜头用它`);
}
for (const [kind, n] of stats.kinds) {
  const share = n / Math.max(1, shots.length);
  if (share > MAX_KIND_SHARE) errors.push(`拓扑「${kind}」占全片 ${(share * 100).toFixed(1)}%（${n}/${shots.length}），超过上限 ${(MAX_KIND_SHARE * 100).toFixed(0)}% —— 一种版式铺满全片`);
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

console.log("authored shots PASS", JSON.stringify({shots: stats.checked, groups: groups.size, variants_recognised: stats.variantCases, cameras_used: [...stats.cameras].sort(), stage_groups: [...stats.stages].sort(), distinct_topologies: stats.kinds.size, max_kind_share: Math.round(Math.max(0, ...[...stats.kinds.values()]) / shots.length * 1000) / 10 + "%"}));
