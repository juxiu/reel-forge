export const CAMERA_TYPES = new Set(["push", "pan", "slide", "parallax", "orbit", "zoom"]);
export const HERO_SIZES = new Set(["large", "xlarge"]);
export const MOTION_STATES = ["enter", "transform", "settle"];
export const APPROVED_EFFECTS = new Set(["glitch", "lightSweep"]);

function motionTypes(beat) {
  return (beat.motion || []).map((item) => item.preset || item.type).filter(Boolean);
}

export function lintVisualGrammar(beats, {minDuration = 4, maxIdleFrames = 90, fps = 30} = {}) {
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

    const state = String(beat.state_change || "");
    for (const required of MOTION_STATES) {
      if (!state.includes(required)) issues.push(beat.id + ":missing-" + required);
    }

    if (Number(beat.duration) < minDuration) issues.push(beat.id + ":too-short-for-shot-unit");
    if (!beat.asset_need) issues.push(beat.id + ":missing-visual-intent");

    const effects = beat.effects || [];
    for (const effect of effects) {
      if (!APPROVED_EFFECTS.has(effect.type || effect)) issues.push(beat.id + ":unapproved-effect");
    }

    const cameraFrames = Number(beat.camera?.duration_frames || Math.round(Number(beat.duration) * fps));
    if (cameraFrames <= 0) issues.push(beat.id + ":invalid-camera-duration");
    if (Number(beat.settle_frames || 0) < Math.min(30, cameraFrames)) {
      issues.push(beat.id + ":missing-settle-window");
    }

    const types = motionTypes(beat);
    if (types.length && types.every((type) => type === "fade" || type === "static")) {
      issues.push(beat.id + ":ppt-like-motion");
    }

    if (Number(beat.idle_frames || 0) > maxIdleFrames) {
      issues.push(beat.id + ":idle-window-too-long");
    }
  }

  return issues;
}
