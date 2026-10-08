export const CAMERA_TYPES = new Set(["push", "pan", "slide", "parallax", "orbit", "zoom"]);
export const HERO_SIZES = new Set(["large", "xlarge"]);
export const MOTION_STATES = ["enter", "transform", "settle"];

export function lintVisualGrammar(beats, {minDuration = 4} = {}) {
  const issues = [];
  const seenIds = new Set();

  for (const beat of beats || []) {
    if (!beat?.id) {
      issues.push("beat:missing-id");
      continue;
    }
    if (seenIds.has(beat.id)) issues.push(beat.id + ":duplicate-id");
    seenIds.add(beat.id);

    if (!beat.hero?.type) issues.push(beat.id + ":missing-hero");
    if (!HERO_SIZES.has(beat.hero?.size)) issues.push(beat.id + ":hero-too-small");
    if (!CAMERA_TYPES.has(beat.camera?.type)) issues.push(beat.id + ":invalid-camera");
    if (!(Number(beat.camera?.amount) > 0)) issues.push(beat.id + ":camera-motion-missing");
    if (!String(beat.state_change || "").includes("enter")) issues.push(beat.id + ":missing-enter");
    if (!String(beat.state_change || "").includes("transform")) issues.push(beat.id + ":missing-transform");
    if (!String(beat.state_change || "").includes("settle")) issues.push(beat.id + ":missing-settle");
    if (Number(beat.duration) < minDuration) issues.push(beat.id + ":too-short-for-shot-unit");
    if (!beat.asset_need) issues.push(beat.id + ":missing-visual-intent");
  }

  return issues;
}
