import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_MAX_SHOTS_PER_GROUP,
  STILL_FRAMES_HIGHLIGHT_MIN,
  STILL_FRAMES_PER_SCENE,
  expectedGroupSizes,
  groupCountOf,
  groupIdOf,
  maxShotsPerGroup,
} from "../src/build/limits.mjs";
import {extendStillFrames, isHighlightShot, shotSourcePath, stillFramesMin} from "../src/build/still-budget.mjs";

/**
 * 分组 / still 数量真源门。
 *
 * 存在的理由：`MAX_SHOTS_PER_GROUP` 与「每镜 6 张 still」此前各有 4 份独立实现
 * （三处 `Number(process.env.MAX_SHOTS_PER_GROUP||6)`，加上 `still-benchmark.mjs` 里两条写死的 6），
 * 而 `verify-reference-sample` / `verify-authored-shots` 又把 44 / 8 / 每组 6 / G8=2 写死在**校验脚本**里。
 * 现在这些都改成从 `src/build/limits.mjs` 与蓝图自身派生，这道门负责四件事：
 *   A. 真源自己算得对（默认值、env 校验、边界值、非法值）。
 *   B. 「逐镜头号反推组号」与「按顺序每 N 个切一块」两种算法在 每组 1..8 × 总镜数 1..48 上逐项相等
 *      —— 这是 `limits.mjs` 里那条「scene_id 连续且按序」前提的实测，不靠注释相信它。
 *   C. 七个调用点真的从 `limits.mjs` 取值，且回不到本地字面量（删掉 import 或把 6 写回去 → 变红）。
 *   D. `STILL_FRAMES_PER_SCENE` 与 `still-benchmark.mjs` 采样表达式实际产生的点数一致
 *      —— 改采样而不改常量会变红，反之亦然（否则蓝图门在数一个已经不存在的数量）。
 *   E. 高光镜头的 still **下限**（`STILL_FRAMES_HIGHLIGHT_MIN`）真的由 authored recipe 的
 *      `highlight: true` 触发：用临时目录里的假镜头文件跑 `isHighlightShot` / `stillFramesMin` /
 *      `extendStillFrames`，不碰 `src/shots`，也不需要渲染。
 *
 * ⚠ 这道门只读源码文本 + 纯函数计算，不渲染、不联网、不 spawn。
 *    它**不能**证明成片上每镜真的落了 6 张 still —— 那要 `STRICT_STILLS=1` 真渲染（见文末说明与
 *    `docs/knowledge/agent-protocol.md` §4「6 张 still 是计划不是证明」）。
 */

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

// ---- A) 真源自己算得对 ----
check(DEFAULT_MAX_SHOTS_PER_GROUP === 6, `默认每组镜头数变成 ${DEFAULT_MAX_SHOTS_PER_GROUP}：三处调用点与两份蓝图的口径都要重新对账`);
check(maxShotsPerGroup({}) === 6, "maxShotsPerGroup({}) 应回落到默认 6");
check(maxShotsPerGroup({MAX_SHOTS_PER_GROUP: ""}) === 6, "空字符串应按未设置处理（`Number(\"\")` 是 0，会被当成合法值拿去切块）");
check(maxShotsPerGroup({MAX_SHOTS_PER_GROUP: "4"}) === 4, "MAX_SHOTS_PER_GROUP=4 应取 4（24 镜 / 6 组这条路要能走）");
for (const bad of ["0", "-1", "2.5", "abc", "NaN", "6.0.1"]) {
  let threw = false;
  try { maxShotsPerGroup({MAX_SHOTS_PER_GROUP: bad}); } catch { threw = true; }
  check(threw, `MAX_SHOTS_PER_GROUP="${bad}" 必须抛错而不是静默接受（旧实现里 2.5 会被收成 2.5、abc 会成 NaN 再拿去切块）`);
}
check(STILL_FRAMES_HIGHLIGHT_MIN > STILL_FRAMES_PER_SCENE, `高光下限(${STILL_FRAMES_HIGHLIGHT_MIN})必须高于基础点数(${STILL_FRAMES_PER_SCENE})，否则「高光 ≥10 张」这条要求根本不存在`);
check(STILL_FRAMES_HIGHLIGHT_MIN === 10, `高光 still 下限变成 ${STILL_FRAMES_HIGHLIGHT_MIN}：上游 agent-build-rules.md:51 的「高光时刻镜头出 ≥10 张」与本仓库的判据要重新对账`);

// ---- B) 两种分组算法逐项一致 ----
let bCells = 0;
for (let perGroup = 1; perGroup <= 8; perGroup++) {
  for (let total = 1; total <= 48; total++) {
    // 复刻 build-groups.mjs / materialize-shots.mjs 的切块：按下标每 N 个一块，
    // 块的 **序号** 就是组名（`"G" + (groups.length + 1)`）。把它展开到每个镜头上，
    // 就是「第 s 镜属于哪一组」，必须与 groupIdOf(s) 逐镜相等。
    const chunkOfShot = [];
    let chunk = 0;
    for (let i = 0; i < total; i++) {
      if (i > 0 && i % perGroup === 0) chunk++;
      chunkOfShot.push("G" + (chunk + 1));
    }
    const chunkCount = chunk + 1;
    const byIdOf = chunkOfShot.map((_, index) => groupIdOf(index + 1, perGroup));
    check(chunkOfShot.join(",") === byIdOf.join(","), `切块与 groupIdOf 不一致（每组 ${perGroup}、共 ${total} 镜）：${chunkOfShot.join(",")} vs ${byIdOf.join(",")}`);
    const sizes = expectedGroupSizes(total, perGroup);
    check(sizes.length === chunkCount, `组数派生不一致（每组 ${perGroup}、共 ${total} 镜）：expectedGroupSizes 给 ${sizes.length}，切块给 ${chunkCount}`);
    check(groupCountOf(total, perGroup) === chunkCount, `groupCountOf 与切块组数不一致（每组 ${perGroup}、共 ${total} 镜）`);
    check(sizes.reduce((a, b) => a + b, 0) === total, `每组条数之和 ≠ 镜头数（每组 ${perGroup}、共 ${total} 镜）：${sizes.join(",")}`);
    check(sizes.slice(0, -1).every((n) => n === perGroup), `前组应装满 ${perGroup}，实为 ${sizes.join(",")}（每组 ${perGroup}、共 ${total} 镜）`);
    const tally = new Map();
    for (const name of chunkOfShot) tally.set(name, (tally.get(name) || 0) + 1);
    check(tally.get("G" + chunkCount) === sizes[chunkCount - 1], `末组余数不一致（每组 ${perGroup}、共 ${total} 镜）：切块 ${tally.get("G" + chunkCount)} vs 期望 ${sizes[chunkCount - 1]}`);
    bCells += total;
  }
}

// ---- C) 调用点真的从 limits.mjs 取值 ----
// `must` 里每一项都必须以裸标识符出现在该文件里；函数名额外要求一次 `名字(` 形式的调用。
const CONSUMERS = [
  {file: "scripts/build-groups.mjs", must: ["maxShotsPerGroup"]},
  {file: "scripts/materialize-shots.mjs", must: ["maxShotsPerGroup"]},
  {file: "scripts/verify-shots.mjs", must: ["maxShotsPerGroup", "groupIdOf"]},
  {file: "scripts/still-benchmark.mjs", must: ["STILL_FRAMES_PER_SCENE", "groupIdOf", "isHighlightShot", "stillFramesMin", "extendStillFrames"]},
  {file: "scripts/verify-still-benchmark.mjs", must: ["STILL_FRAMES_PER_SCENE", "STILL_FRAMES_HIGHLIGHT_MIN", "stillFramesMin"]},
  {file: "src/build/still-budget.mjs", must: ["STILL_FRAMES_PER_SCENE", "STILL_FRAMES_HIGHLIGHT_MIN", "groupIdOf"]},
  {file: "scripts/verify-reference-sample.mjs", must: ["maxShotsPerGroup", "groupIdOf", "groupCountOf", "expectedGroupSizes", "STILL_FRAMES_PER_SCENE"]},
  {file: "scripts/verify-authored-shots.mjs", must: ["maxShotsPerGroup", "expectedGroupSizes"]},
];
const FUNCTIONS = new Set(["maxShotsPerGroup", "groupIdOf", "groupCountOf", "expectedGroupSizes", "isHighlightShot", "stillFramesMin", "extendStillFrames"]);
// 每一条都是「本地字面量回潮」的一个形状；任何一处再命中就说明有人把取值改回了写死。
// ⚠ 扫描不分注释与代码（写注释剥离器更容易出错）：上面八个文件的**注释里**也不许原样引用
//    这些字面量，要提旧写法就换成中文描述 —— 否则这道 pin 会把「解释旧写法」当成回潮。
const BANNED = [
  [/Number\(\s*process\.env\.MAX_SHOTS_PER_GROUP/, "自己写了 Number(process.env.MAX_SHOTS_PER_GROUP…) —— 绕开 limits.mjs 的正整数校验"],
  [/required_per_scene\s*:\s*6/, "required_per_scene 又写死 6"],
  [/Math\.floor\(\s*\(?\s*\w+\s*-\s*1\s*\)?\s*\/\s*6\s*\)/, "组号又用 /6 手算（变量名不论，除以写死的 6 就是绕开 limits.mjs）"],
  [/G\[1-8\]/, "组名又用写死的组号区间正则"],
  [/!==\s*44\b/, "镜头数量又写死 44"],
  [/!==\s*8\b/, "组数又写死 8"],
  [/must contain 6 shots/, "每组条数又写死「6 shots」"],
  [/\.length\s*!==\s*6\b/, "每镜 still 帧数又写死 6"],
  [/frames\?\.length\s*!==/, "still 帧数判成「恰好」—— 高光镜头的 ≥10 会被这道门打回，判据应是 >= 下限"],
];
for (const {file, must} of CONSUMERS) {
  if (!fs.existsSync(file)) {
    failures.push(`${file} 不存在 —— 这道 pin 找不到它要守的对象`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  check(/from "[^"]*limits\.mjs"/.test(source), `${file} 没有 import src/build/limits.mjs`);
  for (const symbol of must) {
    check(new RegExp("\\b" + symbol + "\\b").test(source), `${file} 没有引用 ${symbol}`);
    if (FUNCTIONS.has(symbol)) check(new RegExp("\\b" + symbol + "\\s*\\(").test(source), `${file} 没有调用 ${symbol}()`);
  }
  for (const [re, why] of BANNED) check(!re.test(source), `${file}: ${why}`);
}

// ---- D) still 帧点数与常量一致 ----
let dFrames = -1;
{
  const source = fs.readFileSync("scripts/still-benchmark.mjs", "utf8").replace(/\r\n/g, "\n");
  const begin = source.indexOf("const frames=[");
  if (begin < 0) {
    failures.push("still-benchmark.mjs 里找不到 `const frames=[` —— 采样表达式改名了，这道 pin 自己失效");
  } else {
    const open = source.indexOf("[", begin);
    let depth = 0, end = -1;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "[") depth++;
      else if (source[i] === "]" && --depth === 0) { end = i; break; }
    }
    if (end < 0) {
      failures.push("still-benchmark.mjs 的 `const frames=[` 方括号不配 —— 无法数采样点");
    } else {
      let d = 0, current = "";
      const items = [];
      for (const ch of source.slice(open + 1, end)) {
        if ("([{".includes(ch)) d++;
        else if (")]}".includes(ch)) d--;
        if (ch === "," && d === 0) { items.push(current); current = ""; } else current += ch;
      }
      if (current.trim()) items.push(current);
      const n = items.filter((s) => s.trim().length).length;
      check(n === STILL_FRAMES_PER_SCENE, `still-benchmark 的采样表达式有 ${n} 个点，而 STILL_FRAMES_PER_SCENE=${STILL_FRAMES_PER_SCENE}：两者必须一起改，否则蓝图门在数一个已经不存在的数量`);
      dFrames = n;
    }
  }
}

// ---- E) 高光 still 下限真的由 authored recipe 触发 ----
// 参考片 44 镜没有一镜声明 `highlight`，所以这条分支没有真镜头走过；这里用临时目录造假文件跑，
// 不碰 `src/shots`，也不需要渲染。跑法与门/生产者共用 `src/build/still-budget.mjs`，因此
// 「E 段过 + 门过」意味着两边对高光的理解一致。
let eCases = 0;
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reel-still-budget-"));
  const write = (shot, body) => {
    const file = shotSourcePath(shot, root);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, body);
  };
  const recipe = (shot, extra) => 'export const SHOT_RECIPE = { shot_id: "' + shot + '", variant: "network", hero_size: 210, camera: "pan", settle_frames: 30' + (extra ? ", " + extra : "") + " };\n";
  try {
    write(1, recipe("SC01", "highlight: true"));
    write(2, recipe("SC02", "highlight: false"));
    // 3 号故意不建文件：镜头文件缺失时按非高光处理（代价写在 still-budget.mjs 的头注释里）。
    check(isHighlightShot(1, root) === true, "recipe 写了 highlight: true，isHighlightShot 却没认出来 —— 高光镜头会只出基础帧数");
    check(stillFramesMin(1, root) === STILL_FRAMES_HIGHLIGHT_MIN, `高光镜头的 still 下限应是 ${STILL_FRAMES_HIGHLIGHT_MIN}，实为 ${stillFramesMin(1, root)}`);
    check(isHighlightShot(2, root) === false, "recipe 写 highlight: false 却被当成高光 —— 非高光镜头会被要求多出一倍 still");
    check(stillFramesMin(2, root) === STILL_FRAMES_PER_SCENE, "非高光镜头的 still 下限应回到 " + STILL_FRAMES_PER_SCENE);
    check(isHighlightShot(3, root) === false && stillFramesMin(3, root) === STILL_FRAMES_PER_SCENE, "镜头文件缺失时应按非高光处理（缺失由 verify:shots 单独判红，不在这里抛）");
    eCases += 5;

    const base = [3, 4, 12, 20, 42, 50];
    const kept = extendStillFrames(base, STILL_FRAMES_PER_SCENE);
    check(kept.join(",") === [...base].sort((a, b) => a - b).join(","), `非高光的采样点不该被改动，实得 ${kept.join(",")}`);
    const grown = extendStillFrames(base, STILL_FRAMES_HIGHLIGHT_MIN);
    check(grown.length >= STILL_FRAMES_HIGHLIGHT_MIN, `高光补足后只有 ${grown.length} 个点，没到下限 ${STILL_FRAMES_HIGHLIGHT_MIN}`);
    check(grown.every((f, i) => i === 0 || f > grown[i - 1]), `补足出来的帧号必须严格递增且不重复，实得 ${grown.join(",")}`);
    check(grown.every((f) => f >= base[0] && f <= base[base.length - 1]), "补的点越出了镜头自己的帧区间");
    check(base.every((f) => grown.includes(f)), "补足把基础采样点弄丢了 —— 高光镜头应该是在原有采样点上加密，而不是换一批帧号");
    eCases += 5;

    // 短镜头：帧号不够用时 extendStillFrames 只能给出它能给的数量，把不足交给门去红。
    const tiny = extendStillFrames([1, 1, 2, 2, 3, 3], STILL_FRAMES_HIGHLIGHT_MIN);
    check(tiny.join(",") === "1,2,3", `6 帧的镜头补不出 10 个不重复帧号，应只给 3 个（实得 ${tiny.join(",")}）—— 这种情况必须由 verify:still-benchmark 报「少于下限」而不是静默通过`);
    eCases += 1;

    // 已知局限：`highlight` 出现在注释里也会被当成高光（这里不剥注释，剥注释的实现容易出错）。
    write(4, "// highlight: true\n" + recipe("SC04"));
    check(isHighlightShot(4, root) === true, "注释里的 highlight: true 现在会被当成高光 —— 这是**已知局限**，若改成剥离注释判，请同步本文与 agent-protocol §4");
    eCases += 1;
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
}

if (failures.length) {
  console.error("limits FAIL");
  for (const line of failures) console.error("  - " + line);
  process.exit(1);
}

console.log("limits PASS", JSON.stringify({
  default_per_group: DEFAULT_MAX_SHOTS_PER_GROUP,
  still_frames: STILL_FRAMES_PER_SCENE,
  still_highlight_min: STILL_FRAMES_HIGHLIGHT_MIN,
  sampled_points: dFrames,
  grouping_cells: bCells,
  budget_cases: eCases,
  consumers_pinned: CONSUMERS.length,
}));
