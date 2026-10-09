/**
 * 画风常量层：调色板（含语义）、字体、画布安全区、主角尺寸档、字号下限。
 *
 * 这里是「画面为什么长这样」的唯一真源，镜头与覆盖层都从这里取常量，不允许在组件里另写一套色值。
 * 16:9 的设计空间就是 1280×720 实际像素（系数 1），所以下面所有 band 常量都能与样片逐像素对齐；
 * 9:16（720×1280）按宽度等比映射到同一套设计单位，纵向空间变高，字号比例保持不变。
 */

import {clamp01, easeOut} from './easing.mjs';
import {
  BLOOM_SPEC,
  GLOW_ORANGE_SPEC,
  GLOW_PURPLE_S_SPEC,
  GLOW_PURPLE_SPEC,
  GLOW_RED_SPEC,
  bloomCss,
  glowCss,
} from './field.mjs';

export {clamp01, easeOut};

// ---- 画布与帧号约定 ----
export const W = 1280;
export const H = 720;
export const FPS = 30;
// 帧号 N 从 1 起：N = useCurrentFrame() + F0（F0 = 镜头起始帧）。
// ⚠ Remotion 的 frame 是 0-based，分镜表与字幕帧号是 1-based，混用会整体偏一帧。

// ---- 调色板（紫色只给当前重点，灰色一律是不活跃项）----
export const PURPLE = '#6630F8';
export const PURPLE_LIGHT = '#A175F1';
export const PURPLE_TECH = '#6530F4';
export const PURPLE_DEEP = '#5A3AD5';
export const PURPLE_PALE = '#E6DCFF';
export const ORANGE = '#F05F41';
export const CORAL = '#F16043';
export const RED_DEEP = '#EC081F';
export const GREEN = '#8FF740';
export const GREY = '#A0A0A1';
export const GREY_MID = '#747474';
export const GREY_LINE = '#4A4A4A';
export const GREY_LIGHT = '#D4D4D4';
export const MAGENTA = '#D100D6'; // 只出现在 glitch 的品红副本里
export const CYAN = '#58FFEE'; // 只出现在 glitch 的青副本里
export const WHITE = '#FFFFFF';
export const BLACK = '#000000';

/**
 * 颜色语义（QC 判据，不能混用）：
 *   紫 = 本片当前重点 / 主角描边；  灰 = 不活跃项、副标、说明；
 *   白 = 结构线与正文；  橙红 = 指标与警示；  绿 = 通过/正确；
 *   品红与青 = 仅允许作为 glitch 切片副本出现，不得单独用于文字或图形。
 */
export const COLOR_MEANING = {
  purple: '当前重点（每章 ≤1 个高光时刻）',
  grey: '不活跃项 / 副标 / 说明',
  white: '结构线与正文',
  orange: '指标 / 警示',
  green: '通过 / 正确',
  magenta: '仅 glitch 品红副本',
  cyan: '仅 glitch 青副本',
};

// 兼容旧代码的 PALETTE 对象（新增键不影响既有引用）。
export const PALETTE = {
  bg: BLACK,
  panel: '#0A0A10',
  line: GREY_LINE,
  lineMid: GREY_MID,
  lineLight: GREY_LIGHT,
  white: WHITE,
  grey: GREY,
  greyMid: GREY_MID,
  purple: PURPLE,
  purpleLight: PURPLE_LIGHT,
  purpleTech: PURPLE_TECH,
  purpleDeep: PURPLE_DEEP,
  purplePale: PURPLE_PALE,
  danger: ORANGE,
  orange: ORANGE,
  coral: CORAL,
  redDeep: RED_DEEP,
  success: GREEN,
  green: GREEN,
  magenta: MAGENTA,
  cyan: CYAN,
};

// ---- 光（光只跟主角，配角不发光）----
// ⚠ 光晕参数不在这里写死：结构化定义在 src/visual/field.mjs，CSS 由 glowCss() 生成，
//   QC 与导出脚本读的是同一份 spec。把字符串再抄一遍回来就等于回到「两处各说各话」。
export {
  GLOW_PURPLE_SPEC,
  GLOW_PURPLE_S_SPEC,
  GLOW_ORANGE_SPEC,
  GLOW_RED_SPEC,
  BLOOM_SPEC,
  glowCss,
  glowOuterRadius,
} from './field.mjs';
export const GLOW_PURPLE = glowCss(GLOW_PURPLE_SPEC);
export const GLOW_PURPLE_S = glowCss(GLOW_PURPLE_S_SPEC);
export const GLOW_ORANGE = glowCss(GLOW_ORANGE_SPEC);
export const GLOW_RED = glowCss(GLOW_RED_SPEC);
/** 白描边图形的通用外 bloom（比 box-shadow 轻，适合大量小件）。 */
export const BLOOM = bloomCss(BLOOM_SPEC);
export const Rgba = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
/** 十六进制混色。⚠ 返回 rgb(...) 字符串，不能再喂回 mixHex（会静默变 NaN）。 */
export const mixHex = (a, b, t) => {
  const p = (h) => {
    const s = String(h).replace('#', '');
    const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ca = p(a);
  const cb = p(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * clamp01(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// ---- 字体角色（一个字体只承担一个角色，混用即风格漂移）----
export const FONT_HEAVY = "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', sans-serif"; // 全部中文：标题 900、标签 600–800、字幕 700
export const FONT_TECH = "'Exo 2', 'Helvetica Neue', sans-serif"; // 英文技术词：紫色粗斜体
export const FONT_WIDE = "'Audiowide', 'Orbitron', sans-serif"; // 宽体展示字（片名 / 大写缩写）
export const FONT_ORB = "'Orbitron', 'Audiowide', sans-serif"; // 数字 / 章序号 / 计数
export const FONT_MONO = "'SF Mono', Menlo, Consolas, monospace"; // 代码 / 等宽
export const FONT_SERIF = "'Times New Roman', Times, serif"; // 公式
export const FONT_EN = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const FONTS = [
  {family: 'Noto Sans SC', file: 'fonts/NotoSansSC.ttf', weight: '100 900'},
  {family: 'Exo 2', file: 'fonts/Exo2-Italic.ttf', weight: '100 900', style: 'italic'},
  {family: 'Audiowide', file: 'fonts/Audiowide-Regular.ttf'},
  {family: 'Orbitron', file: 'fonts/Orbitron[wght].ttf', weight: '400 900'},
];

/** 语言开关影响：压窄系数、基线补偿、字幕与章名预算。 */
export const squeezeFor = (lang) => (lang === 'en' ? 1 : 0.85); // 中文标题压窄 .8–.85；拉丁压窄会变形
export const textDyFor = (lang) => (lang === 'en' ? 0 : -2); // CJK 行盒 ascent 让墨迹比 top 低 3–7px，居中要预扣

// ---- 主角尺寸三档与字号下限 ----
export const HERO_MIN = 170; // 主角高度下限（a2e 硬规则 7）
export const HERO_LARGE = 260;
export const HERO_HUGE = 360;
export const BIG_TEXT_MIN = 96; // 大字型主角的字号下限（与 HERO_MIN 二选一即达标）
export const SUBJECT_SMALL = 110; // 内容区最大物体 <110px 不得持续 >45 帧 → 判「空场」
export const TEXT_MIN = 22; // 画面任何文字不得小于 22px（含被父级 scale 缩小后的实际值）
export const LABEL_SIZE = [26, 34];
export const TITLE_SIZE = [44, 96];
export const SUBTITLE_SIZE = 44;
export const SUBTITLE_STROKE = 4;
export const SUBTITLE_MAX_W = 1160;

// ---- 节拍与编排 ----
export const SHOT_MIN_FRAMES = 120; // 镜头按画面单元分，不按句分
export const BEAT_WINDOW = [-6, 3]; // 元素出现帧必须落在字幕块起始帧 −6…+3
export const SWEEP_WHITELIST_MAX = 2; // 三轮紫光横扫全片 ≤2 处，只给本片核心概念首次登场
export const GLITCH_PER_SHOT_MAX = 1; // 每镜头 ≤1 处 GlitchIn，且只给核心术语
export const HIGHLIGHT_PER_CHAPTER_MAX = 1;
export const CAMERA_PER_CHAPTER_MIN = 3;
export const PARAGRAPH_GAP = 10; // 段内句间
export const PARA_END_GAP = 30; // 段末（= 镜头末）停留
export const CHAPTER_GAP = 45;

/**
 * 设计空间映射：把所有覆盖层与镜头都放进「1280 宽 × logicalH 高的逻辑画布」，
 * 组件内一律写逻辑像素（与样片一致），由 <Design> 统一缩放，避免为两种比例写两套数。
 */
export function design(width, height) {
  const s = width / W;
  const logicalH = Math.round(height / s);
  // band 全部由 logicalH 推导：16:9 时 s=1、logicalH=720，还原样片的 y637–690 / y687–720
  const bands = {
    hudTop: 28,
    hudBottom: 79, // 28 + 51
    railTop: 118,
    railBottom: 162,
    contentTop: 175, // 有流程轨时 y<175 不放内容
    contentTopNoRail: 100,
    contentBottom: logicalH - 100, // = subTop − 17
    subTop: logicalH - 83, // 16:9 → 637
    subBottom: logicalH - 30, // 16:9 → 690
    barTop: logicalH - 33, // 16:9 → 687
    barBottom: logicalH,
    left: 60,
    right: W - 60, // x60–1220
  };
  // 慢推安全区：运镜不得把元素推出这些边界。
  // ⚠ 必须按画幅推导，不能写死 16:9 的那组数：竖屏逻辑画布高 2276，
  //   写死 y122–607 会让相机在竖屏里按「只覆盖顶部四分之一」的边界限位，
  //   慢推推到画面中部就被判出界 —— 画面本身没问题，是判据坐标系错了。
  //   16:9 时它仍然还原样片实测的 x89–1191 / y122–607。
  const insetX = Math.round(W * 0.0695); // 89 / 1280
  const cameraSafe = {
    left: insetX,
    right: W - insetX,
    top: Math.max(122, bands.contentTop - 53),
    bottom: Math.min(logicalH - 113, bands.contentBottom - 13),
  };
  return {s, width: W, height: logicalH, device: {width, height}, bands, cameraSafe};
}

// ---- 兼容旧签名（既有代码仍按左右上下边距取安全区）----
export const SAFE = {
  wide: {left: 72, right: 72, top: 82, bottom: 122},
  tall: {left: 44, right: 44, top: 92, bottom: 184},
};

export function safeArea(width, height) {
  return width > height ? SAFE.wide : SAFE.tall;
}

export function sceneLocalFrame(frame, scene, fps = FPS) {
  return Math.max(0, frame - Math.round(scene.start * fps));
}

export function sceneProgress(frame, scene, fps = FPS) {
  const length = Math.max(1, Math.round(scene.duration * fps));
  return clamp01(sceneLocalFrame(frame, scene, fps) / length);
}

/**
 * 由解说词与画面文字共同校验的最小排版闸门（供脚本与 QC 复用）。
 * 返回问题列表，空数组表示通过。
 */
export function typographyIssues(items) {
  const bad = [];
  for (const it of items || []) {
    if (Number(it.fontSize) < TEXT_MIN) {
      bad.push(`${it.id || '?'}: 字号 ${it.fontSize} < ${TEXT_MIN}px`);
    }
    if (Number(it.height) > 0 && Number(it.height) < SUBJECT_SMALL && it.sustainedFrames > 45) {
      bad.push(`${it.id || '?'}: 最大物体 ${it.height}px 持续 ${it.sustainedFrames} 帧 > 45`);
    }
  }
  return bad;
}
