/**
 * 运镜层（纯函数，无 JSX）——因为相机关键帧是 QC 判据的直接对象：
 * 「运镜不进末拍」「相机必须在拍子前停住」「慢推安全区 x89–1191 / y122–607」都要能在不渲染的情况下校验。
 *
 * 坐标系：CameraRig 用「世界坐标 → 屏幕」的单点缩放，keys 里的 (x,y) 是相机中心对准的**世界坐标**，
 * s 是缩放倍数。s=1 且 (x,y)=(640, H/2) 时画面与画布重合（恒等）。
 *
 * ⚠ 三条实测约束（写进 motion_check 也照这三条判）：
 *   1) 运镜结束帧 ≤ 镜头末帧 − CAMERA_CLEAR(30)，否则末拍还在动 = 没有落位；
 *   2) 位移量必须让**所有元素**留在 cameraSafe 内，推近越大安全区越小；
 *   3) s 上限 1.4：box-shadow 与描边同样被放大，超过就显粗（样片实测最大 1.33）。
 */
import {clamp01, easeInOutPow} from './easing.mjs';

export const CAMERA_LIMITS = {min: 20, max: 45, clear: 30, maxScale: 1.4};

/**
 * 关键帧插值。f 之间 easeInOutPow(2.5)；首值之前停在第一帧、末值之后停在最后一帧。
 * ⚠ 首值陷阱：keys[0].f 必须等于镜头起始帧，否则入场那半段会一直停在第一个关键帧的值上。
 */
export const camAt = (N, keys, ease = easeInOutPow(2.5)) => {
  if (!keys || keys.length === 0) return {f: N, x: 640, y: 360, s: 1};
  if (N <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (N <= b.f) {
      const t = ease(clamp01((N - a.f) / Math.max(1, b.f - a.f)));
      return {f: N, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t};
    }
  }
  return keys[keys.length - 1];
};

/** 键帧生成器：6 个基础轨迹。9 个预设名与它们的映射关系只写在 cameraKeysFromPreset 一处。 */
export const CAMERA = {
  push: (f0, {from = 1, to = 1.33, len = 33, x = 640, y = 360} = {}) => [
    {f: f0, x, y, s: from},
    {f: f0 + len, x, y, s: to},
  ],
  slowPush: (f0, {len = 45, x = 640, y = 360} = {}) => [
    {f: f0, x, y, s: 1},
    {f: f0 + len, x, y, s: 1.05},
  ],
  pull: (f0, {from = 1.28, to = 1, len = 41, x = 640, y = 360} = {}) => [
    {f: f0, x, y, s: from},
    {f: f0 + len, x, y, s: to},
  ],
  pan: (f0, {x0 = 560, x1 = 720, y = 360, s = 1.12, len = 26} = {}) => [
    {f: f0, x: x0, y, s},
    {f: f0 + len, x: x1, y, s},
  ],
  scroll: (f0, {y0 = 300, y1 = 430, x = 640, s = 1, len = 43} = {}) => [
    {f: f0, x, y: y0, s},
    {f: f0 + len, x, y: y1, s},
  ],
  handoff: (f0, {x0 = 980, x1 = 640, y = 400, s = 1, len = 16} = {}) => [
    {f: f0, x: x0, y, s},
    {f: f0 + len, x: x1, y, s},
  ],
};
/** 视差速度（px/帧）：前景 12.8 / 中景 9.6 / 背景 6.4×0.43。 */
export const PARALLAX = {front: 12.8, mid: 9.6, back: 6.4 * 0.43};

/**
 * 深度倍率：以「中景 = 跟相机同速」为基准，把实测速度换算成相对位移系数。
 * 前景比相机快 1.33 倍（近处扫得快），背景只走 0.29 倍（远处几乎不动）。
 * ⚠ 这两个数是 parallax 能不能被 QC 判定的关键：写死在纯函数层，JSX 只负责乘上去。
 */
export const PARALLAX_DEPTH = {
  front: PARALLAX.front / PARALLAX.mid,
  mid: 1,
  back: PARALLAX.back / PARALLAX.mid,
};

/**
 * 分镜里允许声明的相机预设名（IR 的 motion.preset 与 authored recipe.camera 共用这一张表）。
 * 'slow_push' / 'slowPush' 是同一条轨迹的两种写法（样片文档里两个名字都出现过）；
 * 'static' / 'none' 表示**显式不运镜**，与「没声明」不同 —— 没声明才走兜底慢推。
 * ⚠ 查这张表一律用 isCameraPreset()/cameraVocabulary()，不要直接 includes 原样字符串（见下）。
 */
export const CAMERA_PRESETS = ['push', 'slow_push', 'slowPush', 'pull', 'pan', 'scroll', 'handoff', 'parallax', 'static', 'none'];

/**
 * 判定一个相机名到底有没有渲染实现 —— **全仓库只认这一份**。
 *
 * 为什么不能直接用 `CAMERA_PRESETS.includes(name)`：渲染层把声明名统一 `toLowerCase()` 再查表
 * （cameraKeysFromPreset 的 switch 也只有小写分支），而表里留着 `'slowPush'` 这个驼峰项，
 * 于是 `'slowPush'` 归一后 = `'slowpush'` ∉ 表 → plan 报 camera-unknown-preset，
 * 可同一份声明又确实生成了 slowPush 关键帧。**误报的整改项会把 Repair 派去改一个本来正确的字段**，
 * 而 verify-authored-shots 用原样字符串查表时又判它合法 —— 同一份数据两处口径相反。
 * 所以集合按小写导出，所有查表方（plan / authored 门 / grammar / 分镜）都用 isCameraPreset。
 */
const CAMERA_VOCAB = new Set(CAMERA_PRESETS.map((p) => p.toLowerCase()));
export const isCameraPreset = (name) => CAMERA_VOCAB.has(String(name || '').toLowerCase());
export const cameraVocabulary = () => [...CAMERA_VOCAB].sort();

/** 相机位移相对起始关键帧的增量 —— 视差层按它乘以 (depth − 1)。 */
export const camDelta = (N, keys) => {
  if (!keys || keys.length < 2) return {x: 0, y: 0};
  const c = camAt(N, keys);
  const k0 = keys[0];
  return {x: c.x - k0.x, y: c.y - k0.y};
};

/** 把 IR 的 motion 声明（type=camera, target=stage）翻译成 keys，让分镜里的运镜真正进渲染。 */
export function cameraKeysFromMotion(motion, f0, duration, bands) {
  const cam = (motion || []).find((m) => m && m.type === 'camera' && m.target === 'stage');
  if (!cam) return null;
  // 显式 static / none：这条路径也必须说「不运镜」。缺了这两行时它会顺着 switch 的默认分支
  // 生成一段 push，于是 motion 里写 static 的镜头一路推近到离场 —— 词表里的名字得有真实现。
  if (cam.preset === 'static' || cam.preset === 'none') return null;
  // ⚠ 镜头太短就**不做运镜**，而不是压缩到 CAMERA_MIN 以下硬做：
  //   「运镜结束到离场 ≥30 帧」和「运镜 20–45 帧」是两条同时成立的硬规则，
  //   34 帧的镜头只剩 4 帧可运，硬塞的结果是相机一路动到离场——那正是这两条要防的画面。
  const usable = duration - CAMERA_LIMITS.clear;
  if (usable < CAMERA_LIMITS.min) return null;
  const amount = clamp01(Number(cam.amount ?? 0.05) / 0.12);
  const len = Math.max(CAMERA_LIMITS.min, Math.min(usable, Math.min(CAMERA_LIMITS.max, Math.round(CAMERA_LIMITS.min + amount * 25))));
  const focus = {x: 640, y: camCenterY(bands)};
  if (cam.preset === 'pan') return CAMERA.pan(f0, {...focus, len, s: 1.08 + amount * 0.1});
  if (cam.preset === 'pull') return CAMERA.pull(f0, {...focus, len});
  // 整页滚动：纵向扫的是**内容区**，不是整幅画布——把 y0/y1 留给滚动区间，中心只用于 x 与取景基准。
  if (cam.preset === 'scroll') return CAMERA.scroll(f0, scrollRange(bands, focus, len));
  return CAMERA.push(f0, {...focus, from: 1, to: Math.min(CAMERA_LIMITS.maxScale, 1 + 0.05 + amount * 0.28), len});
}

/** 滚动取景范围：从内容区上部扫到下部，两端各留 60px 不贴边（贴边时元素会从带沿上被切走）。 */
function scrollRange(bands, focus, len) {
  const top = (bands && bands.contentTop) || 175;
  const bottom = (bands && bands.contentBottom) || 620;
  const y0 = Math.max(top + 20, focus.y - 120, (top + bottom) / 2 - 120);
  const y1 = Math.min(bottom - 20, Math.max(y0 + 40, (top + bottom) / 2 + 120));
  return {x: focus.x, y0, y1, s: 1, len};
}

/**
 * 按**预设名**生成 keys（authored 分镜只写 `camera:"pan"` 这种名字，不写关键帧）。
 *
 * 为什么必须有这条：44 个 authored 镜头各自声明了 camera，而 plan 层只认 scene.motion[]，
 * 结果 camera 字段全是装饰 —— 分镜表上写着 pan/parallax，渲染出来一律是慢推。
 * 「声明了但没人读」的字段比没有字段更糟，因为它让 QC 以为已经在管运镜。
 *
 * ⚠ 太短的镜头同样返回 null（由调用方退回静止机位），规则与 cameraKeysFromMotion 一致。
 */
export function cameraKeysFromPreset(preset, f0, duration, bands, opts = {}) {
  const name = String(preset || '').toLowerCase();
  if (!name || name === 'static' || name === 'none') return null;
  const usable = duration - CAMERA_LIMITS.clear;
  if (usable < CAMERA_LIMITS.min) return null;
  // amount 来自 IR（0–0.12 的位移强度），预设名来自分镜声明：两者各管一半，
  // 否则「authored 写了 pan」和「director 给了 amount」会互相覆盖。
  const amount = Number.isFinite(opts.amount) ? clamp01(opts.amount / 0.12) : 0.5;
  const focus = {x: 640, y: opts.y ?? camCenterY(bands)};
  const len = Math.max(CAMERA_LIMITS.min, Math.min(CAMERA_LIMITS.max, opts.len ?? usable));
  switch (name) {
    case 'pan':
      return CAMERA.pan(f0, {...focus, len, x0: 640 - 60 - amount * 60, x1: 640 + 60 + amount * 60, s: 1.08 + amount * 0.06});
    case 'push':
      return CAMERA.push(f0, {...focus, from: 1, to: Math.min(CAMERA_LIMITS.maxScale, 1.05 + amount * 0.22), len});
    case 'pull':
      return CAMERA.pull(f0, {...focus, from: Math.min(CAMERA_LIMITS.maxScale, 1.2 + amount * 0.1), to: 1, len});
    case 'scroll':
      return CAMERA.scroll(f0, scrollRange(bands, focus, len));
    case 'handoff':
      return CAMERA.handoff(f0, {...focus, len});
    case 'parallax':
      // 视差本身不是相机轨迹，而是「同一段平移下各层位移不同」；
      // 所以预设给一条平缓横移，深度系数由 plan.camera.depths 交给 ParallaxLayer。
      return CAMERA.pan(f0, {...focus, len, x0: 640 - 50 - amount * 40, x1: 640 + 50 + amount * 40, s: 1.04});
    case 'slow_push':
    case 'slowpush':
      return CAMERA.slowPush(f0, {...focus, len});
    default:
      return null;
  }
}

/** 该预设是否需要分层视差（决定 plan.camera.depths）。 */
export const presetHasParallax = (preset) => String(preset || '').toLowerCase() === 'parallax';

/**
 * 静止机位：单关键帧、s=1、对准内容区中心。
 * 两个用途共用这一个构造 —— 显式声明 `camera:"static"`，以及镜头短到没有可运窗口时的兜底。
 * ⚠ 显式 static 必须走这里，**不能**退到 slowPushKeys：否则词表里的 9 个名字有 1 个是假的
 *   （声明了不运镜，画面上却一路慢推），而那正是「声明了但没人读」最坏的形态。
 */
export const staticKeys = (f0 = 1, bands) => [{f: f0, x: 640, y: camCenterY(bands), s: 1}];

/** 无显式 camera 声明时的兜底：1.0→1.05 慢推贯穿（样片允许的例外，仍避开末拍）。 */
export function slowPushKeys(f0, duration, bands) {
  const usable = duration - CAMERA_LIMITS.clear;
  const y = camCenterY(bands);
  // 短镜头兜底成**静止机位**（单关键帧），而不是硬做一段会捅进末拍的慢推。
  if (usable < CAMERA_LIMITS.min) return staticKeys(f0, bands);
  return CAMERA.slowPush(f0, {len: Math.max(CAMERA_LIMITS.min, Math.min(CAMERA_LIMITS.max, usable)), x: 640, y});
}


/** 相机对准内容区中心而不是整幅画布中心：字幕带在底部，对准 (640, H/2) 会把内容推出安全区。 */
export const camCenterY = (bands) => {
  if (!bands) return 360;
  const top = bands.contentTopNoRail ?? 100;
  const bottom = bands.contentBottom ?? 620;
  return Math.round((top + bottom) / 2);
};

/**
 * 相机越推近，可见世界矩形越小；用它校验「推近后元素仍在 cameraSafe 内」。
 * 返回相机对准 (x,y) 时能看见的世界矩形。
 */
export function cameraViewRect(keys, N, bands) {
  const c = camAt(N, keys);
  const w = 1280 / c.s;
  const h = (bands ? bands.subTop : 720) / c.s;
  return {left: c.x - w / 2, right: c.x + w / 2, top: c.y - h / 2, bottom: c.y + h / 2, s: c.s};
}

/** 运镜是否已在末拍前停住（供 QC 与单测直接判）。 */
export function cameraSettlesBeforeExit(keys, duration) {
  if (!keys || keys.length === 0) return true;
  const last = keys[keys.length - 1];
  const first = keys[0];
  if (last.f > duration - CAMERA_LIMITS.clear) return false;
  if (Math.abs(last.s - first.s) < 1e-6 && Math.abs(last.x - first.x) < 1e-6 && Math.abs(last.y - first.y) < 1e-6) return true;
  return last.s <= CAMERA_LIMITS.maxScale + 1e-6;
}
