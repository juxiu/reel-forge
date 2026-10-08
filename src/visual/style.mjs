export const PALETTE = {
  bg: "#050507",
  panel: "#11111A",
  line: "#4B4B55",
  white: "#FFFFFF",
  grey: "#A7A7B0",
  purple: "#7D68FF",
  purpleLight: "#B5A8FF",
  danger: "#F05F41",
  success: "#8FF740",
};

export const SAFE = {
  wide: {left: 72, right: 72, top: 82, bottom: 122},
  tall: {left: 44, right: 44, top: 92, bottom: 184},
};

export function safeArea(width, height) {
  return width > height ? SAFE.wide : SAFE.tall;
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function easeOut(value, power = 2.5) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, power);
}

export function sceneLocalFrame(frame, scene, fps) {
  return Math.max(0, frame - Math.round(scene.start * fps));
}

export function sceneProgress(frame, scene, fps) {
  const length = Math.max(1, Math.round(scene.duration * fps));
  return clamp01(sceneLocalFrame(frame, scene, fps) / length);
}
