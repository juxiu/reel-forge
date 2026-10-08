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

export function scoreShot(scene) {
  const rule = VARIANT_RULES[scene.variant] || VARIANT_RULES.generic;
  const hero = Number(scene.composition?.hero_weight || 0) >= 0.6 ? 1 : 0.4;
  const camera = Number((scene.motion || []).find(item => item.target === "stage")?.amount || 0);
  const motion = Math.min(1, camera / 0.08);
  const composition = scene.composition?.focus === "hero-plus-flow" ? 1 : 0.5;
  const light = scene.light?.mode === "hero-key" && scene.light?.accent === "purple" ? 1 : 0.5;
  const safety = Number(scene.composition?.safe_margin || 0) >= 0.06 ? 1 : 0.5;
  const semantic = scene.variant && scene.variant !== "generic" ? 1 : 0.45;
  const weighted = 0.22 * semantic + 0.18 * hero + 0.2 * motion + 0.18 * composition + 0.08 * light + 0.14 * safety;
  return {
    score: Number(weighted.toFixed(3)),
    target: Number(((rule.hero + rule.motion) / 2).toFixed(3)),
    dimensions: {semantic, hero, motion, composition, light, safety},
  };
}

export function lintShotScores(renderIR, {minScore = 0.72} = {}) {
  const issues = [];
  for (const scene of renderIR.scenes || []) {
    const result = scoreShot(scene);
    if (result.score < minScore) issues.push(scene.id + ":shot-score-too-low:" + result.score);
  }
  return issues;
}
