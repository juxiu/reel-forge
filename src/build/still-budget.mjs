import fs from "node:fs";
import path from "node:path";
import {STILL_FRAMES_HIGHLIGHT_MIN, STILL_FRAMES_PER_SCENE, groupIdOf} from "./limits.mjs";

/**
 * 「这一镜是高光吗」的唯一实现。
 *
 * 为什么要有这个文件：`still-benchmark.mjs`（生产者）与 `verify-still-benchmark.mjs`（门）
 * 必须对同一件事判定一致 —— 生产者按它决定出几张 still，门按它决定下限是 6 还是 10。
 * 两边各写一遍就是「校验对象和校验阈值两份独立硬编码」的又一个形状（论述见
 * `docs/knowledge/agent-protocol.md` §3.1、§4）。
 *
 * 真源是 authored 镜头源文件里的 `SHOT_RECIPE.highlight === true`：它已经是渲染层认的那个键
 * （`src/shots/plan.mjs:344` 用它决定 set piece），所以「画面把它当高光」与「still 计划按高光出帧」
 * 用的是同一个开关。IR 里没有这个字段，`contracts/*.schema.json` 的 `additionalProperties:false`
 * 也不接受新字段，所以不往 IR 上加。
 *
 * ⚠ 文件不存在时返回 `false`（= 按 6 判），不抛。这让 still-benchmark 仍能服务于
 *    「还没有 authored 镜头文件」的 IR；代价是**镜头文件缺失时高光要求会静默消失**。
 *    `verify:shots` 是要求那些文件存在的（`scripts/verify-shots.mjs:19`），所以生产链上
 *    「缺文件」本身会红，不会只让 still 降级。
 */

/** authored 镜头源文件路径：`src/shots/Gn/SCxx.jsx`，组名由分组公式给（`limits.mjs:groupIdOf`）。 */
export function shotSourcePath(shotNumber, shotsRoot = "src/shots") {
  return path.join(shotsRoot, groupIdOf(shotNumber), "SC" + String(shotNumber).padStart(2, "0") + ".jsx");
}

/** 读该镜头源文件的 `highlight` 键；没有文件、没有该键、或写成 `false` 都算非高光。 */
export function isHighlightShot(shotNumber, shotsRoot = "src/shots") {
  const file = shotSourcePath(shotNumber, shotsRoot);
  if (!fs.existsSync(file)) return false;
  return /\bhighlight\s*:\s*true\b/.test(fs.readFileSync(file, "utf8"));
}

/** 该镜的 still 帧数**下限**：非高光 `STILL_FRAMES_PER_SCENE`，高光 `STILL_FRAMES_HIGHLIGHT_MIN`。 */
export function stillFramesMin(shotNumber, shotsRoot = "src/shots") {
  return isHighlightShot(shotNumber, shotsRoot) ? STILL_FRAMES_HIGHLIGHT_MIN : STILL_FRAMES_PER_SCENE;
}

/**
 * 在基础采样点之外补足到高光下限：在相邻基础点的中点处补，跳过已存在的号，取够即停。
 * 纯函数，便于 `verify-limits.mjs` 直接对它做断言（不需要碰盘）。
 */
export function extendStillFrames(frames, minFrames) {
  const base = [...new Set(frames)];
  if (base.length >= minFrames) return base.sort((a, b) => a - b);
  const extra = [];
  for (let i = 0; i < base.length - 1 && base.length + extra.length < minFrames; i++) {
    const mid = Math.round((base[i] + base[i + 1]) / 2);
    if (!base.includes(mid) && !extra.includes(mid) && mid > base[i] && mid < base[i + 1]) extra.push(mid);
  }
  // 中点用尽仍不够（镜头太短）时贴着末帧补号；末帧不允许越过。
  for (let f = base[base.length - 1] - 1; extra.length + base.length < minFrames && f > base[0]; f--) {
    if (!base.includes(f) && !extra.includes(f)) extra.push(f);
  }
  return [...new Set([...base, ...extra])].sort((a, b) => a - b);
}
