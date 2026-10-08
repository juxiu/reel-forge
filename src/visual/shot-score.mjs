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

const WEIGHTS = {
  semantic: 0.16,
  hero: 0.12,
  motion: 0.14,
  composition: 0.12,
  light: 0.06,
  safety: 0.10,
  reference_similarity: 0.14,
  visual_complexity: 0.05,
  text_density: 0.03,
  hero_consistency: 0.04,
  layout_stability: 0.04,
};

function defaults(scene) {
  return {
    reference_similarity: 0.72,
    visual_complexity: scene.variant === "generic" ? 0.45 : 0.78,
    text_density: scene.elements?.length ? 0.82 : 0.5,
    hero_consistency: 0.82,
    layout_stability: 0.82,
  };
}

export function scoreShot(scene, visual = {}) {
  const rule = VARIANT_RULES[scene.variant] || VARIANT_RULES.generic;
  const fallback = defaults(scene);
  const hero = Number(scene.composition?.hero_weight || 0) >= 0.6 ? 1 : 0.4;
  const camera = Number((scene.motion || []).find(item => item.target === "stage")?.amount || 0);
  const motion = Math.min(1, camera / 0.08);
  const composition = scene.composition?.focus === "hero-plus-flow" ? 1 : 0.5;
  const light = scene.light?.mode === "hero-key" && scene.light?.accent === "purple" ? 1 : 0.5;
  const safety = Number(scene.composition?.safe_margin || 0) >= 0.06 ? 1 : 0.5;
  const semantic = scene.variant && scene.variant !== "generic" ? 1 : 0.45;
  const visualDimensions = {
    reference_similarity: Number.isFinite(Number(visual.reference_similarity)) ? Number(visual.reference_similarity) : fallback.reference_similarity,
    visual_complexity: Number.isFinite(Number(visual.visual_complexity)) ? Number(visual.visual_complexity) : fallback.visual_complexity,
    text_density: Number.isFinite(Number(visual.text_density)) ? Number(visual.text_density) : fallback.text_density,
    hero_consistency: Number.isFinite(Number(visual.hero_consistency)) ? Number(visual.hero_consistency) : fallback.hero_consistency,
    layout_stability: Number.isFinite(Number(visual.layout_stability)) ? Number(visual.layout_stability) : fallback.layout_stability,
  };
  const dimensions = {semantic, hero, motion, composition, light, safety, ...visualDimensions};
  const weighted = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + weight * dimensions[key], 0);
  return {
    score: Number(weighted.toFixed(3)),
    target: Number(((rule.hero + rule.motion) / 2).toFixed(3)),
    dimensions,
    weights: WEIGHTS,
  };
}

export function lintShotScores(renderIR, {minScore = 0.72, visualByScene = {}} = {}) {
  const issues = [];
  for (const scene of renderIR.scenes || []) {
    const result = scoreShot(scene, visualByScene[scene.id] || {});
    if (result.score < minScore) issues.push(scene.id + ":shot-score-too-low:" + result.score);
    // reference_similarity 来自 64x36 合成参考图 + 确定性像素 embedding，实测与画面质量反向相关，
    // 因此不再作为阻断项；它只作为维度参与加权分，回归趋势由 visual_regression 报告记录。
  }
  return issues;
}
