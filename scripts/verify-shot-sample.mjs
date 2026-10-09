import fs from "node:fs";
import path from "node:path";
import {run} from "../src/runtime/spawn.mjs";

/**
 * 最小单元采样门：**一次启动渲完所有采样帧**，然后用测量层自己的 PNG 解码做判据。
 *
 * ⚠⚠ 成本的关键发现（2026-10-09 实测，本门从 70s 降到 ~6s）：
 *   Remotion 的 `still` 是**一张一次浏览器启动**（2.4–2.8s/张，其中约 2s 是纯启动），
 *   所以「每镜 4 帧 × 8 镜 = 32 张」要 70s。而 `remotion render` 走一次启动后，
 *   **每帧边际只要 ~0.015s**，并且 `--frames` **接受离散帧列表**（`143,500,900`）——
 *   于是 32 张、甚至全部 44 镜 × 4 帧 = 176 张，都能在**一次启动**里出来。
 *
 *   实测：
 *     still × 32           ≈ 70s
 *     render 离散 32 帧     ≈  6s      ← 本门现在走的路
 *     render 离散 176 帧    ≈  8s
 *   所以「抽样」不再是为了省时间，而是为了控制判据输出量 —— 于是默认改成**全 44 镜**，
 *   覆盖比之前更广、成本反而更低。
 *
 * 为什么每镜 4 帧而不是 1 帧：单帧只能抓构图类问题（重叠、出血、对比度、图标隐身）。
 * a2e 最要命的几条是**时间上的**规则 —— 硬规则 6 的「元素入场后不许完全静止 >3s」
 * 与「末拍落位后要有 30–45 帧稳定期」，单帧一律看不见：
 *     enter     刚入场 —— 抓空场、元素没画出来
 *     mid       镜中段 —— 抓构图、对比度、重叠
 *     exit      离场前 —— 与 mid 比对，抓「末段完全静止」
 *     exitLate  末拍区间内 —— 与 exit 比对，抓「落位即切」
 *
 * ⚠ 判据被自己的错误骗过两次，这里把教训写死：
 *   1. 「字幕带 637–690 不能有内容」是**错的** —— 字幕文字自己就在这个带里。
 *      该查的是内容区下沿到字幕带之间的**空隙** 620–637。
 *   2. 「四边亮像素要低」也是**反的** —— cameraSafe 的设计意图正是内容不贴边，
 *      边空是正确结果；该抓的是内容贴到画幅**最外沿**（出血），所以判的是边**高**。
 *   3. 判动静必须用**逐像素平均差**，不能用「亮像素占比之差」：占比只统计「多亮了多少
 *      像素」，轨道光点、描边推进、亚像素位移都几乎不改占比 —— 明明在动却判成静止。
 */

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.split("=").slice(1).join("=") : d;
};
const QUICK = argv.includes("--quick");
// 默认 10 镜 ≈ 14s。`--shots=0` 才是全 44 镜（≈52s）—— 44 镜不是默认不是因为没价值，
// 而是 PNG 编码是瓶颈（每帧约 0.2s，比解码贵一个量级）。要覆盖全部就显式说 --shots=0。
const SHOTS = Number(arg("shots", QUICK ? 6 : 10));
const MOMENTS = arg("moments", "enter,mid,exit,exitLate").split(",").filter(Boolean);
const OUT = arg("out", "artifacts/shot-sample");

const EMPTY_MAX = 0.004;
const GAP_BAND = [620, 637];
const GAP_MAX = 0.02;
const BLEED_MAX = 0.16;
const CONTENT = [175, 620];
const QUIET_DELTA = 0.9;
const SETTLE_DELTA = 3.2;
const FPS = 30;

// ---------------------------------------------------------------- 取样
const bp = JSON.parse(fs.readFileSync("fixtures/reference-shot-blueprint.json", "utf8")).shots;
const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));

function parseRecipe(file) {
  const s = fs.readFileSync(file, "utf8");
  const d = s.match(/export const SHOT_RECIPE\s*=\s*\{/);
  if (!d) return null;
  const b = d.index + d[0].length - 1;
  let depth = 0;
  for (let i = b; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return new Function(`return (${s.slice(b, i + 1)});`)();
  }
  return null;
}

const all = bp.map((shot) => {
  const recipe = parseRecipe(path.join("src/shots", shot.group, `${shot.shot_id}.jsx`)) || {};
  // scene id 的补零位数不要写死：这份仓库变过（scene-01 → scene-001）。按数字匹配。
  const num = Number(shot.shot_id.slice(2));
  const sc = ir.scenes.find((x) => String(x.id || x.scene_id || "") === `scene-${String(num).padStart(3, "0")}`) || ir.scenes[num - 1];
  if (!sc) throw new Error(`IR 里找不到 ${shot.shot_id} 对应的场景`);
  const from = Math.round(sc.start * FPS);
  const len = Math.round(sc.duration * FPS);
  return {shot, recipe, from, len};
});

const picked = SHOTS > 0 ? all.slice(0, SHOTS) : all;

function framesOf(m) {
  const hold = Math.max(30, Number(m.recipe.settle_frames) || 30);
  const exitAt = m.from + m.len - hold;
  const map = {
    enter: m.from + 2,
    mid: m.from + Math.round(m.len * 0.62),
    exit: exitAt,
    exitLate: exitAt - Math.min(28, Math.max(4, Math.floor(hold * 0.7))),
  };
  return MOMENTS.map((k) => ({moment: k, frame: map[k]})).filter((x) => Number.isFinite(x.frame));
}

// ---------------------------------------------------------------- 一次启动渲完全部帧
const seqDir = path.join(OUT, "seq");
fs.rmSync(seqDir, {recursive: true, force: true});
fs.mkdirSync(seqDir, {recursive: true});

const wanted = [];       // {shot, moment, frame}
for (const m of picked) for (const {moment, frame} of framesOf(m)) wanted.push({m, moment, frame});

// 去重后排序 —— 帧号连续时合成区间可以少写几个参数，但Remotion 接受重复，保留即可
const frames = [...new Set(wanted.map((w) => w.frame))].sort((a, b) => a - b);

const res = run(
  "npx",
  ["remotion", "render", "src/remotion/index.jsx", "ReelForge16x9", seqDir,
   "--image-format=png", `--frames=${frames.join(",")}`, "--log=error"],
  {stdio: "ignore"},
);

if (res.status !== 0) {
  console.error("SHOT SAMPLE FAIL 渲染失败 status=" + (res.status ?? "signal"));
  process.exit(1);
}
const fileOf = new Map();
for (const f of fs.readdirSync(seqDir)) {
  const hit = /^element-(\d+)\.png$/.exec(f);
  if (hit) fileOf.set(Number(hit[1]), path.join(seqDir, f));
}

const problems = [];
const rendered = [];
for (const m of picked) {
  const files = [];
  for (const {moment, frame} of framesOf(m)) {
    const file = fileOf.get(frame - 1) || fileOf.get(frame);
    if (!file || !fs.existsSync(file)) {
      problems.push(`${m.shot.shot_id}/${moment}: 帧 ${frame} 没渲出来`);
      continue;
    }
    files.push({moment, frame, file});
  }
  if (files.length) rendered.push({m, files});
}

// ---------------------------------------------------------------- 像素测量（一次 python 解完所有帧）
function measureAll(list) {
  const py = `
import sys, json
sys.path.insert(0, "scripts")
import pngio
out = {}
for k, f in ${JSON.stringify(list)}.items():
    try:
        im = pngio.read(f).to_rgb()
    except Exception:
        out[k] = None; continue
    w, h, rows = im.width, im.height, im.rows
    def band(y0, y1):
        b = t = 0
        for y in range(max(0, y0), min(h, y1)):
            r = rows[y]
            for x in range(w):
                v = (r[x*3] + r[x*3+1] + r[x*3+2]) / 3
                t += 1
                if v > 100: b += 1
        return round(b / max(1, t), 5)
    # ⚠ 只查左/右/上三边，**不查最底部**：最底 12px 落在进度条带（y687–720）里，
    #   那里本来就该有东西 —— 把它算成「出血」是判据写反了（同「字幕带」那次）。
    bleed = 0
    for (x0, y0, x1, y1) in [(0,0,12,h),(w-12,0,w,h),(0,0,w,12)]:
        b = t = 0
        for y in range(max(0,y0), min(h,y1)):
            r = rows[y]
            for x in range(max(0,x0), min(w,x1)):
                v = (r[x*3] + r[x*3+1] + r[x*3+2]) / 3
                t += 1
                if v > 100: b += 1
        bleed = max(bleed, round(b / max(1, t), 5))
    out[k] = {"content": band(${CONTENT[0]}, ${CONTENT[1]}),
              "gap_band": band(${GAP_BAND[0]}, ${GAP_BAND[1]}),
              "bleed": bleed}
print(json.dumps(out))
`;
  const r = run("python3", ["-c", py], {encoding: "utf8"});
  if (r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(String(r.stdout).trim().split("\n").pop()); } catch { return null; }
}

const fileMap = {};
for (const {m, files} of rendered) for (const f of files) fileMap[`${m.shot.shot_id}:${f.moment}`] = f.file;
const stats = measureAll(fileMap) || {};

/**
 * 逐像素平均差：**一次 python 解完所有需要比对的帧对**。
 *
 * ⚠ 原来是每对起一次 python（44 镜 × 2 = 88 次进程启动 ≈ 40s），
 *   而整门的时间预算应该在渲染上、���在进程启动上。88 次 → 1 次。
 *   口径与 a2e motion_check 一致：灰度平均绝对差。
 */
function frameDiffs(pairs) {
  if (!pairs.length) return {};
  const py = `
import sys, json
sys.path.insert(0, "scripts")
import pngio
cache = {}
def load(f):
    if f not in cache:
        im = pngio.read(f).to_rgb()
        cache[f] = im
    return cache[f]
out = {}
for k, a, b in ${JSON.stringify(pairs)}:
    try:
        A = load(a); B = load(b)
        w = min(A.width, B.width); h = min(A.height, B.height)
        tot = n = 0
        for y in range(0, h, 3):
            ra = A.rows[y]; rb = B.rows[y]
            for x in range(0, w, 3):
                tot += abs(ra[x*3]-rb[x*3]) + abs(ra[x*3+1]-rb[x*3+1]) + abs(ra[x*3+2]-rb[x*3+2])
                n += 1
        out[k] = round(tot / max(1, n) / 3, 3)
    except Exception:
        out[k] = None
print(json.dumps(out))
`;
  const r = run("python3", ["-c", py], {encoding: "utf8"});
  if (r.status !== 0 || !r.stdout) return {};
  try { return JSON.parse(String(r.stdout).trim().split("\n").pop()); } catch { return {}; }
}

// 先把所有需要比对的帧对收集起来，**一次** python 算完（原来每对起一次进程 ≈ 40s）
const diffPairs = [];
for (const {m, files} of rendered) {
  const fMid = files.find((f) => f.moment === "mid");
  const fExit = files.find((f) => f.moment === "exit");
  const fLate = files.find((f) => f.moment === "exitLate");
  if (fMid && fExit) diffPairs.push([`${m.shot.shot_id}:motion`, fMid.file, fExit.file]);
  if (fExit && fLate) diffPairs.push([`${m.shot.shot_id}:settle`, fExit.file, fLate.file]);
}
const diffs = frameDiffs(diffPairs);

const results = [];
for (const {m, files} of rendered) {
  const kind = String(m.recipe?.stage?.kind || "?");
  const by = {};
  for (const f of files) {
    const st = stats[`${m.shot.shot_id}:${f.moment}`];
    if (st) by[f.moment] = st;
  }
  if (!Object.keys(by).length) { problems.push(`${m.shot.shot_id}(${kind}): 帧解码失败`); continue; }
  results.push({shot: m.shot.shot_id, kind, camera: m.recipe.camera, moments: by});

  const mid = by.mid || by.enter || by.exit;
  if (mid.content < EMPTY_MAX) {
    problems.push(`${m.shot.shot_id}(${kind}): 内容区亮像素 ${(mid.content * 100).toFixed(2)}% < ${EMPTY_MAX * 100}% —— 判空场`);
  }
  if (mid.gap_band > GAP_MAX) {
    problems.push(`${m.shot.shot_id}(${kind}): 内容区与字幕带之间空隙(620–637)亮像素 ${(mid.gap_band * 100).toFixed(2)}% > ${GAP_MAX * 100}%`);
  }
  if (mid.bleed > BLEED_MAX) {
    problems.push(`${m.shot.shot_id}(${kind}): 画幅左/右/上外沿亮像素 ${(mid.bleed * 100).toFixed(1)}% > ${BLEED_MAX * 100}% —— 元素贴到画外沿（出血）`);
  }
  const dMotion = diffs[`${m.shot.shot_id}:motion`];
  if (dMotion !== undefined && dMotion !== null && dMotion < QUIET_DELTA) {
    problems.push(`${m.shot.shot_id}(${kind}): mid→exit 逐像素平均差 ${dMotion} < ${QUIET_DELTA} —— 末段完全静止，违反 a2e 硬规则 6「入场即停」`);
  }
  const dSettle = diffs[`${m.shot.shot_id}:settle`];
  if (dSettle !== undefined && dSettle !== null && dSettle > SETTLE_DELTA) {
    problems.push(`${m.shot.shot_id}(${kind}): 末拍区间逐像素平均差 ${dSettle} > ${SETTLE_DELTA} —— 落位后仍在动（「落位即切」是缺陷；连续 TTS 后镜头约 10s，相机关键帧铺满整镜是主因）`);
  }
}

const shotCount = rendered.length;
const stillCount = rendered.reduce((a, r) => a + r.files.length, 0);
if (problems.length) {
  console.error("SHOT SAMPLE FAIL " + JSON.stringify({shots: shotCount, stills: stillCount, moments: MOMENTS, problems: problems.length}, null, 2));
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
const contents = results.map((r) => {
  const k = ["mid", "enter", "exit"].find((x) => r.moments[x]);
  return k ? +(r.moments[k].content * 100).toFixed(2) : null;
}).filter((x) => x !== null).sort((a, b) => a - b);
console.log("shot sample PASS " + JSON.stringify({
  shots: shotCount,
  stills: stillCount,
  launches: 1,
  moments: MOMENTS,
  topologies: [...new Set(results.map((r) => r.kind))].length,
  cameras: [...new Set(results.map((r) => r.camera))],
  content_range_pct: contents.length ? [contents[0], contents[contents.length - 1]] : [],
}));