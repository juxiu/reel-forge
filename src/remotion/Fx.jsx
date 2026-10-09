import React from 'react';
import {clamp01, easeInOutPow, kf as kfEase} from '../visual/easing.mjs';
import {SET_PIECE} from '../visual/field.mjs';
import {FONT_ORB, GLOW_PURPLE, PURPLE, PURPLE_LIGHT, W, WHITE} from '../visual/style.mjs';
import {abs, useDesign} from './Design.jsx';
import {CText} from './Primitives.jsx';

/**
 * 光效 / 高光时刻 / 纵深 / 运镜 图元。规则见 docs/VISUAL_GRAMMAR.md 与 reference-parity 的构图判据。
 * 全部纯函数：动画量由镜头按 N 算好传入，或传 N/f0 让组件自己算相对帧。
 *
 * 用途速查：
 *   LightBar / LightSweep  紫光条横扫（高光时刻开场，三轮）——全片 ≤2 处，只给本片核心概念首次登场
 *   StageLine              中央舞台光线：展宽 → 呼吸 → 节拍帧白闪 3 帧后消失
 *   GhostText              主角文字的白描边轮廓 10% 隐现（预示）
 *   HaloRing               主体脚下的紫色光环（外环内环白描边 + 紫渐变 + 虚线波纹），可分前后半环夹住主体
 *   HeroGlow / GlowBlob    给主角加双层紫柔光（矩形 / 圆形），30 帧周期呼吸 ±15%
 *   BigNumber / countTo    大数字（Orbitron + 紫硬投影 + 白光），tabular，可计数
 *   Sparkle / GradBall     四角小星 / 顶亮底黑小球
 *   TiltPlane              倾斜平面（纵深层）
 *   CameraRig / camAt      定点推近 / 平移 / 整页滚动的相机（世界坐标 → 屏幕）
 *   SET_PIECE / setPiece   「登场型」高光时刻的标准相对帧
 *
 * ⚠ 三条真实踩坑：
 *   1) 不为凑指标给静止物体加漂浮/飘动/呼吸——柔光呼吸只给主角；
 *   2) 运镜不进末拍：运镜结束到离场起点 ≥30 帧，且相机必须在拍子前停住；
 *   3) 暗角（Vignette）压在进度条后方会让半透明的条变暗，底带必须止于 barTop。
 */

// ---- 紫光条 ----
/** 单条光条：黑底上的紫色渐变条 + 紫外发光 + 白芯。 */
export const LightBar = ({x, y, w, h, alpha = 0.3, color = PURPLE_LIGHT, core = true}) => (
  <div style={{...abs(x, y, w, h), opacity: alpha}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: h / 2,
        background: `linear-gradient(90deg, transparent 0%, ${color} 16%, ${color} 84%, transparent 100%)`,
        boxShadow: `0 0 ${(h * 2.4).toFixed(1)}px ${(h * 0.9).toFixed(1)}px rgba(102,45,248,.6)`,
      }}
    />
    {core ? (
      <div
        style={{
          position: 'absolute',
          left: w * 0.18,
          right: w * 0.18,
          top: h * 0.3,
          height: h * 0.4,
          borderRadius: h,
          background: 'linear-gradient(90deg, transparent 0%, #FFFFFF 28%, #FFFFFF 72%, transparent 100%)',
          boxShadow: '0 0 6px 1px rgba(255,255,255,.75)',
        }}
      />
    ) : null}
  </div>
);

/** 光条 x：len 帧内自左 −w 扫到 1280+w（easeInOut 1.6）。 */
export const sweepX = (n, w, len = 16, canvasW = W) => -w + (canvasW + 2 * w) * easeInOutPow(1.6)(clamp01(n / len));
/** 默认三条光条 [y, h, w, 帧偏移]。 */
export const SWEEP_BARS = [
  [292, 6, 420, 0],
  [334, 10, 560, 2],
  [378, 6, 380, 4],
];
/**
 * 一轮或多轮横扫：rounds 为各轮起始帧（3 轮、轮距 18 帧首尾相接），alphas 各轮透明度；
 * dy 整体上下平移（让光线对准主角中心）。每轮 3 条、2 帧错峰、16 帧；末段按 (1−t^6) 收尾，避免硬消失。
 */
export const LightSweep = ({N, rounds, alphas = [0.6, 0.55, 0.55], bars = SWEEP_BARS, dy = 0, len = 16}) => (
  <>
    {rounds.map((t0, k) =>
      bars.map(([y, h, w, off], i) => {
        const n = N - t0 - off;
        if (n < 0 || n > len) return null;
        return (
          <LightBar
            key={`${k}-${i}`}
            x={sweepX(n, w, len)}
            y={y + dy - h / 2}
            w={w}
            h={h}
            alpha={(alphas[k] ?? 0.55) * (1 - Math.pow(clamp01(n / len), 6))}
          />
        );
      }),
    )}
  </>
);

// ---- 舞台光线 ----
/**
 * 中央光线：f0 起 14 帧展宽到 w（幂 2.5 缓出），之后 α 呼吸 .45±.15；
 * flashAt 起 3 帧白闪（.95/.7/.35）然后消失。用法：主角 GlitchIn 的节拍帧 = flashAt。
 */
export const StageLine = ({N, f0, flashAt = Infinity, cx = 640, cy = 331, w = 720, h = 3}) => {
  const n = N - f0;
  if (n < 0) return null;
  const flash = N >= flashAt ? N - flashAt : -1;
  if (flash >= 3) return null;
  const lineW = w * (1 - Math.pow(1 - clamp01(n / 14), 2.5));
  const breathe = 0.45 + 0.15 * Math.sin(n * 0.28);
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - lineW / 2,
        top: cy - h / 2,
        width: lineW,
        height: h,
        borderRadius: h,
        background: flash >= 0 ? WHITE : `linear-gradient(90deg, transparent, ${PURPLE_LIGHT} 20%, ${PURPLE_LIGHT} 80%, transparent)`,
        opacity: flash >= 0 ? [0.95, 0.7, 0.35][flash] : breathe,
        boxShadow: flash >= 0 ? '0 0 30px 8px rgba(255,255,255,.55)' : '0 0 18px 4px rgba(102,45,248,.5)',
      }}
    />
  );
};

// ---- 幽灵轮廓 ----
/** 主角文字的白描边、透明填充、紫雾轮廓：opacity 由调用方给（glitch 期间保留作底，pulse 起撤掉）。 */
export const GhostText = ({cx, cy, size, family, weight = 400, letterSpacing = 8, opacity, dy = -4, scaleX = 1, children}) => {
  if (opacity <= 0) return null;
  return (
    <CText
      cx={cx}
      cy={cy}
      size={size}
      weight={weight}
      family={family}
      letterSpacing={letterSpacing}
      color="transparent"
      dy={dy}
      scaleX={scaleX}
      opacity={opacity}
      shadow="0 0 22px rgba(161,117,241,.95)"
      stroke={`2px ${WHITE}`}
    >
      {children}
    </CText>
  );
};
/** 幽灵轮廓的标准透明度：f0 起 12 帧淡入到 0.10 并呼吸，到 until 帧撤掉。 */
export const ghostOpacity = (N, f0, until) => {
  const n = N - f0;
  if (n < 0 || N >= until) return 0;
  return (0.1 + 0.02 * Math.sin(n * 0.35)) * clamp01(n / 12);
};

// ---- 光环 ----
const ellipsePerim = (rx, ry) => Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
let haloSeq = 0;
/**
 * 主体脚下的紫色光环：外环 rxo×ryo、内环 rxi×ryi；p 为白描边 draw-on 进度 0→1；
 * fillOp 为紫渐变填充透明度；phase 为虚线波纹相位。
 * half='back' 只画 cy 以上的后半环、'front' 只画前半环——先 back、再主体、再 front 即可让主体「站在环里」。
 */
export const HaloRing = ({cx = 640, cy = 428, rxo = 335, ryo = 78, rxi = 245, ryi = 44, p = 1, fillOp = 0.85, phase = 0, half = 'both', opacity = 1, ripples = true}) => {
  const idRef = React.useRef(undefined);
  if (!idRef.current) idRef.current = `rf-halo-${haloSeq++}`;
  const id = idRef.current;
  const d = useDesign();
  const H = d.height;
  const pe = 1 - Math.pow(1 - clamp01(p), 2);
  const PO = ellipsePerim(rxo, ryo);
  const PI = ellipsePerim(rxi, ryi);
  const e = (rx, ry) => `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
  const ring = `${e(rxo, ryo)} ${e(rxi, ryi)}`;
  const clip = half === 'back' ? `url(#${id}-back)` : half === 'front' ? `url(#${id}-front)` : undefined;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.45))', opacity}}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A1E8C" />
          <stop offset="55%" stopColor={PURPLE} />
          <stop offset="100%" stopColor="#8F62F5" />
        </linearGradient>
        <clipPath id={`${id}-back`}>
          <rect x={0} y={0} width={W} height={cy} />
        </clipPath>
        <clipPath id={`${id}-front`}>
          <rect x={0} y={cy} width={W} height={H - cy} />
        </clipPath>
      </defs>
      <g clipPath={clip}>
        <path d={ring} fill={`url(#${id}-g)`} fillRule="evenodd" opacity={fillOp} />
        <ellipse cx={cx} cy={cy} rx={rxo} ry={ryo} fill="none" stroke={WHITE} strokeWidth={2.5} strokeDasharray={PO} strokeDashoffset={PO * (1 - pe)} />
        <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} fill="none" stroke={WHITE} strokeWidth={2.5} strokeDasharray={PI} strokeDashoffset={PI * (1 - pe)} />
        {ripples
          ? [0.3, 0.55, 0.8].map((t, i) => (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx={rxi + (rxo - rxi) * t}
                ry={ryi + (ryo - ryi) * t}
                fill="none"
                stroke={PURPLE_LIGHT}
                strokeWidth={1.6}
                strokeDasharray="16 22"
                strokeDashoffset={phase * (i % 2 ? -1 : 1) + i * 9}
                opacity={0.55 * fillOp}
              />
            ))
          : null}
      </g>
    </svg>
  );
};

// ---- 主角柔光 ----
/** 给矩形主角加双层紫柔光：放在主角组件之下，同位同尺寸。N 传入时 30 帧周期呼吸 ±15%；k 为强度 0→1。 */
export const HeroGlow = ({x, y, w, h, r = 16, N, k = 1, color}) => {
  const breathe = N === undefined ? 1 : 1 + 0.15 * Math.sin((2 * Math.PI * N) / 30);
  const a = clamp01(k) * breathe;
  if (a <= 0.01) return null;
  const glow = color
    ? `0 0 ${(12 * a).toFixed(0)}px ${(3 * a).toFixed(0)}px ${color}59, 0 0 ${(42 * a).toFixed(0)}px ${(14 * a).toFixed(0)}px ${color}73`
    : GLOW_PURPLE;
  return <div style={{...abs(x, y, w, h), borderRadius: r, boxShadow: glow, opacity: color ? clamp01(k) : a}} />;
};

/** 圆形紫柔光斑：图形主角（仪表、人形、环）脚下/身后的大面积光，比矩形 box-shadow 更适合非矩形主角。 */
export const GlowBlob = ({cx, cy, r, N, k = 1, alpha = 0.34}) => {
  const breathe = N === undefined ? 1 : 1 + 0.15 * Math.sin((2 * Math.PI * N) / 30);
  const a = clamp01(k) * breathe * alpha;
  if (a <= 0.005) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(102,45,248,${a.toFixed(3)}) 0%, rgba(102,45,248,${(a * 0.55).toFixed(3)}) 34%, rgba(102,45,248,0) 70%)`,
      }}
    />
  );
};

// ---- 大数字 ----
export const fmtInt = (v) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** len 帧内从 a 计数到 b（幂 2 缓出），返回取整字符串（千分位）。 */
export const countTo = (n, a, b, len = 20) => fmtInt(a + (b - a) * (1 - Math.pow(1 - clamp01(n / len), 2)));
/**
 * 大数字：Orbitron tabular + 紫硬投影 + 紫柔光；unit 为下方小字。
 * ⚠ 计数过程中的中间值也会成为「画面上的数字」，事实出处门禁要按出现的每个中间值登记，别用无出处区间。⚠ `family` 必须给默认值 `FONT_ORB`：不传就落到 CText 的 `FONT_HEAVY`（`Primitives.jsx:52`），而 `emFor(family)` 是按字体串取宽度系数的，`EM_ORB = 1.2` 一起失效（`style.mjs:129`、`textfit.mjs:19`）——守着它的是 `verify-render-layer.mjs:196-208` 的字体角色 pin（删掉默认值即变红）。
 */
export const BigNumber = ({cx, cy, value, size = 110, color = WHITE, family = FONT_ORB, weight = 700, letterSpacing = 2, shadow = `6px 6px 0 ${PURPLE}, 0 0 28px rgba(102,45,248,.45)`, unit, unitSize = 24, unitColor = '#A0A0A1', opacity = 1, dy = -2}) => (
  <>
    <CText cx={cx} cy={cy} size={size} weight={weight} family={family} color={color} letterSpacing={letterSpacing} opacity={opacity} dy={dy} shadow={shadow} tabular>
      {value}
    </CText>
    {unit ? <CText cx={cx} cy={cy + size * 0.62 + unitSize / 2} size={unitSize} weight={600} color={unitColor} opacity={opacity}>{unit}</CText> : null}
  </>
);

// ---- 小件 ----
/** 四角小星（「冒星」），r = 外半径。 */
export const Sparkle = ({cx, cy, r, opacity = 1, color = WHITE}) => {
  const k = 0.28;
  const d = `M0,${-r} C0,${-r * k} ${r * k},0 ${r},0 C${r * k},0 0,${r * k} 0,${r} C0,${r * k} ${-r * k},0 ${-r},0 C${-r * k},0 0,${-r * k} 0,${-r} Z`;
  return (
    <svg width={r * 2 + 8} height={r * 2 + 8} viewBox={`${-r - 4} ${-r - 4} ${r * 2 + 8} ${r * 2 + 8}`} style={{position: 'absolute', left: cx - r - 4, top: cy - r - 4, opacity, overflow: 'visible'}}>
      <path d={d} fill={color} />
    </svg>
  );
};
/** 顶亮底黑小球（节点 / 跑圈小球用）。 */
export const GradBall = ({cx, cy, r, stroke = 2.5}) => (
  <div
    style={{
      ...abs(cx - r, cy - r, 2 * r, 2 * r),
      borderRadius: '50%',
      boxSizing: 'border-box',
      border: `${stroke}px solid #FFF`,
      background: 'linear-gradient(180deg, #F0F0F0 0%, #E8E8E8 3%, #919191 11.7%, #787878 20%, #5B5B5B 28%, #313131 40%, #0F0F0F 50%, #000 58%, #000 100%)',
    }}
  />
);

// ---- 纵深：倾斜平面 ----
/**
 * 倾斜平面（层级 / 空间分层）：以 (cx,cy) 为中心的 w×h 平面，skewX + scaleY 成「躺着」的平行四边形。
 * children 用平面内坐标绝对定位，会跟着一起变形。
 * ⚠ TiltPlane 会压扁 children 的字高——平面内的文字必须先按 1/sy 反scaleY，否则 22px 下限会被压穿。
 */
export const TiltPlane = ({cx, cy, w = 420, h = 260, skew = -20, sy = 0.5, stroke = WHITE, sw = 2, fill = 'rgba(0,0,0,.85)', opacity = 1, children}) => (
  <div style={{...abs(cx - w / 2, cy - h / 2, w, h), transform: `scaleY(${sy}) skewX(${skew}deg)`, transformOrigin: '50% 50%', opacity}}>
    <div style={{position: 'absolute', inset: 0, boxSizing: 'border-box', border: `${sw}px solid ${stroke}`, background: fill, filter: 'drop-shadow(0 0 2px rgba(255,255,255,.35))'}} />
    {children}
  </div>
);

// ---- 运镜 ----
/**
 * 相机关键帧的**计算**在 src/visual/camera.mjs（纯函数，可 node 校验），这里只保留把 keys 变成
 * transform 的 JSX 层。之前两边各写一份 camAt/CAMERA/…，改了一边另一边静默过期 ——
 * QC 判的 keys 和渲染用的 keys 就不是同一套数了。
 */
export {camAt, CAMERA, PARALLAX, PARALLAX_DEPTH, CAMERA_LIMITS, CAMERA_PRESETS, cameraKeysFromMotion, cameraKeysFromPreset, presetHasParallax, slowPushKeys, camCenterY, camDelta, cameraViewRect, cameraSettlesBeforeExit} from '../visual/camera.mjs';
import {camAt, camDelta, PARALLAX} from '../visual/camera.mjs';

/**
 * 相机：children 用世界坐标（默认相机 x=640,y=H/2,s=1 时与画布重合）。
 * 定点推近 = 同一 (x,y) 改 s（1→1.33，20–45 帧）；平移/整页滚动 = 改 (x,y)；
 * 承接 = 上一镜头末与下一镜头首用相同 keys。
 * ⚠ scale 对 box-shadow/描边同样放大，推近超过 1.4 时描边会显粗；运镜必须在末拍前 ≥30 帧结束。
 */
export const CameraRig = ({N, keys, children, style}) => {
  const d = useDesign();
  const c = camAt(N, keys);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: '0 0',
        transform: `translate(${(W / 2).toFixed(1)}px,${(d.height / 2).toFixed(1)}px) scale(${c.s.toFixed(4)}) translate(${(-c.x).toFixed(2)}px,${(-c.y).toFixed(2)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * 分层视差：相机平移时，不同深度的层以不同速度在屏幕上移动。
 *
 * 样片实测速度是 前景 12.8 / 中景 9.6 / 背景 2.75 px 帧（PARALLAX），
 * 以「中景 = 跟相机同速」为基准换算成深度倍率（PARALLAX_DEPTH）。
 * CameraRig 已经给所有层乘了一次 −Δ；这里再补 (depth − 1)·Δ，
 * 于是前景比相机更快、背景几乎不动 —— 而不是靠额外动画假装出深度。
 *
 * ⚠ 只在 plan.camera.depths 存在（分镜声明 parallax）时套上；
 *    静止机位 / 慢推不该有视差，否则画面会在没有相机位移时自己晃。
 */
export const ParallaxLayer = ({N, keys, depth = 1, children, style}) => {
  const shift = camDelta(N, keys);
  const k = depth - 1; // 1 = 中景（跟相机同速，无需补偿）
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${(shift.x * k).toFixed(2)}px,${(shift.y * k).toFixed(2)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ---- 高光时刻标准时序 ----
/**
 * 定义在 src/visual/field.mjs：「登场型」的相对帧同时是 QC 判空场/判落位的口径，
 * 写在 JSX 里 node 侧读不到，就会出现渲染一套时序、QC 另一套阈值。这里 re-export，
 * 镜头文件仍从 Fx.jsx 取，导入路径不变。
 */
export {SET_PIECE} from '../visual/field.mjs';
export const setPiece = (T0, T1) => ({
  sweeps: SET_PIECE.sweeps.map((d) => T0 + d),
  line: T0 + SET_PIECE.line,
  ghost: T0 + SET_PIECE.ghost,
  flash: T1,
  pulse: T1 + SET_PIECE.pulse,
  sub: T1 + SET_PIECE.sub,
  pills: T1 + SET_PIECE.pills,
});

// ---- 方向模糊 ----
/**
 * 方向模糊（SVG feGaussianBlur）。σ<0.8 在 Chromium 中无效；禁用 feConvolveMatrix（性能红线）。
 * 用法：横向甩镜只 bx、纵向承接只 by。
 */
let blurSeq = 0;
export const DirBlur = ({bx = 0, by = 0, style, children}) => {
  const idRef = React.useRef(undefined);
  if (!idRef.current) idRef.current = `rf-blur-${blurSeq++}`;
  const id = idRef.current;
  const active = bx > 0.05 || by > 0.05;
  return (
    <div style={{position: 'absolute', inset: 0, ...style}}>
      {active ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <defs>
            <filter id={id} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${Math.max(0, bx)} ${Math.max(0, by)}`} />
            </filter>
          </defs>
        </svg>
      ) : null}
      <div style={{position: 'absolute', inset: 0, filter: active ? `url(#${id})` : undefined}}>{children}</div>
    </div>
  );
};

/** 屏幕空间顶/底暗角（推近时同步淡入 18 帧）：k 0→1。放在 CameraRig 之外（屏幕空间，不随相机）。 */
export const Vignette = ({k, alpha = 0.4, top = 100, topH = 100}) => {
  // ⚠ useDesign 必须在任何提前 return 之前调用：k 会在 0.005 上下穿越，
  //   一旦 hook 数量在帧间变化，React 会抛「Rendered fewer hooks than during the previous render」。
  const d = useDesign();
  if (k <= 0.005) return null;
  const a = (alpha * clamp01(k)).toFixed(3);
  const bottomTop = d.bands.barTop - 127; // 止于进度条：条体半透明，压暗其后方会让条变暗
  return (
    <>
      <div style={{position: 'absolute', left: 0, top, width: W, height: topH, background: `linear-gradient(180deg, rgba(0,0,0,${a}) 0%, rgba(0,0,0,0) 100%)`}} />
      <div style={{position: 'absolute', left: 0, top: bottomTop, width: W, height: d.bands.barTop - bottomTop, background: `linear-gradient(0deg, rgba(0,0,0,${a}) 0%, rgba(0,0,0,0) 100%)`}} />
    </>
  );
};

/** 关键帧便捷再导出（镜头内常用）。 */
export const kf = kfEase;
