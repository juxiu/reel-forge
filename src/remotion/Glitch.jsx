import React from 'react';
import {rnd} from '../visual/easing.mjs';
import {CYAN, MAGENTA} from '../visual/style.mjs';
import {useDesign} from './Design.jsx';

/**
 * Glitch 入场（闪烁）。12 帧序列取自样片多段逐帧亮度实测，可作全局常量：
 * 纯透明度变化，无位移、无 RGB 错位、无切片——这已足够表达「重点术语登场」。
 *
 * 硬规则：每个镜头 ≤1 处 GlitchIn，且只给该镜头的核心术语；
 * 其余文字/标签/HUD 换词一律 SoftIn 淡入。白名单写在分镜表里，selfcheck 逐镜头计数核对。
 * rgbSplit / slices 只留给片头、章节卡与本片明确指定的极少数镜头（默认全关）。
 */
export const GLITCH_SEQ = [0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.75, 0.5, 0.75, 1];
export const GLITCH_SEQ_B = [0.55, 1, 0.55, 0, 0.55, 0, 0.55, 1, 0.78, 0.55, 0.78, 1];

/** n = N − f0：n<0 → 0（未入场）；0..11 → 序列；≥12 → 1。 */
export const glitchOpacity = (n, seq = GLITCH_SEQ) => (n < 0 ? 0 : n >= seq.length ? 1 : seq[n]);

let glitchSeq = 0;

/** 任意内容染成单色（品红/青副本用）：feColorMatrix 取亮度写入指定通道，保留 alpha。 */
const TintDefs = ({id}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id={`${id}-m`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.174 0.586 0.059 0 0  0 0 0 0 0  0.178 0.600 0.061 0 0  0 0 0 1 0" />
      </filter>
      <filter id={`${id}-c`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.073 0.247 0.025 0 0  0.213 0.715 0.072 0 0  0.199 0.667 0.067 0 0  0 0 0 1 0" />
      </filter>
    </defs>
  </svg>
);

/**
 * 12 帧 glitch 入场容器。n<0 不渲染；n≥12 原样渲染（可选保留 RGB 错位）。
 * children 用绝对定位（容器 = 全画幅）。
 *
 * ⚠ 序列 opacity 必须与传入 style.opacity **相乘**：否则外层淡出乘子被覆盖，
 * 镜头离场时 glitch 元素会「啪」地留在画面上（这是样片 QC 的真实根因记录）。
 */
export const GlitchIn = ({N, f0, children, seq = GLITCH_SEQ, rgbSplit = 0, persistSplit = false, slices = 0, sliceBands = 4, seed = 1, persistSlices = false, style}) => {
  const idRef = React.useRef(undefined);
  if (!idRef.current) idRef.current = `rf-glitch-${glitchSeq++}`;
  const id = idRef.current;
  const d = useDesign();
  const n = N - f0;
  if (n < 0) return null;
  const active = n < seq.length;
  const op = glitchOpacity(n, seq);
  const box = {position: 'absolute', inset: 0, overflow: 'hidden', ...style};
  if (op <= 0) return <div style={box} />;

  const H = d.height;

  // 水平切片：按 sliceBands 条随机带切开，各带独立水平错位（确定性种子，复渲染一致）
  const sliced = (node, key) => {
    const doSlice = slices > 0 && (active || persistSlices);
    if (!doSlice) return <div key={key} style={{position: 'absolute', inset: 0}}>{node}</div>;
    const cuts = [0];
    for (let b = 1; b < sliceBands; b++) cuts.push(rnd(seed, N, b, 11) * H);
    cuts.push(H);
    cuts.sort((a, b) => a - b);
    return (
      <React.Fragment key={key}>
        {cuts.slice(0, -1).map((y0, b) => {
          const y1 = cuts[b + 1];
          const dx = (rnd(seed, N, b, 12) * 2 - 1) * slices * (rnd(seed, N, b, 13) < 0.35 ? 0 : 1);
          return (
            <div key={b} style={{position: 'absolute', inset: 0, clipPath: `inset(${y0}px 0 ${H - y1}px 0)`, transform: `translateX(${dx.toFixed(1)}px)`}}>
              {node}
            </div>
          );
        })}
      </React.Fragment>
    );
  };

  const doSplit = rgbSplit > 0 && (active || persistSplit);
  let mOff = [-6, -3];
  let cOff = [3, 5];
  if (doSplit && active) {
    const k = rgbSplit / 6;
    mOff = [-(3 + 6 * rnd(seed, N, 21)) * k, -(1 + 4 * rnd(seed, N, 22)) * k];
    cOff = [(1 + 4 * rnd(seed, N, 23)) * k, (2 + 6 * rnd(seed, N, 24)) * k];
  } else if (doSplit) {
    const k = rgbSplit / 6;
    mOff = [-6 * k, -3 * k];
    cOff = [3 * k, 5 * k];
  }

  return (
    <div style={{...box, opacity: op * (typeof style?.opacity === 'number' ? style.opacity : 1)}}>
      {doSplit ? <TintDefs id={id} /> : null}
      {doSplit ? (
        <div style={{position: 'absolute', inset: 0, filter: `url(#${id}-m)`, transform: `translate(${mOff[0].toFixed(1)}px, ${mOff[1].toFixed(1)}px)`}}>
          {sliced(children, 'm')}
        </div>
      ) : null}
      {doSplit ? (
        <div style={{position: 'absolute', inset: 0, filter: `url(#${id}-c)`, transform: `translate(${cOff[0].toFixed(1)}px, ${cOff[1].toFixed(1)}px)`}}>
          {sliced(children, 'c')}
        </div>
      ) : null}
      {sliced(children, 'main')}
    </div>
  );
};

/** 品红/青的纯 CSS 副本色（不进 SVG filter 时的近似着色，只用于极小装饰）。 */
export const GLITCH_TINT = {magenta: MAGENTA, cyan: CYAN};
