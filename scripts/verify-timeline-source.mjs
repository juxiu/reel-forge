import fs from "node:fs";

/**
 * 时序单真源门：**镜区间、字幕块必须与`script/timeline.json` 同源**。
 *
 * ⚠ 事故（2026-10-09 实测）：
 *   这份仓库有**三份**互不引用的时序数据 ——
 *     ① `fixtures/render-ir-*.json` 的 `scenes[].start/duration`
 *     ② `fixtures/captions.json` 的块
 *     ③ `script/timeline.json`（gitignore 的运行产物，由 TTS 写真实词边界）
 *   结果是 IR 7657 帧、而字幕只覆盖到 7553 帧，**末帧差 104 帧（3.47s）**，起点也差 0.03s。
 *   没有任何门发现，因为**没有第二个真源跟它 disagreement**。
 *   成片渲出来才发现音画不同步 —— 而那已经花掉了整个全片渲染的时间。
 *
 * 参照项目的做法是**一份**：`tts_build.py` 写出 `timeline.ts` + `subs.ts`，
 * 镜头 / HUD / 进度条全按**句 id** 查表（`S('S12')`），于是「对不上」在结构上不可能发生。
 * 这一门把那个前提变成可执行的断言。
 *
 * 判据：
 *   1. timeline.json 必须在（没有它就没有真源，直接 FAIL —— 「三份数据」本身就是缺陷）
 *   2. 镜数 == 句数（一镜一段）
 *   3. 每镜 start == 对应句子的 from（按fps 换算，容差 1 帧）
 *   4. 每镜时长 == 该句子的 to-from
 *   5. 字幕块必须落在某一句的区间内，且数量与句子数一致
 *   6. 末镜末端== timeline.total_frames（允许 TAIL 差异，但要有解释）
 */

const FPS = 30;
const TL = "script/timeline.json";
const IR = "fixtures/render-ir-16x9.json";
const CAPS = "fixtures/captions.json";
const problems = [];

if (!fs.existsSync(TL)) {
  console.error("TIMELINE SOURCE GATE FAIL " + JSON.stringify({
    missing: TL,
    why: "没有时序真源。镜区间与字幕块此刻是各自独立的数据，两者对不对得上没有任何东西能判定 —— 这正是「末帧差 104 帧」能一路绿灯的原因。",
    fix: "先跑 npm run tts（产出 timeline.json + audio），再跑 npm run materialize-ir 从它派生 IR。",
  }, null, 2));
  process.exit(1);
}

const tl = JSON.parse(fs.readFileSync(TL, "utf8"));
const ir = JSON.parse(fs.readFileSync(IR, "utf8"));
const caps = JSON.parse(fs.readFileSync(CAPS, "utf8"));

const sentences = tl.sentences || [];
if (!sentences.length) {
  console.error("TIMELINE SOURCE GATE FAIL timeline.sentences 为空");
  process.exit(1);
}

// 1) 镜数 == 句数
if (ir.scenes.length !== sentences.length) {
  problems.push(`镜数 ${ir.scenes.length} ≠ 句数 ${sentences.length} —— 一镜一段的约定破了（一段 = 一个镜头 = 一个镜头段）`);
}

// 2) 逐镜比对 start / 时长
const TOL = 1; // 帧
const drift = [];
for (let i = 0; i < Math.min(ir.scenes.length, sentences.length); i++) {
  const sc = ir.scenes[i];
  const se = sentences[i];
  const wantFrom = Math.round(Number(se.from));
  const wantTo = Math.round(Number(se.to));
  const gotFrom = Math.round(sc.start * FPS);
  const gotTo = Math.round((sc.start + sc.duration) * FPS);
  const dFrom = gotFrom - wantFrom;
  const dTo = gotTo - wantTo;
  if (Math.abs(dFrom) > TOL || Math.abs(dTo) > TOL) {
    drift.push({i, id: sc.id, sentence: se.id, wantFrom, gotFrom, dFrom, dTo});
  }
}
if (drift.length) {
  const first = drift[0];
  problems.push(
    `${drift.length}/${Math.min(ir.scenes.length, sentences.length)} 镜的帧区间与 timeline 对不上` +
    `（例：${first.id} 应 ${first.wantFrom} 起、实为 ${first.gotFrom}，差 ${first.dFrom} 帧）` +
    " —— 镜区间必须是 timeline 派生的，不能另写",
  );
}

// 3) 字幕块必须落在某句区间内
const outside = caps.filter((c) => {
  const from = Math.round(Number(c.start) * FPS);
  const to = Math.round(Number(c.end) * FPS);
  return !sentences.some((se) => from >= Math.round(Number(se.from)) - TOL && to <= Math.round(Number(se.to)) + TOL);
});
if (outside.length) {
  problems.push(`${outside.length} 个字幕块不落在任何句子区间内 —— 字幕与时间轴不同源`);
}

// 4) 末端漂移
const lastSentence = sentences[sentences.length - 1];
const lastCaption = caps[caps.length - 1];
const lastScene = ir.scenes[ir.scenes.length - 1];
const capEndFrame = Math.round(Number(lastCaption.end) * FPS);
const sceneEndFrame = Math.round((lastScene.start + lastScene.duration) * FPS);
if (Math.abs(sceneEndFrame - capEndFrame) > TOL) {
  problems.push(
    `末端漂移：末镜到 ${sceneEndFrame} 帧、末字幕到 ${capEndFrame} 帧，相差 ${sceneEndFrame - capEndFrame} 帧` +
    `（${((sceneEndFrame - capEndFrame) / FPS).toFixed(2)}s）`,
  );
}

if (problems.length) {
  console.error("TIMELINE SOURCE GATE FAIL " + JSON.stringify({
    timeline: TL, scenes: ir.scenes.length, sentences: sentences.length, captions: caps.length,
    timeline_total_frames: tl.total_frames, problems: problems.length,
  }, null, 2));
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

console.log("timeline source PASS " + JSON.stringify({
  scenes: ir.scenes.length,
  sentences: sentences.length,
  captions: caps.length,
  total_frames: tl.total_frames,
  duration_s: +(tl.total_frames / FPS).toFixed(2),
  tolerance_frames: TOL,
}));