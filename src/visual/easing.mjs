// 缓动与关键帧。数值取自样片逐帧实测的公式（对应参照 reference/motion-vocabulary.md 的帧数预算），
// 全部纯函数、无副作用，因此同一帧在任何机器上渲染结果一致。
// n = 相对起始帧的帧数（N − f0）；t = 归一化进度 0→1。

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (t, t0, t1, v0, v1) => (t1 === t0 ? v1 : v0 + (v1 - v0) * clamp((t - t0) / (t1 - t0), 0, 1));

/** 自下滑入进度 0→1：1 − (1 − n/N)^p。样片实测 Δ305 / 图标组 Δ320 / 上箭头 Δ172 三处均吻合 (1−n/22)^2.5。 */
export const slideIn = (n, N = 22, p = 2.5) => 1 - Math.pow(1 - clamp01(n / N), p);
/** 幂缓出的「剩余量」 (1 − n/N)^p，直接乘位移 Δ 用。 */
export const powOutRemain = (n, N = 22, p = 2.5) => Math.pow(1 - clamp01(n / N), p);
/** 指数缓出 1 − k^n（横向标签滑入 k≈0.92；段首重排版 k≈0.78）。 */
export const expOut = (k) => (n) => (n <= 0 ? 0 : 1 - Math.pow(k, n));
/** 幂缓入 t^p（离场加速用，实测幂 1.7–2.0）。 */
export const powIn = (p) => (t) => Math.pow(clamp01(t), p);
/** 幂 easeInOut：运镜与整页滚动用（样片整页滚动 p=2.5、N=43）。 */
export const easeInOutPow = (p = 2.5) => (t) => {
  const u = clamp01(t);
  return u < 0.5 ? 0.5 * Math.pow(2 * u, p) : 1 - 0.5 * Math.pow(2 - 2 * u, p);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = easeInOutPow(3);
export const easeOutQuad = (t) => 1 - Math.pow(1 - clamp01(t), 2);
/** 兼容旧调用：easeOut(t, p) ≡ 1 − (1 − t)^p。 */
export const easeOut = (value, power = 2.5) => 1 - Math.pow(1 - clamp01(value), power);

/** CSS cubic-bezier(x1,y1,x2,y2) 求值（牛顿迭代 + 二分兜底）。 */
export const cubicBezier = (x1, y1, x2, y2) => {
  const A = (a1, a2) => 1 - 3 * a2 + 3 * a1;
  const B = (a1, a2) => 3 * a2 - 6 * a1;
  const C = (a1) => 3 * a1;
  const calc = (u, a1, a2) => ((A(a1, a2) * u + B(a1, a2)) * u + C(a1)) * u;
  const slope = (u, a1, a2) => 3 * A(a1, a2) * u * u + 2 * B(a1, a2) * u + C(a1);
  return (t) => {
    const x = clamp01(t);
    if (x === 0 || x === 1) return x;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(u, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      u -= (calc(u, x1, x2) - x) / s;
    }
    if (u < 0 || u > 1 || Math.abs(calc(u, x1, x2) - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        u = (lo + hi) / 2;
        if (calc(u, x1, x2) < x) lo = u;
        else hi = u;
      }
    }
    return calc(u, y1, y2);
  };
};
/** 21 帧缩放入场曲线 cubic-bezier(0.10,0.10,0.35,1)。scale = s0 + (s1−s0)·BEZ_SCALE_IN(n/21)。 */
export const BEZ_SCALE_IN = cubicBezier(0.1, 0.1, 0.35, 1);

/**
 * 强调缩放脉冲：scale 1 → peak → 1，去 up 帧、停 hold 帧、回 down 帧，easeInOut，不改透明度。
 * 连接线/箭头不参与；与字幕起始同步（字幕起 +2 帧开始）。n≤0 或结束后返回 1。
 */
export const emphasisPulse = (n, opts = {}) => {
  const {peak = 1.11, up = 13, hold = 4, down = 13, ease = easeInOutPow(2.5)} = opts;
  if (n <= 0) return 1;
  if (n < up) return 1 + (peak - 1) * ease(n / up);
  if (n < up + hold) return peak;
  if (n < up + hold + down) return peak - (peak - 1) * ease((n - up - hold) / down);
  return 1;
};

/**
 * 分段插值关键帧。
 * ⚠ 首值陷阱：t < 首关键帧时返回**首值**（不是 0）。中段才生效的曲线必须以 [镜头起始帧, 起始值] 开头，
 *   否则镜头前半段会一直停在第一个关键帧的值上。t > 末关键帧返回末值。
 */
export const keyframes = (t, kf) => {
  if (!kf || kf.length === 0) return 0;
  if (t <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    if (t <= kf[i][0]) return lerp(t, kf[i - 1][0], kf[i][0], kf[i - 1][1], kf[i][1]);
  }
  return kf[kf.length - 1][1];
};
/** 同 keyframes，但可对每段内进度施加缓动。 */
export const kf = (t, pairs, ease = (u) => u) => {
  if (!pairs || pairs.length === 0) return 0;
  if (t <= pairs[0][0]) return pairs[0][1];
  for (let i = 1; i < pairs.length; i++) {
    const t0 = pairs[i - 1][0];
    const v0 = pairs[i - 1][1];
    const t1 = pairs[i][0];
    const v1 = pairs[i][1];
    if (t <= t1) return t1 === t0 ? v1 : v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
  }
  return pairs[pairs.length - 1][1];
};
/** 阶梯保持：取最近一个 ≤t 的关键帧值（硬切序列、glitch 状态机用）。 */
export const stepHold = (t, pairs) => {
  if (!pairs || pairs.length === 0) return 0;
  if (t < pairs[0][0]) return pairs[0][1];
  for (let i = pairs.length - 1; i >= 0; i--) if (t >= pairs[i][0]) return pairs[i][1];
  return pairs[0][1];
};
export const stepKf = stepHold;

/**
 * 确定性伪随机 [0,1)（按任意个数字种子）。画面抖动/粒子只能用这个，禁止 Math.random——
 * 否则同一帧每次渲染不同，QC 复测和视觉回归全部失去意义。
 */
export const rnd = (...seeds) => {
  let h = 2166136261;
  for (const s of seeds) {
    h ^= Math.floor(s * 1000003) & 0xffffffff;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(0x5bd1e995, h);
  h ^= h >>> 15;
  return ((h >>> 0) % 100000) / 100000;
};

// ---- 入场 / 离场 / 停留的帧数预算（与 reference/motion-vocabulary.md 同一张表）----
export const BEAT = {
  SOFT_IN: 8, // 配角与标签淡入
  FADE_IN: 12, // 标准淡入
  FADE_OUT: 15,
  GLITCH_IN: 12, // 只给该镜头核心术语（闪烁白名单）
  SLIDE_UP: 22, // 自下滑入 Δ≤320
  LATERAL: 18, // 横向滑入 Δ260–320
  SCALE_IN: 21, // BEZ_SCALE_IN
  STAGGER: 2, // 逐元素错峰
  DRAW_ON: 22, // 描线 16–28
  TYPEWRITER_PER_CHAR: 2,
  COUNTER: 20, // 大数字计数 14–26
  GLOW_ON: 8, // 主角灯亮
  GLOW_OFF: 6, // 主角灯灭（另有 8 帧收尾）
  EXIT_ACCEL_P: 1.6, // 离场加速幂
  EXIT_HOLD_MIN: 30, // 末拍落位后必须停 30–45 帧
  EXIT_HOLD_MAX: 45,
  STILL_MAX_FRAMES: 90, // 最长静止 3 s（>90 帧判缺陷）
  CAMERA_MIN: 20,
  CAMERA_MAX: 45,
  CAMERA_CLEAR: 30, // 运镜结束到离场起点 ≥30 帧
};

/** 淡入：0→1，n<0 为 0。 */
export const fadeIn = (n, len = BEAT.FADE_IN) => clamp01(n / len);
/** SoftIn 淡入（配角/标签）。 */
export const softIn = (n, len = BEAT.SOFT_IN) => clamp01(n / len);
/**
 * 低起点淡入：给「入场后不能全静」的元素用。
 * ⚠ 两条实测根因（判据数字只在 field.mjs 里有一份，这里只说后果）：
 *   1) fadeIn(0)=0 —— 首帧不可见，frame_metrics 按「全帧亮像素 < HERO_MEASURE.no_content_bright_px
 *      就当这帧没内容」判，主角尺度记 0，接着被 EMPTY_FIELD 判成空场缺陷；
 *   2) 起点即使只有 25% 也仍可能低于 bright_luma(120)/SOFT_GLOW 的可见下限，需要可见首帧时用
 *      firstOp（起点 57%）。
 * 所以这里 n=0 直接给起点值而不是从 0 爬，且保证随 n 单调不降。n<0 表示尚未入场。
 */
export const softOp = (n, len = 8, from = 0.25) => (n < 0 ? 0 : from + (1 - from) * clamp01(n / len));
export const firstOp = (n, len = 6, from = 0.57) => (n < 0 ? 0 : from + (1 - from) * clamp01(n / len));
/** 离场淡出：线性 6–12 帧。 */
export const exitFade = (n, len = BEAT.FADE_OUT) => 1 - clamp01(n / len);
/** 离场加速下坠：Δ = 440·(n/11)^2，α = 1 − (n/len)^1.6。覆盖层与镜头末拍用。 */
export const exitDrop = (n, len = 12, p = BEAT.EXIT_ACCEL_P) => ({
  opacity: 1 - Math.pow(clamp01(n / len), p),
  dy: 440 * Math.pow(clamp01(n / (len - 1)), 2),
});
/** 离场加速上抬（章节卡/片尾用）：α = 1 − t^p，dy 同步加速。 */
export const exitRise = (n, len = 12, delta = 320, p = BEAT.EXIT_ACCEL_P) => ({
  opacity: 1 - Math.pow(clamp01(n / len), p),
  dy: -delta * Math.pow(clamp01(n / len), p),
});
/** 逐元素错峰帧偏移（2 帧/元素是样片的默认节奏）。 */
export const stagger = (i, step = BEAT.STAGGER) => i * step;
/** 打字机：每 CHAR 帧出一个字符，返回已显示字符数。 */
export const typedCount = (n, perChar = BEAT.TYPEWRITER_PER_CHAR) => Math.max(0, Math.floor(n / perChar));
/** 描线进度 0→1（draw-on 16–28 帧，幂 2 缓出）。 */
export const drawOn = (n, len = BEAT.DRAW_ON) => 1 - Math.pow(1 - clamp01(n / len), 2);
/** 元素节拍：对应字幕块起始帧 subFrom，入场窗口 −6…+3。 */
export const beatN = (N, subFrom, offset = -4) => N - (subFrom + offset);
