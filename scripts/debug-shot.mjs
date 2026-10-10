import fs from "node:fs";
import path from "node:path";
import {run as spawn, runAsync} from "../src/runtime/spawn.mjs";

/**
 * 镜头级调试闭环：只渲染一个镜头的片段 → 抽成 PNG 帧 → 只对该镜头跑真判据。
 *
 * 为什么要有这个文件：全片渲染是这条流程里最贵的一步（双比例 ~40 分钟），
 * 但调效果时 99% 的改动只影响一两个镜头。这里把「镜头号」直接映射成
 * 「片段渲染 + 抽帧 + frame_metrics/motion_check 单镜头判定」，把日常循环压到分钟级。
 *
 * 判据一行都没重写：frame_metrics.py / motion_check.py 只吃 PNG 帧目录 + render-ir，
 * 所以把 render-ir 裁成只留目标镜头、帧目录只放这个镜头区间的帧，就等于让它们
 * 按完全相同的口径判这一个镜头 —— 单镜头结论和全片跑出来的那个镜头结论同源。
 *
 * 用法：
 *   npm run debug:shot -- scene-001
 *   npm run debug:shot -- scene-012 9x16
 *   npm run debug:shot -- scene-012 --ratio 9x16   （PowerShell 下 flag 可能被 npm 吞掉，用位置参数更稳）
 *
 * 产物（artifacts/ 已被 .gitignore 忽略）：
 *   artifacts/debug/<ratio>/<scene-id>/frames/         抽好的 PNG 帧，可直接翻看画面
 *   artifacts/debug/<ratio>/<scene-id>/frame_metrics.json
 *   artifacts/debug/<ratio>/<scene-id>/motion.json
 */

const argv = process.argv.slice(2);
const RATIOS = ["16x9", "9x16"];
const isRatio = (a) => RATIOS.includes(a);

// npm 转发 `--ratio` 这类 flag 在 Windows/PowerShell 下并不可靠：实测 `npm run x -- a --ratio b`
// 到脚本时 `--ratio` 已被吞掉、只剩裸值 b（`--ratio=9x16` 同样会被吞）。所以画幅同时接受
// `--ratio 9x16`、`--ratio=9x16` 与位置参数 `9x16` 三种写法，镜头号取第一个非画幅的位置参数。
const eqRatio = argv.find((a) => a.startsWith("--ratio="));
const ratioFlagAt = argv.indexOf("--ratio");
const positional = argv.filter((a) => !a.startsWith("--"));
const sceneId = positional.find((a) => !isRatio(a));
const ratio =
  (eqRatio ? eqRatio.slice("--ratio=".length) : ratioFlagAt >= 0 ? argv[ratioFlagAt + 1] : undefined) ||
  positional.find(isRatio) ||
  "16x9";

if (!sceneId) {
  console.error("用法：npm run debug:shot -- <scene-id> [--ratio 16x9|9x16]（画幅也可写成位置参数：… <scene-id> 9x16）");
  process.exit(2);
}
if (!isRatio(ratio)) {
  console.error(`画幅只支持 16x9 / 9x16（收到 ${ratio}）`);
  process.exit(2);
}

const irPath = `fixtures/render-ir-${ratio}.json`;
const ir = JSON.parse(fs.readFileSync(irPath, "utf8"));
const scene = (ir.scenes || []).find((s) => s.id === sceneId);
if (!scene) {
  const ids = (ir.scenes || []).map((s) => s.id).join(", ");
  console.error(`${irPath} 里没有镜头 ${sceneId}。现有镜头：${ids}`);
  process.exit(2);
}

const fps = Number(ir.fps || 30);
// 与 frame_metrics/motion_check 里的 scene_range 同口径：起始帧四舍五入，结束帧上取整再 -1。
const start = Math.round(Number(scene.start) * fps);
const end = Math.max(start, Math.ceil((Number(scene.start) + Number(scene.duration)) * fps) - 1);
const composition = `ReelForge${ratio}`;

const work = path.join("artifacts", "debug", ratio, sceneId);
const rawDir = path.join(work, "raw");
const framesDir = path.join(work, "frames");
const trimmedIr = path.join(work, "render-ir.json");
const outMetrics = path.join(work, "frame_metrics.json");
const outMotion = path.join(work, "motion.json");

// 只清自己这一格（artifacts/debug/<ratio>/<scene-id>），不碰别处产物。
fs.rmSync(work, {recursive: true, force: true});
fs.mkdirSync(rawDir, {recursive: true});
fs.mkdirSync(framesDir, {recursive: true});

console.log(
  `debug:shot ${sceneId} @ ${ratio} —— 帧 ${start}-${end}（${((end - start + 1) / fps).toFixed(1)}s，共 ${end - start + 1} 帧）`,
);

const render = spawn(
  "npx",
  [
    "remotion",
    "render",
    "src/remotion/index.jsx",
    composition,
    rawDir,
    "--sequence",
    "--image-format=png",
    `--frames=${start}-${end}`,
    "--log=error",
  ],
  {stdio: "inherit"},
);
if (render.error) {
  console.error("remotion 起不来: " + render.error + "（依赖没装？先 npm install）");
  process.exit(127);
}
if (render.status !== 0) process.exit(render.status ?? 1);

// Remotion 的序列输出按「真实帧号」命名（element-<frame>.png），而 frame_metrics/motion_check
// 的既有口径是「文件名里的编号 = 真实帧号 + 1」（render.sh 的 ffmpeg 抽帧从 f_0001 起，
// 脚本里再统一 -1 换回真实帧号）。这里改写成 f_<frame+1>.png，让单镜头判据与全片判据
// 共用同一套帧号换算 —— 否则镜头边界会整体差一帧，且这个偏差不会报错，只会静默少判一帧。
//
// 补零宽度覆盖本片段的最大帧号，与 render.sh 的 f_%04d 保持同一命名风格。判据现在按帧号
// 数值排序、不再依赖补零宽度，这里补零只是让单镜头产物和全片产物长得一致、便于对照。
const rawFiles = fs.readdirSync(rawDir).filter((n) => n.toLowerCase().endsWith(".png"));
if (!rawFiles.length) {
  console.error(`${rawDir} 里没有 PNG —— remotion 序列没有渲染出来`);
  process.exit(1);
}
const pad = String(end + 1).length;
for (const name of rawFiles) {
  const frame = Number(name.replace(/\D/g, ""));
  fs.renameSync(path.join(rawDir, name), path.join(framesDir, `f_${String(frame + 1).padStart(pad, "0")}.png`));
}
fs.rmSync(rawDir, {recursive: true, force: true});

fs.writeFileSync(trimmedIr, JSON.stringify({...ir, scenes: [scene]}, null, 2));

// 两个判据互不依赖、都只读同一批帧，串行跑等于白等一份时间（纯 stdlib 解码 PNG 是这条
// 闭环里最慢的一段：单镜头 268 帧实测 frame_metrics 66s + motion_check 52s）。并发跑，
// 输出按脚本分组打印，避免两路 stdout 交错。
const [metrics, motion] = await Promise.all([
  runAsync("node", ["scripts/py.mjs", "scripts/frame_metrics.py", "--frames", framesDir, "--render-ir", trimmedIr, "--out", outMetrics]),
  runAsync("node", ["scripts/py.mjs", "scripts/motion_check.py", "--frames", framesDir, "--render-ir", trimmedIr, "--report", outMotion]),
]);

console.log("");
let ok = true;
for (const [label, res, file] of [
  ["frame_metrics", metrics, outMetrics],
  ["motion_check", motion, outMotion],
]) {
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) {
    console.error(`${label} 起不来: ${res.error}`);
    process.exit(127);
  }
  const pass = res.status === 0;
  ok = ok && pass;
  console.log(`${label}: ${pass ? "PASS" : "FAIL"}  → ${file}`);
}
console.log(`帧目录（可直接翻看画面）: ${framesDir}`);
process.exit(ok ? 0 : 1);