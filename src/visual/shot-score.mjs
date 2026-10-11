// 每镜打分 lint：判据是**分镜结构**，不是画面像素。
//
// ⚠ 为什么把视觉回归层从阻断分里拿掉（2026-10-11，事故记录）：
//   reference_similarity / visual_complexity / text_density / hero_consistency / layout_stability
//   来自 visual_regression（64×36 合成参考图 + 确定性像素描述符），那一层在
//   src 的视觉回归头部与 verify-visual-regression.mjs 里都被明确声明为
//   `gate: advisory / blocking: false`，且实测与画面质量**反向相关**（画面更密、构图更实时分数更低）。
//   但它被 e0e78e5「fold visual regression into shot score」折进了这里的加权分，
//   于是出现最贵的一类假红：**跑过测量的比没跑测量的更容易红**。
//   实测同一份 IR、同一批帧：
//     · 盘上没有 visual_regression_*.json（CI 第一次 lint）→ 5 个视觉维度取默认 0.72 → 全 PASS；
//     · 盘上有（CI 第二次 lint / 本地全链）→ 22 个 generic 镜掉到 0.693–0.719 < 0.72 → FAIL。
//   判据依赖「某一层可选报告在不在」，就不是判据而是运气。视觉回归的位移监控仍由
//   visual_regression 报告 + verify:visual-regression 负责，不进这里。
//
// 现在 score 只由 IR 自带的结构维度算出：确定性、可复现、跨机器同结果。

const VARIANT_RULES = {
  preference: {hero: 0.9, motion: 0.8},
  structured: {hero: 0.9, motion: 0.85},
  split: {hero: 0.8, motion: 0.9},
  network: {hero: 0.75, motion: 0.95},
  generic: {hero: 0.65, motion: 0.65},
  comparison: {hero: 0.85, motion: 0.9},
  transformation: {hero: 0.85, motion: 0.95},
  sequence: {hero: 0.8, motion: 0.9},
  causal: {hero: 0.85, motion: 0.9},
  evidence: {hero: 0.8, motion: 0.8},
  code: {hero: 0.8, motion: 0.75},
};

// 阻断分权重：只含 IR 结构维度。权重之和在代码里归一（TOTAL_WEIGHT），
// 所以这里加/删维度不会让阈值语义漂移 —— 分数始终是「结构面满分 1.0」的比例。
const WEIGHTS = {
  semantic: 0.16,
  hero: 0.12,
  motion: 0.14,
  composition: 0.12,
  light: 0.06,
  safety: 0.10,
};
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);

// 视觉回归维度：仅作记录（回归趋势），**不参与 score**。
const ADVISORY_KEYS = ["reference_similarity", "visual_complexity", "text_density", "hero_consistency", "layout_stability"];

export function scoreShot(scene, visual = {}) {
  const rule = VARIANT_RULES[scene.variant] || VARIANT_RULES.generic;
  const hero = Number(scene.composition?.hero_weight || 0) >= 0.6 ? 1 : 0.4;
  const camera = Number((scene.motion || []).find(item => item.target === "stage")?.amount || 0);
  const motion = Math.min(1, camera / 0.08);
  const composition = scene.composition?.focus === "hero-plus-flow" ? 1 : 0.5;
  const light = scene.light?.mode === "hero-key" && scene.light?.accent === "purple" ? 1 : 0.5;
  const safety = Number(scene.composition?.safe_margin || 0) >= 0.06 ? 1 : 0.5;
  const semantic = scene.variant && scene.variant !== "generic" ? 1 : 0.45;
  const dimensions = {semantic, hero, motion, composition, light, safety};
  const advisory = Object.fromEntries(ADVISORY_KEYS.map(key => {
    const value = Number(visual[key]);
    return [key, Number.isFinite(value) ? value : null];
  }));
  const weighted = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + weight * dimensions[key], 0);
  return {
    score: Number((weighted / TOTAL_WEIGHT).toFixed(3)),
    target: Number(((rule.hero + rule.motion) / 2).toFixed(3)),
    dimensions,
    advisory,
    weights: WEIGHTS,
  };
}

export function lintShotScores(renderIR, {minScore = 0.72, visualByScene = {}} = {}) {
  const issues = [];
  for (const scene of renderIR.scenes || []) {
    const result = scoreShot(scene, visualByScene[scene.id] || {});
    if (result.score < minScore) issues.push(scene.id + ":shot-score-too-low:" + result.score);
  }
  return issues;
}
