import fs from "node:fs";
import path from "node:path";
import {run} from "../src/runtime/spawn.mjs";

/**
 * 视觉契约门禁：证明 fixtures/visual_contracts.json 里的数确实来自渲染层，而不是另一份手抄表。
 *
 * 三件事，缺一就是假门禁：
 *   1) contracts 与代码不漂移（导出脚本自己重算一遍再逐字节比）；
 *   2) 迁进 field.mjs 的常量在别处没有第二处定义 —— 有第二处就等于没统一；
 *   3) 把 box-shadow 改成数据驱动之后，渲染出来的 CSS 字符串一个字符都没变。
 *      第 3 条靠一份**故意冻结**的旧字面量来验；这份副本只活在门禁里，
 *      渲染层读的是 glowCss(spec)，所以它不会变成第四个真源。
 */

const failures = [];
const ok = (name, pass, detail) => {
  if (!pass) failures.push({check: name, detail});
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${detail && !pass ? " — " + detail : ""}`);
};

// ---- 1) 漂移检查 ----
const check = run("node", ["scripts/export-visual-contracts.mjs", "--check"]);
const checkOut = [check.stdout, check.stderr].filter(Boolean).map(String).join("\n").trim();
ok("contracts == code", check.status === 0, checkOut || `exit ${check.status}`);

if (!fs.existsSync("fixtures/visual_contracts.json")) {
  console.error("verify:visual-contracts FAIL — fixtures/visual_contracts.json 不存在");
  process.exit(1);
}
const contracts = JSON.parse(fs.readFileSync("fixtures/visual_contracts.json", "utf8"));

// ---- 2) 单一真源 ----
/** 这些常量只允许在 owner 文件里定义；其余文件只能 import / re-export。 */
const OWNED = {
  DOT_FIELD: "src/visual/field.mjs",
  STAR_FIELD: "src/visual/field.mjs",
  SET_PIECE: "src/visual/field.mjs",
  GLOW_PURPLE_SPEC: "src/visual/field.mjs",
  HERO_MEASURE: "src/visual/field.mjs",
  SOFT_GLOW: "src/visual/field.mjs",
  PURPLE_DEBRIS: "src/visual/field.mjs",
  MOTION: "src/visual/field.mjs",
  EMPTY_FIELD: "src/visual/field.mjs",
  LUMA: "src/visual/field.mjs",
  CAMERA_LIMITS: "src/visual/camera.mjs",
  BEAT_WINDOW: "src/visual/style.mjs",
  HERO_MIN: "src/visual/style.mjs",
  TEXT_MIN: "src/visual/style.mjs",
  SUBJECT_SMALL: "src/visual/style.mjs",
};

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(mjs|jsx)$/.test(entry.name)) files.push(p.replace(/\\/g, "/"));
  }
};
walk("src");

const defs = new Map(); // 常量名 → 定义它的文件列表
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const [, name] of text.matchAll(/^[ \t]*export\s+(?:const|let|var)\s+([A-Z][A-Z0-9_]*)\s*=/gm)) {
    if (!OWNED[name]) continue;
    if (!defs.has(name)) defs.set(name, []);
    defs.get(name).push(file);
  }
  // 幕底/时序参数若在组件里另写字面量（step: 48 / hold 30 / 110 主体），也算第二处定义。
  const inline = {DOT_FIELD: /step:\s*48\b/, SET_PIECE: /sweeps:\s*\[4,\s*22,\s*40\]/};
  for (const [name, rx] of Object.entries(inline)) {
    if (file === OWNED[name] || !rx.test(text)) continue;
    if (!defs.has(name)) defs.set(name, []);
    defs.get(name).push(file + "(inline literal)");
  }
}

for (const [name, owner] of Object.entries(OWNED)) {
  const found = defs.get(name) || [];
  ok(`single source: ${name}`, found.length === 1 && found[0] === owner, `定义于 ${found.join(", ") || "(无)"}，期望仅 ${owner}`);
}

// ---- 3) CSS 回归锁 ----
const {glowCss, bloomCss, GLOW_PURPLE_SPEC, GLOW_PURPLE_S_SPEC, GLOW_ORANGE_SPEC, GLOW_RED_SPEC, BLOOM_SPEC} = await import("../src/visual/field.mjs");
const {GLOW_PURPLE, GLOW_PURPLE_S, GLOW_ORANGE, GLOW_RED, BLOOM} = await import("../src/visual/style.mjs");
const FROZEN = {
  GLOW_PURPLE: "0 0 12px 3px rgba(102,45,248,.35), 0 0 42px 14px rgba(102,45,248,.45)",
  GLOW_PURPLE_S: "0 0 8px 2px rgba(102,45,248,.32), 0 0 24px 8px rgba(102,45,248,.38)",
  GLOW_ORANGE: "0 0 12px 3px rgba(240,95,65,.35), 0 0 42px 14px rgba(240,95,65,.42)",
  GLOW_RED: "0 0 12px 3px rgba(236,8,31,.35), 0 0 42px 14px rgba(236,8,31,.42)",
  BLOOM: "drop-shadow(0 0 3px rgba(255,255,255,.5))",
};
ok("glow css unchanged", GLOW_PURPLE === FROZEN.GLOW_PURPLE && glowCss(GLOW_PURPLE_SPEC) === FROZEN.GLOW_PURPLE, GLOW_PURPLE);
ok("glow_s css unchanged", GLOW_PURPLE_S === FROZEN.GLOW_PURPLE_S && glowCss(GLOW_PURPLE_S_SPEC) === FROZEN.GLOW_PURPLE_S, GLOW_PURPLE_S);
ok("orange/red/bloom css unchanged", GLOW_ORANGE === FROZEN.GLOW_ORANGE && GLOW_RED === FROZEN.GLOW_RED && BLOOM === FROZEN.BLOOM && glowCss(GLOW_ORANGE_SPEC) === FROZEN.GLOW_ORANGE && glowCss(GLOW_RED_SPEC) === FROZEN.GLOW_RED && bloomCss(BLOOM_SPEC) === FROZEN.BLOOM);

// ---- 4) contracts 自洽：JSON 里的数必须还能从代码取到 ----
const {CAMERA_LIMITS} = await import("../src/visual/camera.mjs");
ok("contracts hold == CAMERA_LIMITS.clear", contracts.measure.motion.hold_min_frames === CAMERA_LIMITS.clear, `${contracts.measure.motion.hold_min_frames} vs ${CAMERA_LIMITS.clear}`);
ok("contracts hero_min 与渲染层一致", contracts.typography.HERO_MIN === 170 && contracts.canvas.ratios["16x9"].limits_device.hero_min === 170, JSON.stringify(contracts.canvas.ratios["16x9"].limits_device));
ok("两种画幅都有取景区", ["16x9", "9x16"].every((r) => contracts.canvas.ratios[r]?.qc_zone?.sample?.bottom > contracts.canvas.ratios[r]?.qc_zone?.sample?.top), Object.keys(contracts.canvas.ratios || {}).join(","));
ok("9:16 设备像素下限按 s 折算", Math.abs(contracts.canvas.ratios["9x16"].limits_device.hero_min - 170 * (720 / 1280)) < 0.01, String(contracts.canvas.ratios["9x16"].limits_device.hero_min));

if (failures.length) {
  console.error("verify:visual-contracts FAIL", JSON.stringify({failed: failures.length, checks: failures}, null, 2));
  process.exit(1);
}
console.log("verify:visual-contracts PASS", JSON.stringify({owned_constants: Object.keys(OWNED).length, ratios: Object.keys(contracts.canvas.ratios)}));
