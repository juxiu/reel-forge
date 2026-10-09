/**
 * 分组与 still 采样数量的**唯一真源**。
 *
 * 为什么要有这个文件：`MAX_SHOTS_PER_GROUP` 此前在四处各自解析一遍
 * （`scripts/build-groups.mjs`、`scripts/materialize-shots.mjs`、`scripts/verify-shots.mjs`
 * 三处 `Number(process.env.MAX_SHOTS_PER_GROUP||6)`，加上 `scripts/still-benchmark.mjs`
 * 里两条**写死的 6**：`required_per_scene: 6` 与组号 `Math.floor((shot-1)/6)+1`）。
 * 于是「换一部片」= 改 4 个文件里的数字，而校验阈值本身也写死在被校验的脚本里
 * （`verify-reference-sample` / `verify-authored-shots` 把 44/8/每组 6/G8=2 钉在源码里）。
 * 这正是本仓库反复出事的形状：**校验对象和校验阈值是两份独立硬编码**。
 * 论述与后果见 `docs/knowledge/agent-protocol.md` §3.1、§7。
 *
 * ⚠ 这道 pin 由 `scripts/verify-limits.mjs` 守着（在 `verify:fast` 里）：
 *    把任何一处调用改回本地字面量，那道门就红。
 */

/** 每组镜头数默认值：与上游样片口径一致（44 镜 / 8 组 = 前 7 组各 6 + 末组 2）。 */
export const DEFAULT_MAX_SHOTS_PER_GROUP = 6;

/**
 * 每镜 still **基础**采样点数（= 下限）。真源是 `scripts/still-benchmark.mjs:16-23` 的采样表达式
 * （from / +1 / 25% / 55% / to−8 / to 六个点），`extendStillFrames` 第一步按 `new Set` 去重，
 * 短镜头去重后可能不足 6 —— 那正是 `verify-still-benchmark` 该报「少于下限」的地方。
 * `blueprint.shots[].still_kinds` 与 `constraints.six_stills_per_shot` 数的是同一个 6，
 * 所以改采样必须同步这里，否则蓝图门会对着一个已不存在的数量断言（`verify-limits.mjs` D 段守它）。
 */
export const STILL_FRAMES_PER_SCENE = 6;

/**
 * 高光镜头（`SHOT_RECIPE.highlight === true`）的 still 帧数**下限**。
 * 对齐上游 `anything2explainer/reference/agent-build-rules.md:51`：「每个镜头至少出 6 张 still …
 * 高光时刻镜头出 ≥10 张 still 覆盖扫光 / 白闪 / glitch 三段」。
 * ⚠ 这是下限而不是上限 —— 上游没有给上限，本仓库也不发明一个。
 *    判「恰好 6」会把这条要求直接打回，所以 `verify-still-benchmark` 判的是 `>= stillFramesMin(...)`。
 *    参考片 44 个 authored 镜头**没有一个**声明 `highlight`，所以这条分支目前只由
 *    `verify-limits.mjs` E 段的临时夹具跑到，没有真镜头走过。
 */
export const STILL_FRAMES_HIGHLIGHT_MIN = 10;

/** 每组镜头数的环境变量名。 */
export const MAX_SHOTS_PER_GROUP_ENV = "MAX_SHOTS_PER_GROUP";

/** 读 `MAX_SHOTS_PER_GROUP`，正整数校验写在取值的地方，不写在每个调用处。 */
export function maxShotsPerGroup(env = process.env) {
  const raw = env[MAX_SHOTS_PER_GROUP_ENV];
  const value = raw === undefined || raw === "" ? DEFAULT_MAX_SHOTS_PER_GROUP : Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${MAX_SHOTS_PER_GROUP_ENV} must be a positive integer, got ${JSON.stringify(raw)}`);
  }
  return value;
}

/**
 * 镜头号（1-based，取自 `scene-007` / `SC07` 尾部数字）→ 组 id。
 * 与「按 IR 顺序每 N 个一组」等价的前提是 scene_id 连续且按序 —— 三处分组都满足
 * （`build-groups.mjs` 与 `materialize-shots.mjs` 切 `ir.scenes`，`verify-shots.mjs` 反推文件路径）。
 * `verify-limits.mjs` 用「切块」与「逐号反推」两种算法对每组 1..8 × 总镜数 1..48 全量对账，不靠这个前提成立。
 */
export function groupIdOf(shotNumber, perGroup = maxShotsPerGroup()) {
  if (!Number.isInteger(shotNumber) || shotNumber < 1) {
    throw new Error(`groupIdOf needs a 1-based integer shot number, got ${JSON.stringify(shotNumber)}`);
  }
  return "G" + (Math.floor((shotNumber - 1) / perGroup) + 1);
}

/** 镜头数 → 组数，等价于 `Math.ceil(total / perGroup)`，写成一处免得四处各配一个上取整。 */
export function groupCountOf(totalShots, perGroup = maxShotsPerGroup()) {
  if (!Number.isInteger(totalShots) || totalShots < 0) {
    throw new Error(`groupCountOf needs a non-negative integer, got ${JSON.stringify(totalShots)}`);
  }
  return Math.ceil(totalShots / perGroup);
}

/**
 * 期望的每组镜头数分布：前 `groupCount-1` 组装满 `perGroup`，末组装余数。
 * 蓝图里每组的条数必须与这个数组逐项相等 —— 这样 24 镜 / 4 组、30 镜 / 6 组、
 * 44 镜 / 8 组都走同一条判据，不需要为新片改门禁脚本。
 */
export function expectedGroupSizes(totalShots, perGroup = maxShotsPerGroup()) {
  const count = groupCountOf(totalShots, perGroup);
  const sizes = [];
  let left = totalShots;
  for (let i = 0; i < count; i++) {
    const size = Math.min(perGroup, left);
    sizes.push(size);
    left -= size;
  }
  return sizes;
}
