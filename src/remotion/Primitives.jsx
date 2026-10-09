import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  BEAT_WINDOW,
  FONT_EN,
  FONT_HEAVY,
  FONT_MONO,
  FONT_ORB,
  FONT_TECH,
  FONT_WIDE,
  GREY,
  GREY_LINE,
  GREY_MID,
  PURPLE,
  PURPLE_LIGHT,
  PURPLE_PALE,
  Rgba,
  SUBTITLE_MAX_W,
  SUBTITLE_SIZE,
  SUBTITLE_STROKE,
  TEXT_MIN,
  W,
  WHITE,
  clamp01,
} from '../visual/style.mjs';
import {DOT_FIELD, STAR_FIELD} from '../visual/field.mjs';
import {clamp, clamp01 as c01, easeInOutPow, exitDrop, fadeIn, powOutRemain, rnd, slideIn, softOp} from '../visual/easing.mjs';
import {EM_HEAVY, EM_ORB, EM_TECH, EM_WIDE, fitSize, textW} from '../visual/textfit.mjs';
import {abs, useDesign} from './Design.jsx';
import {GLITCH_SEQ, GlitchIn} from './Glitch.jsx';

/**
 * 基础图元与常驻覆盖层。
 *
 * 约定（与 docs/VISUAL_GRAMMAR.md 同一套判据）：
 *   1) 所有坐标是设计空间逻辑像素（16:9 时 1px = 1px），由 <Design> 统一缩放；
 *   2) 文字一律过 fitSize 兜底，但真正的长度约束在文案侧——缩到极限仍超宽就是文案缺陷；
 *   3) 紫色只给当前重点，灰色一律不活跃项，品红/青只允许作为 glitch 副本出现；
 *   4) 画面任何文字实际显示字号不得小于 TEXT_MIN(22px)，父级 scale 会把它压穿，注意乘算。
 */

export {abs, useDesign};
export const COLORS = {PURPLE, PURPLE_LIGHT, PURPLE_PALE, GREY, GREY_MID, GREY_LINE, WHITE};
export {FONT_HEAVY, FONT_TECH, FONT_WIDE, FONT_ORB, FONT_MONO, FONT_EN, PURPLE, PURPLE_LIGHT, PURPLE_PALE, GREY, GREY_MID, GREY_LINE, WHITE};

// ---------------- 文本 ----------------
/**
 * 居中文本（以 (cx,cy) 为视觉中心）。CJK 的 ascent 让墨迹比 top 低 3–7px，所以默认 dy=-2 预扣。
 * scaleX 压窄只用于中文标题（.8–.85）；拉丁字母压窄会变形，一律 1。
 * stroke 只给字幕与幽灵轮廓用（白描边 = 轮廓宽度）。
 */
export const CText = ({cx, cy, size, children, color = WHITE, weight = 700, family = FONT_HEAVY, letterSpacing = 0, opacity = 1, dy = -2, scaleX = 1, shadow, stroke, tabular = false, align = 'center', maxW, emScale, style}) => {
  let fontSize = size;
  const em = emScale ?? emFor(family);
  if (maxW) fontSize = fitSize(String(children ?? ''), maxW, size, size * 0.78, em, letterSpacing);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        textAlign: align,
        transform: `translate(${(cx - W / 2).toFixed(2)}px, ${(cy - fontSize / 2 + dy).toFixed(2)}px) scaleX(${scaleX})`,
        transformOrigin: `${cx.toFixed(1)}px 50%`,
        color,
        fontFamily: family,
        fontWeight: weight,
        fontSize,
        lineHeight: 1,
        letterSpacing,
        opacity,
        whiteSpace: 'pre',
        fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
        textShadow: shadow,
        WebkitTextStroke: stroke,
        paintOrder: stroke ? 'stroke fill' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 各字体的 em 宽度系数（与 textfit.mjs 同一张表）。 */
export const emFor = (family) => {
  const f = String(family || '');
  if (f.includes('Audiowide')) return EM_WIDE;
  if (f.includes('Orbitron')) return EM_ORB;
  if (f.includes('Exo')) return EM_TECH;
  return EM_HEAVY;
};

/** 左上角锚定的文本标签。 */
export const Label = ({x, y, children, color = WHITE, size = 26, weight = 800, family = FONT_HEAVY, align = 'left', opacity = 1, maxW, letterSpacing = 0, scaleX = 1, style}) => {
  const em = emFor(family);
  const fontSize = maxW ? fitSize(String(children ?? ''), maxW, size, size * 0.78, em, letterSpacing) : size;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        color,
        fontFamily: family,
        fontWeight: weight,
        fontSize,
        lineHeight: 1.25,
        letterSpacing,
        opacity,
        textAlign: align,
        transform: scaleX === 1 ? undefined : `scaleX(${scaleX})`,
        maxWidth: maxW,
        whiteSpace: maxW ? 'normal' : 'pre',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 英文技术词：紫色粗斜体 + 压窄（样片里所有英文术语的唯一写法）。 */
export const TechText = ({x, y, children, size = 30, color = PURPLE_LIGHT, opacity = 1, weight = 700, scaleX = 0.8}) => (
  <Label x={x} y={y} size={size} color={color} opacity={opacity} weight={weight} family={FONT_TECH} letterSpacing={0.5} scaleX={scaleX}>
    {children}
  </Label>
);
export const CTech = ({cx, cy, children, size = 34, color = PURPLE_LIGHT, opacity = 1, letterSpacing = 2, weight = 700}) => (
  <CText cx={cx} cy={cy} size={size} color={color} opacity={opacity} weight={weight} family={FONT_TECH} letterSpacing={letterSpacing} maxW={W - 160} emScale={EM_TECH}>
    {children}
  </CText>
);
/**
 * 中英配对的小字副标：主体是章名/胶囊时，另一种语言用灰色小字副标，
 * 不用紫色、不与主体同大小（覆盖层中英配对判据）。
 */
export const TechSub = ({cx, cy, children, size = 26, opacity = 1, hud = false}) => (
  <CText cx={cx} cy={cy} size={hud ? 22 : size} color={GREY} opacity={opacity} weight={500} family={FONT_TECH} letterSpacing={0.6} maxW={W - 200} emScale={EM_TECH}>
    {children}
  </CText>
);
export const MonoText = ({x, y, children, size = 24, color = WHITE, opacity = 1}) => (
  <Label x={x} y={y} size={size} color={color} opacity={opacity} weight={500} family={FONT_MONO}>
    {children}
  </Label>
);

// ---------------- 入场容器 ----------------
/** SoftIn：非重点元素的唯一入场方式（8 帧淡入，可叠 Δ≤120 的自下滑入）。 */
export const SoftIn = ({N, f0, children, len = 8, dy = 0, style}) => {
  const n = N - f0;
  if (n < 0) return null;
  const op = softOp(n, len);
  const ty = dy ? dy * powOutRemain(n, 22, 2.5) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: op, transform: ty ? `translateY(${ty.toFixed(2)}px)` : undefined, ...style}}>
      {children}
    </div>
  );
};
/** GlitchIn 的语义化别名：只允许出现在闪烁白名单里的镜头核心术语。 */
export const FocusIn = ({N, f0, children, seq = GLITCH_SEQ, style, seed = 1}) => (
  <GlitchIn N={N} f0={f0} seq={seq} seed={seed} style={style}>
    {children}
  </GlitchIn>
);

// ---------------- 容器与线 ----------------
export const Box = ({x, y, w, h, border = GREY_LINE, fill = 'rgba(0,0,0,0)', radius = 10, sw = 2.5, children, style, bloom = true, glow = false}) => (
  <div
    style={{
      ...abs(x, y, w, h),
      boxSizing: 'border-box',
      border: `${sw}px solid ${border}`,
      borderRadius: radius,
      background: fill,
      filter: bloom ? 'drop-shadow(0 0 3px rgba(255,255,255,.35))' : undefined,
      boxShadow: glow ? '0 0 12px 3px rgba(102,45,248,.35), 0 0 42px 14px rgba(102,45,248,.45)' : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);
/** 胶囊：HUD / 标签。宽度按实测字宽算，避免写死宽度导致文字被截或两侧留白失衡。 */
export const pillWidth = (text, size = 24) => Math.max(216, textW(String(text ?? ''), size, EM_HEAVY) + 60);
export const Pill = ({x, y, text, size = 24, color = WHITE, border = GREY_LINE, active = false, opacity = 1, w}) => {
  const width = w ?? pillWidth(text, size);
  return (
    <div
      style={{
        ...abs(x, y, width, 44),
        boxSizing: 'border-box',
        borderRadius: 22,
        border: `1.5px solid ${active ? PURPLE : border}`,
        background: active ? 'rgba(102,48,248,.14)' : 'rgba(0,0,0,.7)',
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? PURPLE_LIGHT : color,
        fontFamily: FONT_HEAVY,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 0.5,
      }}
    >
      {text}
    </div>
  );
};
/** 顶部胶囊 HUD 单元（固定位 y28、高 51；宽度 = 实测字宽 + 60，最小 216）。 */
export const TopCapsule = ({x = 533, y = 28, text, size = 33, color = WHITE, opacity = 1, sub, w}) => {
  const width = w ?? Math.max(216, textW(String(text ?? ''), size, EM_HEAVY) + 60);
  return (
    <>
      <div
        style={{
          ...abs(x, y, width, 51),
          boxSizing: 'border-box',
          borderRadius: 26,
          border: '1.5px solid rgba(255,255,255,.32)',
          background: 'rgba(0,0,0,.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          color,
          fontFamily: FONT_HEAVY,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: 1,
        }}
      >
        {text}
      </div>
      {sub ? <TechSub cx={x + width / 2} cy={y + 51 + 14} size={22} opacity={opacity * 0.85} hud>{sub}</TechSub> : null}
    </>
  );
};
/** 标签块（237×62，横向压窄 .8，1.5px 描边）。 */
export const TagBlock = ({x, y, text, size = 26, color = WHITE, active = false, opacity = 1, w = 237, h = 62}) => (
  <div
    style={{
      ...abs(x, y, w, h),
      boxSizing: 'border-box',
      borderRadius: 8,
      border: `1.5px solid ${active ? PURPLE : GREY_LINE}`,
      background: active ? 'rgba(102,48,248,.16)' : 'rgba(0,0,0,.8)',
      opacity,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: 'scaleX(.8)',
      color: active ? PURPLE_LIGHT : color,
      fontFamily: FONT_HEAVY,
      fontWeight: 800,
      fontSize: size,
    }}
  >
    {text}
  </div>
);

/**
 * SVG 容器：全片白描边图形的统一入口（2–3px 白描边、黑填充、轻 bloom）。
 * ⚠ 性能红线：单帧 SVG filter ≤6 个；禁用 feConvolveMatrix；filter 一律 colorInterpolationFilters="sRGB"。
 */
export const Svg = ({children, x = 0, y = 0, w = W, h, opacity = 1, style, bloom = true, zIndex}) => {
  const d = useDesign();
  return (
    <svg
      width={w}
      height={h ?? d.height}
      viewBox={`0 0 ${w} ${h ?? d.height}`}
      style={{position: 'absolute', left: x, top: y, overflow: 'visible', opacity, filter: bloom ? 'drop-shadow(0 0 3px rgba(255,255,255,.5))' : undefined, zIndex, ...style}}
    >
      {children}
    </svg>
  );
};
/** 连接线 + 箭头（progress 0→1 draw-on；head 控制箭头）。 */
export const LineArrow = ({x1, y1, x2, y2, progress = 1, color = WHITE, width = 2.5, head = 10, dash, opacity = 1, glow = false}) => {
  const p = c01(progress);
  if (p <= 0.001) return null;
  const ex = x1 + (x2 - x1) * p;
  const ey = y1 + (y2 - y1) * p;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = Math.cos(ang);
  const hy = Math.sin(ang);
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" style={glow ? {filter: `drop-shadow(0 0 6px ${Rgba(PURPLE, 0.6)})`} : undefined} />
      {head > 0 && p > 0.06 ? (
        <polygon
          points={`${ex},${ey} ${ex - hx * head + hy * head * 0.55},${ey - hy * head - hx * head * 0.55} ${ex - hx * head - hy * head * 0.55},${ey - hy * head + hx * head * 0.55}`}
          fill={color}
        />
      ) : null}
    </g>
  );
};
/** 逐段点亮的连线（数据流方向感）：每段独立 progress。 */
export const ChainArrows = ({points, N, f0, per = 6, color = WHITE, width = 2.5, head = 9}) => {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p = slideIn(N - f0 - i * per, per * 3, 2.5);
    if (p <= 0.001) continue;
    segs.push(<LineArrow key={i} x1={points[i][0]} y1={points[i][1]} x2={points[i + 1][0]} y2={points[i + 1][1]} progress={p} color={color} width={width} head={head} />);
  }
  return <g>{segs}</g>;
};
export const Check = ({cx, cy, size = 34, color = WHITE, progress = 1, width = 5}) => {
  const p = c01(progress);
  if (p <= 0) return null;
  const d = `M ${cx - size * 0.42} ${cy} L ${cx - size * 0.08} ${cy + size * 0.32} L ${cx + size * 0.45} ${cy - size * 0.34}`;
  const len = size * 2.2;
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />;
};
export const Cross = ({cx, cy, size = 30, color = WHITE, progress = 1, width = 5}) => {
  const p = c01(progress);
  if (p <= 0) return null;
  const s = size / 2;
  const total = size * 2.9;
  const o = total * (1 - p);
  return (
    <g stroke={color} strokeWidth={width} strokeLinecap="round">
      <line x1={cx - s} y1={cy - s} x2={cx - s + 2 * s * p} y2={cy - s + 2 * s * p} />
      <line x1={cx + s} y1={cy - s} x2={cx + s - 2 * s * p} y2={cy - s + 2 * s * p} />
    </g>
  );
};

// ---------------- 幕底 ----------------
/**
 * 点阵波幕底（默认）。
 * ⚠ 这里全部用逻辑像素等比铺开（不用 960×540 viewBox 缩放），因为非等比 viewBox 会在 9:16
 *   把圆点拉成椭圆，且 frame_metrics 减掉幕底时需要能精确重建网格 —— 两边必须共用同一组数。
 *   扫描周期直接写成帧数，别让「speed」这种无量纲参数留给下游猜。
 *
 * 数值本体在 src/visual/field.mjs（纯数据，node 侧 import 得到），这里只做 re-export，
 * 以免 QC 脚本只能靠正则回读 JSX 才能拿到网格坐标。
 */
export {DOT_FIELD, STAR_FIELD} from '../visual/field.mjs';
export const DotFieldBg = ({N, opacity = 1}) => {
  const d = useDesign();
  const g = DOT_FIELD;
  const H = d.height;
  const cols = Math.ceil(H > 0 ? (W - g.x0) / g.step : 0) + 1;
  const rows = Math.ceil(H / g.step) + 1;
  const span = W + H;
  const phase = ((N % g.sweepPeriod) / g.sweepPeriod) * span;
  const dots = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = g.x0 + i * g.step;
      const y = g.y0 + j * g.step;
      if (x > W - 8 || y > H - 8) continue;
      const near = clamp(1 - Math.abs(x + y - phase) / g.halo, 0, 1);
      if (near <= 0.001) continue; // 只画被点亮的部分，其余靠底层渐变，控制 DOM 数量
      dots.push(<circle key={`${i}-${j}`} cx={x} cy={y} r={g.r} fill={g.dot} opacity={0.06 + near * near * 0.5} />);
    }
  }
  return (
    <div style={{position: 'absolute', inset: 0, background: g.base, opacity}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 44%, ${Rgba(PURPLE, 0.09)} 0%, rgba(11,12,17,0) 58%)`}} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0}}>
        {dots}
      </svg>
    </div>
  );
};
/**
 * 星点雾底（可选 bg:'stars'）：默认 80 颗星、亮度 35–255、尺寸 2–4、闪烁 ±0.3、5 帧起。
 * 覆盖区止于字幕带之上（不撒进字幕带与进度条），区域按当前画幅的逻辑高度算。
 * 参数本体在 src/visual/field.mjs 的 STAR_FIELD（见上方 re-export）。
 */
export const StarField = ({N, variant = 'drift', count = STAR_FIELD.count, opacity = 1}) => {
  const d = useDesign();
  const s = STAR_FIELD;
  if (variant === 'none') return null;
  const rw = W;
  const rh = d.bands.subTop - 33; // 幕底止于字幕带上方，不压字幕
  const speed = variant === 'fast' ? 0.9 : variant === 'still' ? 0 : 0.35;
  const env = fadeIn(N, s.rise);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const bx = rnd(s.seed, i, 1) * rw;
    const by = rnd(s.seed, i, 2) * rh;
    const size = s.size[0] + rnd(s.seed, i, 3) * (s.size[1] - s.size[0]);
    const bright = (s.brightness[0] + rnd(s.seed, i, 4) * (s.brightness[1] - s.brightness[0])) / 255;
    const tw = 1 - s.twinkle + s.twinkle * (0.5 + 0.5 * Math.sin(N * 0.11 + i * 1.7));
    const drift = variant === 'still' ? 0 : (N * speed * (0.4 + rnd(s.seed, i, 5))) % rw;
    stars.push(<circle key={i} cx={(bx + drift) % rw} cy={by + Math.sin(N * 0.02 + i) * 3} r={size / 2} fill={WHITE} opacity={bright * tw * env * opacity} />);
  }
  return <svg width={W} height={rh} viewBox={`0 0 ${W} ${rh}`} style={{position: 'absolute', left: 0, top: 0}}>{stars}</svg>;
};
/** 雾底渐变：中段起压黑到字幕带，让幕底不抢主体。 */
export const Fog = () => {
  const d = useDesign();
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 415, width: W, height: Math.max(0, d.bands.subTop - 415), background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${Rgba('#212121', 1)} 100%)`, opacity: 0.5}} />
      <div style={{position: 'absolute', left: 0, top: d.bands.subTop - 60, width: W, height: 60, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)'}} />
    </>
  );
};
/** 幕底选择器：背景只有幕底（星点或点阵波），不撒碎屑、不加漂浮粒子。 */
export const Backdrop = ({N, bg = 'dots', opacity = 1}) => (
  <>
    {bg === 'stars' ? <StarField N={N} /> : <DotFieldBg N={N} opacity={opacity} />}
    <Fog />
  </>
);

// ---------------- 常驻覆盖层 ----------------
/**
 * HUD 胶囊组：章名/小节名是**导航标签**（名词短语、中文 ≤6 字 / 英文 ≤14 字符、各章结构平行），
 * 不用比喻、评价句或悬念词（比喻留给解说词与画面）。位置 y28、高 51。
 * entries = [{from, to, text, tech, size}]，from/to 为全片绝对帧号（与 timeline 同源）。
 * ⚠ 相邻条目间隔过短时让重叠处交叉淡入淡出，否则 HUD 会「空白闪一下」。
 */
export const Hud = ({entries = [], N}) => {
  const d = useDesign();
  const items = entries.filter((e) => N >= e.from && N <= e.to);
  if (items.length === 0) return null;
  let x = 60;
  return (
    <>
      {items.map((e, i) => {
        const op = Math.min(fadeIn(N - e.from, 10), 1 - Math.max(0, (N - e.to) / 8));
        const size = e.size ?? 26;
        const w = e.w ?? Math.max(216, textW(String(e.text ?? ''), size, EM_HEAVY) + 60);
        const el = (
          <TopCapsule key={`${e.text}-${e.from}`} x={x} y={d.bands.hudTop} text={e.text} sub={e.tech} size={size} opacity={clamp01(op)} w={w} />
        );
        x += w + 12;
        return el;
      })}
    </>
  );
};

/**
 * 章节进度条：章体半透明、当前位置白线；条在 y = barTop 起、高 = barBottom − barTop（16:9 → y687、高 33）。
 * 章体按 `chapters.length` 等宽分章（章多时章名要短：槽宽 = 1280 ÷ 章数）。
 * ⚠ 条后方不要压暗角，半透明条会被压暗（样片 QC 记录）。
 */
export const ProgressBar = ({chapters = [], totalFrames = 1, N, labelSkew = -10, labelSize = 24}) => {
  const d = useDesign();
  const count = Math.max(1, chapters.length);
  const slot = W / count;
  const starts = chapters.map((c, i) => c.from ?? Math.round((i / count) * totalFrames) + 1);
  const barH = d.bands.barBottom - d.bands.barTop;
  const played = (N - starts[0]) / Math.max(1, totalFrames - starts[0]);
  return (
    <div style={{position: 'absolute', left: 0, top: d.bands.barTop, width: W, height: barH, opacity: 0.52}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: '100%', background: Rgba('#F3F3F3', 0.32)}} />
      {starts.map((from, i) => {
        const to = i + 1 < starts.length ? starts[i + 1] : totalFrames;
        // 章节卡占「上一章末 +3 … 本章首 −9」；本章从 from−3 起算，避免卡片期间条不动或先走
        const begin = i === 0 ? from : from - 3;
        const p = clamp01((N - begin) / Math.max(1, to - begin));
        return (
          <div key={i} style={{position: 'absolute', left: i * slot + 2, width: (slot - 4) * p, top: 0, height: '100%', background: Rgba('#BEAAFA', 0.52)}}>
            {chapters[i]?.title ? (
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 4,
                  fontFamily: FONT_HEAVY,
                  fontWeight: 800,
                  fontSize: fitSize(String(chapters[i].title), slot - 20, labelSize, labelSize * 0.7, EM_HEAVY),
                  color: N >= from ? WHITE : GREY,
                  whiteSpace: 'pre',
                  transform: `skewX(${labelSkew}deg)`,
                }}
              >
                {chapters[i].title}
              </div>
            ) : null}
          </div>
        );
      })}
      {starts.slice(1).map((from, i) => (
        <div key={`d${i}`} style={{position: 'absolute', left: (i + 1) * slot - 2, top: 0, width: 4, height: '100%', background: '#000'}} />
      ))}
      <div style={{position: 'absolute', left: clamp(W * c01(played), 0, W - 3), top: -4, width: 3, height: (d.bands.barBottom - d.bands.barTop) + 8, background: WHITE, boxShadow: '0 0 12px rgba(102,45,248,.65)'}} />
    </div>
  );
};

/**
 * 字幕：44px 白字黑边 4px、y637–690、maxW 1160、居中。
 * 超预算的处理顺序是「先缩字号到 78%，再折两行」，两行仍装不下就是文案缺陷 ——
 * 两行字幕压进内容区在 QC 里一律按缺陷处理，不要靠这里兜。
 * ⚠ 字幕带与进度条带（y637–720）永不放画面内容；入场轨迹不得穿过字幕带。
 */
export const Subtitle = ({text, N, from, to, size = SUBTITLE_SIZE, maxLines = 2}) => {
  const d = useDesign();
  if (!text) return null;
  if (N < from || N > to) return null;
  const s = String(text);
  const em = emFor(FONT_HEAVY);
  const fitted = fitSize(s, SUBTITLE_MAX_W, size, 34, em);
  const oneLine = textW(s, fitted, em) <= SUBTITLE_MAX_W;
  const fontSize = oneLine ? fitted : 34;
  const op = Math.min(fadeIn(N - from, 6), 1 - c01((N - to) / 5));
  const style = {
    position: 'absolute',
    left: (W - SUBTITLE_MAX_W) / 2,
    width: SUBTITLE_MAX_W,
    top: d.bands.subTop,
    height: d.bands.subBottom - d.bands.subTop,
    fontFamily: FONT_HEAVY,
    fontWeight: 700,
    fontSize,
    lineHeight: 1.18,
    color: WHITE,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTextStroke: `${SUBTITLE_STROKE}px #000`,
    paintOrder: 'stroke fill',
    textShadow: '0 3px 12px rgba(0,0,0,.9)',
    opacity: clamp01(op),
    whiteSpace: 'pre-wrap',
  };
  return oneLine ? <div style={style}>{s}</div> : <div style={{...style, flexDirection: 'column'}}>{wrapTwoLines(s, SUBTITLE_MAX_W, fontSize)}</div>;
};
const wrapTwoLines = (s, maxW, size) => {
  const units = [...s];
  let best = 0;
  for (let i = 1; i < units.length; i++) {
    if (textW(units.slice(0, i).join(''), size) <= maxW) best = i;
    else break;
  }
  return [units.slice(0, best || Math.ceil(units.length / 2)).join(''), units.slice(best || Math.ceil(units.length / 2)).join('')].map((line, i) => <div key={i}>{line}</div>);
};

/**
 * 章节卡：只在第 2 章起出现，区间 = 上一章末 +3 … 本章首 −9（约 44 帧）。
 * ⚠ 章界还要有内容承接：章末解说留钩子、章首先回指上一章成果再开题、
 *   章首镜头承接上一章的主角/象征物——「讲完就切卡」是缺陷，卡片只是导航不是过场特效。
 */
export const ChapterCard = ({N, chapter, prevTo, from, to, tech}) => {
  if (!chapter || chapter.n <= 1) return null;
  const start = from ?? prevTo + 3;
  const end = to ?? start + 44;
  if (N < start || N >= end) return null;
  const d = useDesign();
  const inN = N - start;
  const outN = N - (end - 12);
  const op = fadeIn(inN, 12) * (1 - c01(Math.max(0, outN) / 12));
  const cy = d.height / 2 - 30;
  const text = String(chapter.title ?? '');
  const size = clamp(textW(text, 96) > W - 200 ? 82 : 96, 44, 96);
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: d.height, background: Rgba('#000000', 0.55), opacity: op}} />
      <CText cx={W / 2} cy={cy - 74} size={30} color={PURPLE_LIGHT} family={FONT_ORB} weight={700} letterSpacing={10} opacity={op}>
        {`CH ${String(chapter.n).padStart(2, '0')}`}
      </CText>
      <CText cx={W / 2} cy={cy} size={size} weight={900} family={FONT_HEAVY} letterSpacing={2} opacity={op} scaleX={0.85} maxW={W - 160} shadow="0 0 30px rgba(102,45,248,.55)">
        {text}
      </CText>
      {tech ? <TechSub cx={W / 2} cy={cy + 74} size={26} opacity={op}>{tech}</TechSub> : null}
    </>
  );
};

/** 片头：片名（Audiowide 118px + glitch 入场）+ tagline。f0 = 1。 */
export const TitleCard = ({N, f0 = 1, big, rest, tagline, en, lastFrame}) => {
  const d = useDesign();
  const a = N - f0;
  if (a < 0) return null;
  const exit = lastFrame ? exitDrop(N - (lastFrame - 12), 12) : null;
  const op = fadeIn(a, 10) * (exit ? exit.opacity : 1);
  const cy = d.height / 2 - 40;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: d.height, background: Rgba('#000000', 0.5), opacity: op}} />
      <GlitchIn N={N} f0={f0 + 11} rgbSplit={4} slices={6} seed={3} style={{opacity: op}}>
        <CText cx={W / 2} cy={cy - (rest ? 30 : 0)} size={118} color={WHITE} family={FONT_WIDE} weight={400} letterSpacing={6} opacity={1} maxW={W - 120} emScale={EM_WIDE} shadow="6px 6px 0 rgba(102,45,248,.9)">
          {big}
        </CText>
      </GlitchIn>
      {rest ? <SoftIn N={N} f0={f0 + 26}><CText cx={W / 2} cy={cy + 52} size={54} weight={900} family={FONT_HEAVY} scaleX={0.85} opacity={op}>{rest}</CText></SoftIn> : null}
      {tagline ? <SoftIn N={N} f0={f0 + 34}><CText cx={W / 2} cy={cy + (rest ? 118 : 96)} size={30} color={GREY} weight={500} family={FONT_HEAVY} opacity={op} maxW={W - 200}>{tagline}</CText></SoftIn> : null}
      {en ? <SoftIn N={N} f0={f0 + 42}><TechSub cx={W / 2} cy={cy + (rest ? 160 : 138)} size={26} opacity={op * 0.9}>{en}</TechSub></SoftIn> : null}
    </>
  );
};

/** 片尾：署名区，位于最后一镜头之后（⚠ endingFade 会吃掉末拍动作，留 ≥30 帧）。 */
export const EndingCredit = ({N, from, to, credit, builtBy = 'built by reel-forge'}) => {
  const d = useDesign();
  if (N < from) return null;
  const op = fadeIn(N - from, 18) * (1 - c01((N - to) / 12));
  const cy = d.height / 2;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: d.height, background: Rgba('#000000', 0.72), opacity: op}} />
      {credit ? <CText cx={W / 2} cy={cy - 26} size={56} weight={900} family={FONT_HEAVY} scaleX={0.85} opacity={op}>{credit}</CText> : null}
      {builtBy ? <CText cx={W / 2} cy={cy + 46} size={26} color={GREY} weight={500} family={FONT_EN} letterSpacing={3} opacity={op * 0.9}>{builtBy}</CText> : null}
    </>
  );
};

/** 元素节拍校验：返回该元素的入场帧相对字幕块起始帧的偏移（判据 −6…+3）。 */
export const beatOffset = (elementFrom, subFrom) => elementFrom - subFrom;
export const beatInWindow = (elementFrom, subFrom) => {
  const off = beatOffset(elementFrom, subFrom);
  return off >= BEAT_WINDOW[0] && off <= BEAT_WINDOW[1];
};
