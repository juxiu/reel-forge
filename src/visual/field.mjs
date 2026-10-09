/**
 * 画面「场」常量与 QC 测量判据的唯一真源（纯数据，无 JSX、无依赖）。
 *
 * 为什么单独一个模块：渲染层与测量层必须用同一组数。此前 DOT_FIELD / STAR_FIELD 写在
 * Primitives.jsx、SET_PIECE 写在 Fx.jsx、柔光与主角判据只存在于 Python 脚本的字面量里，
 * 结果是 QC 在量一个渲染层根本没用的东西 —— 数值对不上时两边都不会报错，
 * 「主角 ≥170px」「紫色碎片 ≤8」「hold ≥30f」变成三处各写一遍的口头约定。
 *
 * ⚠ 本模块只允许出现**纯数据与纯函数**：JSX 从这里 import 并原样 re-export，
 *   node 侧的 scripts/export-visual-contracts.mjs 也直接 import 它，
 *   这样 fixtures/visual_contracts.json 里的数与画面上的数同源。
 *   任何需要 palette 色值的推导都放在导出脚本里做，这里不 import style.mjs，避免循环依赖。
 */

// ---- 幕底：点阵波（bg:'dots'，默认）----
/**
 * 逻辑像素（1280 宽设计空间）网格。step/x0/y0 = 样片 960×540 空间的 36/24/18 × 1280/960。
 * r 是 SVG circle 半径，sweepPeriod 是一趟高光扫完整幅的帧数，halo 是「距扫描线多近才算被点亮」。
 * QC 侧需要它来生成掩膜：不抠掉点阵，波前亮点会被数成背景碎屑（见 MEASURE.debris）。
 */
export const DOT_FIELD = {
  step: 48,
  x0: 32,
  y0: 24,
  /**
   * 画出来的点半径。a2e 在 960×540 设计空间里画 `arc(x, y, 1.5 + 0.5k²)` 再整体 ×4/3 投到 1280，
   * 屏幕半径 2.0–2.67；这里的设计空间就是 1280 宽，所以直接写上限 2.5。
   * ⚠ 曾经写成 6.7（≈5×4/3），把 a2e 的**掩膜半径**当成了**点半径**：点变成 14px 宽的圆片，
   * 幕底从「细密针尖」变成「网格盘」，同时 frame_metrics 的掩膜（半径 5）盖不住点，
   * 残留的边角在 ±20 结构元膨胀后横向连成一整行 —— 空场量出 1255px「主角」，判据全废。
   */
  r: 2.5,
  base: '#0b0c11',
  dot: '#cfe0ff',
  sweepPeriod: 279, // ≈9.3 s @30fps
  halo: 220,
  grain: 0.06,
  /**
   * 掩膜余量（设计单位）：掩膜半径 = r + 这个余量，由 export-visual-contracts 折算到设备像素。
   * 不写成绝对值 5 是因为它必须跟着 r 走 —— SVG 圆有抗锯齿边、9:16 还要 ×0.5625 缩放，
   * 手写常数在其中一个画幅里就会小于实际点半径，而「掩膜小于点」的失败是静默的。
   */
  qc_mask_margin: 1.5,
};

// ---- 幕底：星点雾（bg:'stars'，可选）----
export const STAR_FIELD = {count: 80, twinkle: 0.3, size: [2, 4], brightness: [35, 255], seed: 7, rise: 5};

// ---- 光（光只跟主角，配角不发光）----
/**
 * box-shadow 用结构化数据写，CSS 字符串由 glowCss() 生成。
 * 这样 QC 才能问「紫色光晕的半径/alpha 到底是多少」，而不是去正则解析一串 CSS。
 *
 * ⚠ 这里的颜色是 102,45,248（#662DF8），与 style.mjs 的 PURPLE=#6630F8（102,48,248）绿通道差 3。
 *   这是样片实测值原样搬过来的结果，不是笔误的推断：改动会让所有光晕的色相微移，
 *   而在不能渲染比对的前提下不该动它。导出脚本会把两个值都写进 contracts，
 *   留待第一次真机渲染时二选一并统一到一处。
 */
export const GLOW_PURPLE_SPEC = {
  color: {r: 102, g: 45, b: 248},
  layers: [
    {dx: 0, dy: 0, blur: 12, spread: 3, alpha: 0.35},
    {dx: 0, dy: 0, blur: 42, spread: 14, alpha: 0.45},
  ],
};
export const GLOW_PURPLE_S_SPEC = {
  color: {r: 102, g: 45, b: 248},
  layers: [
    {dx: 0, dy: 0, blur: 8, spread: 2, alpha: 0.32},
    {dx: 0, dy: 0, blur: 24, spread: 8, alpha: 0.38},
  ],
};
export const GLOW_ORANGE_SPEC = {
  color: {r: 240, g: 95, b: 65},
  layers: [
    {dx: 0, dy: 0, blur: 12, spread: 3, alpha: 0.35},
    {dx: 0, dy: 0, blur: 42, spread: 14, alpha: 0.42},
  ],
};
export const GLOW_RED_SPEC = {
  color: {r: 236, g: 8, b: 31},
  layers: [
    {dx: 0, dy: 0, blur: 12, spread: 3, alpha: 0.35},
    {dx: 0, dy: 0, blur: 42, spread: 14, alpha: 0.42},
  ],
};
export const BLOOM_SPEC = {dropShadow: {dx: 0, dy: 0, blur: 3, color: {r: 255, g: 255, b: 255}, alpha: 0.5}};

/** CSS 里 .35 与 0.35 等价，但为了「改成数据驱动后画面一个像素都不动」，这里原样保留去前导零的写法。 */
const fmtAlpha = (a) => String(a).replace(/^0\./, '.');
export const glowCss = (spec) =>
  spec.layers.map((l) => `${l.dx} ${l.dy} ${l.blur}px ${l.spread}px rgba(${spec.color.r},${spec.color.g},${spec.color.b},${fmtAlpha(l.alpha)})`).join(', ');
export const bloomCss = (spec) =>
  `drop-shadow(${spec.dropShadow.dx} ${spec.dropShadow.dy} ${spec.dropShadow.blur}px rgba(${spec.dropShadow.color.r},${spec.dropShadow.color.g},${spec.dropShadow.color.b},${fmtAlpha(spec.dropShadow.alpha)}))`;

/** 光晕的「外接半径」：QC 判主角区柔光范围时用的量纲来源（blur+spread）。 */
export const glowOuterRadius = (spec) => Math.max(...spec.layers.map((l) => l.blur + l.spread));

// ---- 高光时刻标准时序 ----
/** 「登场型」高光时刻相对帧（T0 = 镜头起始/清场帧，T1 = 主角节拍帧）。 */
export const SET_PIECE = {
  sweeps: [4, 22, 40], // 三轮 LightSweep 起始（相对 T0）
  line: 18, // StageLine 起始（相对 T0）
  ghost: 37, // GhostText 起始（相对 T0）
  pulse: 12, // emphasisPulse 起始（相对 T1）
  sub: 16, // 中文副标 slideUp Δ80/22（相对 T1）
  pills: 24, // 拆词/标签 SoftIn 2 帧错峰（相对 T1）
  minLen: 90, // 高光时刻镜头最短帧数
};

// ======================================================================
// 测量层判据（frame_metrics / motion_check 与 QC agent 共用）
//
// 口径先于阈值：lum/sat 怎么从 RGB 来、形态学元多大、什么算一个「物体」，
// 这些定义如果两边不一致，阈值就对不上号，报出来的 FAIL 没有意义。
// ======================================================================

/** 灰度：Rec.601 整数近似，与样片统计脚本同口径（lum = (r*299+g*587+b*114)/1000）。 */
export const LUMA = {coeffs: [299, 587, 114], divisor: 1000};
/** 饱和度：(max-min)/max，不是 HSL 的 s —— 两处必须同一个公式，否则 0.25 这条线没意义。 */
export const SATURATION = {formula: 'max-min over max'};

/** 主角尺度怎么从亮像素团块算出来。 */
export const HERO_MEASURE = {
  struct: {x: 41, y: 13}, // 横 41 / 纵 13：把一行大字的字距（≤40px）并成一个物体，但不会把间距 ≥50 的胶囊行并起来
  min_ink_px: 30, // 少于 30 个亮像素的是星点/噪点，不成物体
  bright_luma: 120, // 亮像素判据（luma > 120）
  small_box: 60, // h<60 且 w<60 → 记为背景碎屑，不是主体
  width_over_height: 4, // 宽物体的折算上限：min(w, 4h)
  width_divisor: 2.5, // size = max(h, min(w, 4h) / 2.5)：一行大字按整行计，细线几乎不加分
  no_content_bright_px: 200, // 全帧亮像素 < 200 → 这帧没内容，主角尺度记 0（不掺进中位数）
  glow_pad_px: 30, // 统计「主角区柔光」时向主角框外扩 30px
};

/** 柔光（雾状发光）判据：扫光 / 光线 / 光环 / 主角外 bloom 都落在这个区间。 */
export const SOFT_GLOW = {
  sat_min: 0.25,
  lum_min: 10,
  lum_min_dots: 22, // 点阵幕底 #0b0c11 自带一点蓝（sat≈.35、lum≈12），会整屏误判成柔光 → dots 模式下限抬到 22
  lum_max: 110,
  activity_px: 10000, // 内容区柔光 ≥ 10000px² = 大面积光活动，该帧不算空场
  hero_area_min: 800, // 主角区柔光中位 < 800px² → 判「主角无光」
};

/** 紫色碎片：实心紫（排除柔光雾与虚线波纹），紫 = 当前重点，多了就等于没有重点。 */
export const PURPLE_DEBRIS = {
  channel_rule: 'b>r>g',
  sat_min: 0.45,
  lum_min: 45,
  struct: {x: 25, y: 7}, // 把一行字的逐字硬投影并成一块
  min_area_px: 80,
  median_max: 8, // 中位 ≥8 块 → 「低:紫色碎片」
};

/** 空场：没有够大的主体，且没有大面积光活动。 */
export const EMPTY_FIELD = {
  hero_min: 110, // = style.mjs 的 SUBJECT_SMALL；持续 >45 帧判空场
  sustained_frames_max: 45,
  severe_hero_px: 80, // 中位主体 <80px → 升到「高」级
  debris_count_median_max: 10, // 小团块中位 ≥10 → 「中:背景碎屑」
};

/** 运动/停留：静与动都过量是缺陷，落位不住也是缺陷。 */
export const MOTION = {
  sample_width: 320, // 灰度采样统一宽度；高度按画幅比例推，别把 9:16 压成 16:9
  // 纯 python 没有 PIL 的 jpeg draft 解码，每帧都得完整解压才能做帧差，所以抽帧步长就是成本旋钮：
  // motion_step 决定「隔几帧算一次差」，实测帧数除以它才是真实秒数。
  step: 3,
  analysis_step: 4, // 全分辨率构图分析步长（主体尺度/柔光/碎片），比帧差更贵
  still_thr: 0.35, // 采样图逐帧平均差 < 0.35 = 静止帧
  hold_thr: 1.5, // 「无大面积变化」：落位后的动词动作 0.4–1.2，入场/运镜 2.5+
  still_max_seconds: 3.0, // 完全静止 >3 s 才是缺陷；不为凑动作给静止物体加漂浮
  hold_min_frames: 30, // = CAMERA_LIMITS.clear：离场前必须停住这么久
  exit_brightness_k: 0.9, // 亮度掉到尾段中位数的这个比例以下 = 已在离场
  exit_tail_frames: 20,
  glow_off_frames: 6, // 离场前先灭光的帧数算离场，不算 hold
  diff_px_thr: 25, // 全分辨率逐像素差 >25 才算变化像素
  class_true_static: 800, // 变化像素中位 <800 → 真静（该给动词动作）
  class_small_motion: 2500, // 800–2500 → 小面积动作（该加大幅度）；>2500 → 其实有动作，是采样太粗
};

/**
 * QC 取景区（设计单位）：HUD 与字幕/进度条都不进统计。
 * 与相机对准的 contentTopNoRail/contentBottom 同一条带 —— 运镜取景的画面和 QC 量的画面必须是同一块。
 */
export const qcZone = (bands) => ({top: bands.contentTopNoRail, bottom: bands.contentBottom});

/** rail 型镜头（有流程轨）的内容区上界另取 contentTop。 */
export const qcZoneWithRail = (bands) => ({top: bands.contentTop, bottom: bands.contentBottom});

/**
 * 把设计单位的取景区换算成某个画幅的「设备像素」与「采样像素」坐标。
 * 导出脚本逐画幅调用它，contracts.json 里因此是可直接用的数，Python 侧不再抄第二遍常量。
 */
export function qcZoneScaled(bands, deviceWidth, deviceHeight) {
  const s = deviceWidth / 1280;
  const logicalH = Math.round(deviceHeight / s);
  const k = deviceHeight / logicalH; // ≈s，但按 logicalH 取整后以设备高度为准
  const zone = qcZone(bands);
  const sampleWidth = MOTION.sample_width;
  const sampleHeight = Math.round((sampleWidth * deviceHeight) / deviceWidth);
  const toSample = (y) => Math.round((y * k * sampleHeight) / deviceHeight);
  return {
    design: zone,
    device: {top: Math.round(zone.top * k), bottom: Math.round(zone.bottom * k)},
    sample: {
      width: sampleWidth,
      height: sampleHeight,
      top: toSample(zone.top),
      bottom: toSample(zone.bottom),
    },
    logicalHeight: logicalH,
    deviceToLogical: k,
  };
}
