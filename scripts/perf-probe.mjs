import {run} from "../src/runtime/spawn.mjs";
import fs from "node:fs";

/**
 * 30 帧测渲性能门（a2e BUILD_RULES §4/§6 的等价物）：
 * 渲染速度是生产力的一部分 —— 重口味效果（大 blur / 巨量 DOM / 堆 SVG filter）
 * 会让全片渲染慢 10–50 倍，等真渲染才发现就晚了。门限 ≥3fps 与 a2e 一致
 * （本片 13235 帧 40 分钟 ≈ 5.5fps，正常区间 3–12）。
 *
 * 帧段固定 2400–2429（SC07 pipeline3 全要素区，icon/box/箭头/进度条都有），
 * 不要挑空场景 —— 那样测的是启动时间不是渲染成本。
 *
 * ⚠ 测量须在空闲机器上跑：与其他渲染并行时 CPU 抢占会假阴。
 */
const FRAMES = "2400-2429";
const OUT = "/tmp/reel-perf-probe";
fs.rmSync(OUT, {recursive: true, force: true});

const t0 = Date.now();
const r = run("npx", ["remotion", "render", "src/remotion/index.jsx", "ReelForge16x9", OUT,
  "--frames=" + FRAMES, "--image-format=jpeg", "--concurrency=4", "--timeout=300000", "--log=error"], {stdio: "inherit"});
const ms = Date.now() - t0;
if (r.status !== 0) {
  console.error("perf-probe FAIL: render exit=" + r.status);
  process.exit(1);
}
const fps = 30 / (ms / 1000);
console.log(`perf-probe: 30 frames in ${(ms / 1000).toFixed(1)}s = ${fps.toFixed(2)} fps`);
fs.rmSync(OUT, {recursive: true, force: true});
if (fps < 3) {
  console.error("perf-probe FAIL: <3fps —— 查新加的 blur/DOM 规模/SVG filter（BUILD_RULES §4 红线）");
  process.exit(1);
}
console.log("perf-probe PASS");
