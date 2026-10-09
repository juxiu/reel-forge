import fs from "node:fs";
import path from "node:path";
import {run, resolveBin} from "../src/runtime/spawn.mjs";

/**
 * 分镜表这条链（render_storyboard.py → selfcheck.py）用合成时间轴真跑一遍。
 *
 * 为什么必须有这门：`npm run selfcheck` 读的是**运行产物**（分镜表.md、script/timeline.json，
 * 都在 .gitignore 里），本地不跑 TTS 就没有输入，CI 又只在能联网时才跑得到。
 * 结果是这两条脚本在本仓库里从来没有被执行过一遍 —— 而 CI 上一次真实失败恰好就是它
 * （docs/EXECUTION_LOG.md：run 37747763804 在 npm run selfcheck 挂掉）。
 * 这里把输入换成合成时间轴，每条判据都用变异输入钉住：判据失效时门必须变红。
 *
 * 变异锚点写的是分镜源里的原句。锚点对不上时这里直接判失败，而不是「静默少测一条」——
 * 分镜表改版后门禁最容易变成的样子就是：全绿，但一条判据都没执行。
 */

const SANDBOX = path.join("artifacts", "storyboard-selftest");
const PY = process.env.PYTHON || "python3";
const SOURCE = "script/storyboard_src.md";
const failed = [];

fs.mkdirSync(SANDBOX, {recursive: true});

const out = (r) => `${r.stdout || ""}${r.stderr || ""}`.trim();
const sourceText = () => fs.readFileSync(SOURCE, "utf8");

/** 把分镜源里某一处子串换掉（只换第一次出现，逐行找）。 */
function mutate(find, replace) {
  const text = sourceText();
  if (!text.includes(find)) throw new Error(`分镜源里没有「${find}」：变异锚点过期了，这条判据现在测不到任何东西`);
  return text.replace(find, replace);
}

/**
 * 合成时间轴：**从分镜源自己推导**句子与章节，而不是写死 4 句。
 *
 * ⚠ 为什么要推导：这份时间轴的职责是「给仓库里那份分镜源配一个说得通的输入」，
 *   而分镜源会随样片一起改（4 镜 → 44 镜）。写死 4 句时，样片一改大，
 *   所有用例都退化成「时间轴没有句子 S05」这一条 —— 判据全测不到，门禁却只显示几条失败，
 *   看起来像是分镜有问题，实际是自测输入过期了。现在句数与章节数跟着源走，
 *   换片子也不用改这里。
 *
 * 每句 220 帧（≥120 帧下限的两倍余量），句间 20 帧；章节从 `# CHAPTER` / `## Gn` 读。
 */
function deriveTimelineFromSource() {
  const text = sourceText();
  const ids = [...new Set([...text.matchAll(/\{(S\d+)\.(?:from|to|c\d)/g)].map((m) => m[1]))].sort();
  const n = Math.max(1, ids.length);
  const per = 220;
  const sentences = ids.map((id, i) => {
    const from = 1 + i * (per + 20);
    return {id, from, to: from + per - 1, chapter: chapterOfShot(i)};
  });
  const chapters = [];
  for (let c = 1; c <= maxChapter; c++) {
    const first = sentences.find((s) => s.chapter === c);
    chapters.push({n: c, title: "", from: first ? first.from : 1});
  }
  return {
    fps: 30,
    total_frames: (sentences.at(-1)?.to ?? 820) + 40,
    engine: "synthetic",
    voice: "synthetic",
    rate: "+0%",
    language: "zh",
    timing_mode: "tts-word-boundary",
    speech_seconds: +((sentences.at(-1)?.to ?? 820) / 30).toFixed(2),
    chapters,
    sentences,
  };
}

/** 第 i 镜属于第几章：按分镜源里 `## Gn` 的出现顺序与 `## 全局约束` 推定。 */
function shotChapterMap() {
  const text = sourceText();
  const marks = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s*G\d+\s*$/.test(line)) marks.push({kind: "group"});
    if (/^\|\s*SC\d+\s*\|/.test(line)) marks.push({kind: "shot"});
  }
  // 组数 → 章数：每 2 个构建组一章（与 src/shots 的分组密度一致）
  let groups = 0;
  const chapterOf = [];
  for (const m of marks) {
    if (m.kind === "group") groups += 1;
    else chapterOf.push(Math.min(maxChapter, Math.ceil(groups / 2) || 1));
  }
  return chapterOf;
}
const maxChapter = 4;
const chapterOf = shotChapterMap();
function chapterOfShot(i) {
  return chapterOf[i] ?? 1;
}

/** 合成时间轴：句子与章节由分镜源推导，每句 220 帧（≥120 下限）。 */
function timeline(overrides = {}) {
  return {...deriveTimelineFromSource(), ...overrides};
}

/**
 * 在推导出的时间轴上只改一句，并把后面的句整体接上去。
 *
 * ⚠ 为什么要重建而不是手写四句：手写的句子列表与分镜源里的 S 数量绑定，
 *   样片从 4 镜变成 44 镜之后，三条用例（镜头过短 / 帧号漂移 / 覆盖不符）
 *   全部退化成「时间轴没有句子 S05」——判据没被执行，而失败信息看着像分镜坏了。
 *   现在这三条只声明「改哪一句、改成什么」，句数与章节跟着源走。
 */
function timelineWith(id, fn) {
  const tl = deriveTimelineFromSource();
  const GAP = 20;
  let f = 1;
  const sentences = tl.sentences.map((s) => {
    const len = s.to - s.from + 1;
    let cur = {...s, from: f, to: f + len - 1};
    if (s.id === id) cur = fn(cur, len);
    f = cur.to + 1 + GAP;
    return cur;
  });
  const chapters = [];
  for (let c = 1; c <= maxChapter; c++) {
    const first = sentences.find((s) => s.chapter === c);
    if (first) chapters.push({n: c, title: "", from: first.from});
  }
  return {...tl, sentences, chapters, total_frames: f + 40};
}

function py(script, args = []) {
  return run(PY, [path.join("scripts", script), ...args], {
    env: {...process.env, PYTHONIOENCODING: "utf-8"},
    encoding: "utf8",
  });
}

/**
 * 跑一次完整链。src 可以是仓库里的分镜源文件，也可以是变异出来的副本。
 *   tl         渲染分镜表用的时间轴
 *   checkTl    selfcheck 读到的时间轴；不给就和 tl 一样（= 两者天然一致的正常情况）
 *              为什么要能分开：`timeline mismatch` 这条判据检查的就是「分镜表的帧号 ≠ 时间轴的帧号」，
 *              而分镜表本身就是从时间轴渲染出来的 —— 用同一份输入永远测不到它。
 * @returns {{render: object, check: object, storyboardFile: string}}
 */
function produce({caseName, tl = timeline(), checkTl = null, rawCheckTl = null, srcText = null, skipRender = false, removeTimeline = false}) {
  const srcFile = path.join(SANDBOX, `src-${caseName}.md`);
  fs.writeFileSync(srcFile, srcText ?? sourceText(), "utf8");
  const timelineFile = path.join(SANDBOX, `timeline-${caseName}.json`);
  const storyboardFile = path.join(SANDBOX, `storyboard-${caseName}.md`);
  fs.writeFileSync(timelineFile, JSON.stringify(tl), "utf8");
  const render = skipRender
    ? {status: 0, stdout: "", stderr: ""}
    : py("render_storyboard.py", ["--timeline", timelineFile, "--src", srcFile, "--out", storyboardFile]);
  // 删掉的是**输入**，不是输出：no-timeline 这条要测的是「分镜表都在，时间轴没了」，
  // 而不是「两个都没有」—— 后者只会被第一条 missing artifact 检查挡住，永远测不到时间轴那个提示。
  if (removeTimeline) fs.rmSync(timelineFile, {force: true});
  else if (rawCheckTl != null) fs.writeFileSync(timelineFile, rawCheckTl, "utf8");
  else if (checkTl) fs.writeFileSync(timelineFile, JSON.stringify(checkTl), "utf8");
  const check = py("selfcheck.py", ["--storyboard", storyboardFile, "--timeline", timelineFile]);
  return {render, check, storyboardFile};
}

function expect(label, want, got) {
  if (want === "pass") {
    if (got.check.status === 0) {
      console.log(`ok   ${label} — ${out(got.check).split(/\r?\n/).pop()}`);
    } else {
      console.log(`FAIL ${label} — 合规分镜被判失败：${out(got.check).slice(0, 220)}`);
      failed.push(label);
    }
    return;
  }
  if (got.render.status !== 0 && want.atRender) {
    console.log(`ok   ${label} — 渲染阶段就失败：${out(got.render).split(/\r?\n/).pop()}`);
    return;
  }
  const text = out(got.render) + "\n" + out(got.check);
  if (got.check.status === 0) {
    console.log(`FAIL ${label} — 这条判据没执行（变异输入居然过了）：${text.slice(0, 200)}`);
    failed.push(label);
    return;
  }
  if (want.match && !text.includes(want.match)) {
    console.log(`FAIL ${label} — 失败了但不是因为这件事（要找「${want.match}」）：${text.slice(0, 220)}`);
    failed.push(label);
    return;
  }
  console.log(`ok   ${label} — ${text.split(/\r?\n/).filter(Boolean).pop()}`);
}

const CASES = 14;

// ---- 0) 解释器可用，否则后面全是假失败 ----
const pyCheck = run(PY, ["--version"], {encoding: "utf8"});
if (pyCheck.status !== 0) {
  console.error(`verify-storyboard: ${PY} 不可用（${pyCheck.error || "退出码 " + pyCheck.status}）—— 或设 PYTHON=<解释器路径>`);
  process.exit(1);
}
console.log(`     用 ${PY} → ${resolveBin(PY)}：${out(pyCheck).split(/\r?\n/)[0]}`);

try {
  // ---- 1) 基准：仓库里的分镜源 + 合成时间轴必须过 ----
  expect("合规分镜通过自检", "pass", produce({caseName: "baseline"}));

  // ---- 2) 判据逐条变异：每条都要「失败，而且失败在这件事上」----
  expect(
    "镜头不足 120 帧要失败",
    {match: "shot too short (<120f): SC03"},
    produce({caseName: "short-shot", tl: timelineWith("S03", (s) => ({...s, to: s.from + 89}))}),
  );
  expect(
    "没有持续动作要失败",
    {match: "missing continuous action: SC02"},
    produce({caseName: "no-continuous", srcText: mutate("split + camera parallax; continuous: 轨道点行进撑到下一拍", "split + camera parallax")}),
  );
  expect(
    "末拍稳定期 <30 帧要失败",
    {match: "insufficient settle hold (<30f): SC02"},
    produce({caseName: "weak-hold", srcText: mutate("hold: 30f |\n| SC03", "hold: 20f |\n| SC03")}),
  );
  expect(
    "白名单外的镜头用 Glitch 要失败",
    {match: "glitch over whitelist: SC02"},
    produce({caseName: "glitch-offlist", srcText: mutate("头部却带着一串看不懂的字段。", "头部却带着一串看不懂的字段。(GlitchIn)")}),
  );
  expect(
    "白名单外的镜头用扫光图元要失败",
    {match: "light-sweep over whitelist: SC02"},
    produce({caseName: "sweep-offlist", srcText: mutate("头部却带着一串看不懂的字段。", "头部却带着一串看不懂的字段。 + LightSweep")}),
  );
  expect(
    "分镜引用了时间轴没有的句子要出声（不是 KeyError 回溯）",
    {match: "S99", atRender: true},
    produce({caseName: "unknown-sentence", srcText: sourceText() + "| SC05 | {S99.from}–{S99.to} | extra | x | continuous: y; hold: 36f |\n"}),
  );
  expect(
    "渲染后仍有未解析的花括号要失败",
    {match: "unresolved storyboard tokens", atRender: true},
    produce({caseName: "leftover-token", srcText: mutate("# Storyboard", "# Storyboard\n\n{NOT_A_TOKEN} 留着")}),
  );
  // 帧号漂移：分镜表按基准时间轴渲染，自检却读到一份改过的时间轴 —— 这才是真事故的形状
  // （重跑 TTS 后忘了重跑 storyboard）。用同一份输入两边永远一致，测不到这条。
  expect(
    "分镜表与时间轴帧号不一致要失败",
    {match: "timeline mismatch: SC02"},
    produce({
      caseName: "frame-drift",
      checkTl: timelineWith("S02", (s) => ({...s, from: s.from + 5})),
    }),
  );
  expect(
    "镜头数和时间轴句数对不上要失败",
    {match: "coverage mismatch"},
    produce({
      caseName: "coverage",
      checkTl: (() => {const t = deriveTimelineFromSource(); return {...t, sentences: t.sentences.slice(0, 3)};})(),
    }),
  );
  // 把**每一行**的帧号分隔符换成 ASCII 连字符：一条都解析不到时，必须说「格式变了」，
  // 而不是报 coverage mismatch: 3 != 4 这种把格式事故说成数量事故的假原因。
  expect(
    "表格式对不上时说出真原因",
    {match: "没有解析到任何"},
    produce({
      caseName: "table-format",
      srcText: sourceText()
        .split(/\r?\n/)
        .map((line) => (/^\| SC\d+ \| \{S\d+\.from\}–/.test(line) ? line.replace("–", "-") : line))
        .join("\n"),
    }),
  );
  expect(
    "缺时间轴时给安装提示而不是回溯",
    {match: "npm run tts"},
    produce({caseName: "no-timeline", removeTimeline: true}),
  );
  expect(
    "缺分镜表时指向 storyboard 而不是 tts",
    {match: "npm run storyboard"},
    produce({caseName: "no-storyboard", skipRender: true}),
  );
  expect(
    "时间轴是半截 JSON 时说清是哪个文件",
    {match: "时间轴不是合法 JSON"},
    produce({caseName: "bad-json", rawCheckTl: '{"fps": 30, "sentences": ['}),
  );
} catch (err) {
  console.error("FAIL verify-storyboard 用例没跑完 — " + (err.message || err));
  failed.push("cases crashed");
}

fs.rmSync(SANDBOX, {recursive: true, force: true});

if (failed.length) {
  console.error("\nSTORYBOARD GATE FAIL " + JSON.stringify({failed: failed.length, cases: CASES}));
  for (const name of failed) console.error("  ✗ " + name);
  process.exit(1);
}
console.log(`verify-storyboard PASS ${CASES} 个用例（1 基准 + ${CASES - 1} 条判据变异）`);
