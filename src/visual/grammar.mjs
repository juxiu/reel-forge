import {cameraVocabulary, isCameraPreset} from './camera.mjs';

/**
 * 画面语法 lint（**生产者侧**的门：管住 director / authored 分镜写出来的 beat）。
 *
 * ⚠ 相机词表只有一份，就是渲染层真认的那份（camera.mjs 的 CAMERA_PRESETS）。
 *   这里原先自写了一套 `{push, pan, slide, parallax, orbit, zoom}`：
 *     · slide / orbit / zoom 渲染层根本没有实现 → 门放行、画面静默退化成慢推，
 *       分镜表却写着 orbit，QC 以为已经在管运镜（「假开关」的定义就是它）；
 *     · pull / scroll / handoff / slow_push 渲染层能执行，却被这道门判成 invalid-camera。
 *   一个门和渲染层用两套词，等于两边各自正确、合起来必错。
 *
 * ⚠ 本文件的 token 不是等价物：只有列在「渲染层读」那一列的字段真能改画面。
 *   hero.size / hero.type / state_change / asset_need / idle_frames / composition.hero_weight /
 *   light.mode / light.accent 目前**没有渲染层读者**（打光只有 light.key_intensity 被 plan.keyLight 读走，
 *   构图只有 composition.focus 被 plan.pickHero 读走）。它们留在这里是作为**分镜写作的要求**，
 *   但必须说清楚：这些 token 变红不等于画面会变，改 IR 里这些字段不构成一次修复。
 */
export const CAMERA_TYPES = new Set(cameraVocabulary());
export const HERO_SIZES = new Set(["large", "xlarge"]);
export const MOTION_STATES = ["enter", "transform", "settle"];
export const APPROVED_EFFECTS = new Set(["glitch", "lightSweep"]);
export const FOCUS_MODES = new Set(["single-hero", "hero-plus-flow"]);
export const LIGHT_MODES = new Set(["hero-key", "soft-key"]);
function motionTypes(beat) { return (beat.motion || []).map((item) => item.preset || item.type).filter(Boolean); }
export function lintVisualGrammar(beats, {minDuration = 4, maxIdleFrames = 90, fps = 30} = {}) {
  const issues = []; const seenIds = new Set();
  for (const beat of beats || []) {
    if (!beat?.id) { issues.push("beat:missing-id"); continue; }
    if (seenIds.has(beat.id)) issues.push(beat.id + ":duplicate-id"); seenIds.add(beat.id);
    if (!beat.hero?.type) issues.push(beat.id + ":missing-hero");
    if (!HERO_SIZES.has(beat.hero?.size)) issues.push(beat.id + ":hero-too-small");
    if (!CAMERA_TYPES.has(beat.camera?.type)) issues.push(beat.id + ":invalid-camera");
    if (!(Number(beat.camera?.amount) > 0)) issues.push(beat.id + ":camera-motion-missing");
    const state = String(beat.state_change || ""); for (const required of MOTION_STATES) if (!state.includes(required)) issues.push(beat.id + ":missing-" + required);
    if (Number(beat.duration) < minDuration) issues.push(beat.id + ":too-short-for-shot-unit");
    if (!beat.asset_need) issues.push(beat.id + ":missing-visual-intent");
    for (const effect of beat.effects || []) if (!APPROVED_EFFECTS.has(effect.type || effect)) issues.push(beat.id + ":unapproved-effect");
    const cameraFrames = Number(beat.camera?.duration_frames || Math.round(Number(beat.duration) * fps));
    if (cameraFrames <= 0) issues.push(beat.id + ":invalid-camera-duration");
    if (Number(beat.settle_frames || 0) < Math.min(30, cameraFrames)) issues.push(beat.id + ":missing-settle-window");
    const types = motionTypes(beat); if (types.length && types.every((type) => type === "fade" || type === "static")) issues.push(beat.id + ":ppt-like-motion");
    if (Number(beat.idle_frames || 0) > maxIdleFrames) issues.push(beat.id + ":idle-window-too-long");
    if (!FOCUS_MODES.has(beat.composition?.focus)) issues.push(beat.id + ":invalid-focus-mode");
    if (!(Number(beat.composition?.hero_weight) >= 0.45)) issues.push(beat.id + ":hero-weight-too-low");
    if (!LIGHT_MODES.has(beat.light?.mode)) issues.push(beat.id + ":invalid-light-mode");
    if (!(Number(beat.light?.key_intensity) > 0 && Number(beat.light?.key_intensity) <= 1)) issues.push(beat.id + ":invalid-key-light");
    if (beat.light?.accent !== "purple") issues.push(beat.id + ":missing-purple-accent");
  }
  return issues;
}
