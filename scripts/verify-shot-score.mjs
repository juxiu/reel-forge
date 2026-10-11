import fs from "node:fs";
import path from "node:path";
import {lintShotScores, scoreShot} from "../src/visual/shot-score.mjs";

// 每镜打分 lint：阻断判据只看分镜结构（IR 自带，见 src/visual/shot-score.mjs 头部）。
// visual_regression_*.json 只作为**附注**读出来看，不进判据 —— 它是 advisory，
// 且「文件在不在」取决于有没有跑过测量，用它判分会让同一份 IR 时而 PASS 时而 FAIL。
const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const qcDir = path.join("artifacts", project.project_id, "qc");

function loadVisualByScene(ratio) {
  const file = path.join(qcDir, "visual_regression_" + ratio + ".json");
  if (!fs.existsSync(file)) return {status: "ABSENT", scenes: {}};
  // 陈旧判断用帧目录 mtime 当基准（与 scripts/qc.mjs 同一口径）：渲染后没重跑测量的
  // 旧数字贴不到这一版画面上，只能标 stale，不能当"看过了"。
  const framesAt = (() => {
    try { return fs.statSync(path.join("artifacts", "frames", ratio)).mtimeMs; } catch { return 0; }
  })();
  const stale = framesAt > 0 && fs.statSync(file).mtimeMs + 1000 < framesAt;
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  return {status: stale ? "STALE" : "OK", scenes: Object.fromEntries((report.scenes || []).map(scene => [scene.scene, scene]))};
}

// 模型不变量：阻断分只由 IR 结构决定，**不许**受 advisory 视觉回归层影响。
// 这条断言就是上面那个事故的守门人 —— 若哪天有人把视觉维度折回 score，这里立刻变红。
const ADVISORY_SAMPLE = {reference_similarity: 0.1, visual_complexity: 0.1, text_density: 0.1, hero_consistency: 0.1, layout_stability: 0.1};
function assertStructuralOnly() {
  const good = {id: "s", variant: "structured", composition: {hero_weight: 0.7, focus: "hero-plus-flow", safe_margin: 0.08}, motion: [{target: "stage", amount: 0.04}], light: {mode: "hero-key", accent: "purple"}};
  const bare = scoreShot(good, {}).score;
  const withAdvisory = scoreShot(good, ADVISORY_SAMPLE).score;
  if (bare !== withAdvisory) throw new Error("shot-score 依赖 advisory 视觉层：无报告=" + bare + " 有报告=" + withAdvisory + "（视觉回归是 advisory，不能进阻断分）");
  const deficient = {id: "d", variant: "generic", composition: {hero_weight: 0.3, focus: "flow", safe_margin: 0}, motion: [], light: {mode: "flat"}};
  if (!lintShotScores({scenes: [deficient]}, {}).length) throw new Error("shot-score 失去阻断力：结构缺失的镜头竟然 PASS=" + scoreShot(deficient, {}).score);
}
assertStructuralOnly();

for (const ratio of ["16x9", "9x16"]) {
  const file = "fixtures/render-ir-" + ratio + ".json";
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const visual = loadVisualByScene(ratio);
  const issues = lintShotScores(ir, {visualByScene: visual.scenes});
  if (issues.length) {
    console.error("shot score FAIL " + ratio);
    issues.forEach(issue => console.error("- " + issue));
    process.exit(1);
  }
  // 附注里的视觉维度只是参考：status=ABSENT/STALE 时它不代表这一版画面。
  const advisoryMissing = visual.status !== "OK" ? "（visual_regression " + visual.status + "，下列视觉维度不代表当前画面）" : "";
  console.log("shot score PASS " + ratio, JSON.stringify(ir.scenes.map(scene => {
    const result = scoreShot(scene, visual.scenes[scene.id] || {});
    return {id: scene.id, variant: scene.variant, score: result.score, advisory: result.advisory};
  })) + advisoryMissing);
}
