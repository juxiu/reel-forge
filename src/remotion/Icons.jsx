import React from 'react';
import {GREY, GREY_LINE, PURPLE, PURPLE_LIGHT, Rgba, WHITE} from '../visual/style.mjs';
import {clamp01} from '../visual/easing.mjs';

/**
 * 语义图标库（白描边 + 黑填充 + 2–3px 线宽，样片同一套画法）。
 *
 * 为什么必须有：画面信息密度的主要来源不是卡片文字，而是「这一主题独有的图形语言」。
 * 之前 reel-forge 只有 Label/Box/Hero，11 种变体全靠矩形和线撑，所以画面一眼看去是「通用 PPT」。
 *
 * 用法：放进 <Svg> 里当 <g>；(cx,cy) 为图标中心，s 为外接方框边长。
 * active=true 时描边转紫并自带柔光 —— 紫只给当前重点，同镜头内 ≤1 个 active。
 * 配角图标不发光（光跟主角）。
 *
 * 新主题需要 2–5 个专属图标时，在这里加进 ICONS 并登记到分镜表「复用图元」清单，
 * 不要在镜头文件里临时画一个只有那一场用一次的图形。
 */

const base = (color, sw) => ({fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round'});

/** 文档 / 页面（折角 + 三线）。 */
export const DocIcon = ({cx, cy, s = 120, color = WHITE, sw = 2.5, opacity = 1, active = false, lines = 3, fold = 0.28}) => {
  const c = active ? PURPLE_LIGHT : color;
  const w = s * 0.72;
  const h = s;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const f = w * fold;
  return (
    <g opacity={opacity}>
      <path d={`M${x} ${y} L${x + w - f} ${y} L${x + w} ${y + f} L${x + w} ${y + h} L${x} ${y + h} Z`} {...base(c, sw)} />
      <path d={`M${x + w - f} ${y} L${x + w - f} ${y + f} L${x + w} ${y + f}`} {...base(c, sw)} />
      {Array.from({length: lines}, (_, i) => (
        <line key={i} x1={x + w * 0.16} y1={y + h * (0.4 + i * 0.16)} x2={x + w * (i === lines - 1 ? 0.6 : 0.84)} y2={y + h * (0.4 + i * 0.16)} stroke={active ? c : GREY} strokeWidth={sw * 0.8} strokeLinecap="round" />
      ))}
      {active ? <path d={`M${x} ${y} L${x + w - f} ${y} L${x + w} ${y + f} L${x + w} ${y + h} L${x} ${y + h} Z`} stroke={Rgba(PURPLE, 0.5)} strokeWidth={sw * 2.4} fill="none" style={{filter: 'blur(6px)'}} /> : null}
    </g>
  );
};

/** 数据库（三段圆柱）。 */
export const DBIcon = ({cx, cy, s = 140, color = WHITE, sw = 2.5, opacity = 1, active = false, tiers = 3, reveal = 1}) => {
  const c = active ? PURPLE_LIGHT : color;
  const w = s * 0.78;
  const ry = s * 0.11;
  const tierH = s * 0.24;
  const x = cx - w / 2;
  const y = cy - (tiers * tierH) / 2;
  return (
    <g opacity={opacity}>
      {Array.from({length: tiers}, (_, i) => {
        const top = y + i * tierH;
        const on = clamp01(reveal * tiers - i);
        if (on <= 0) return null;
        return (
          <g key={i} opacity={on}>
            <path d={`M${x} ${top + ry} L${x} ${top + tierH - ry}`} {...base(c, sw)} />
            <path d={`M${x + w} ${top + ry} L${x + w} ${top + tierH - ry}`} {...base(c, sw)} />
            <path d={`M${x} ${top + tierH - ry} a ${w / 2} ${ry} 0 0 0 ${w} 0`} {...base(i === 0 || active ? c : GREY, sw)} />
            <ellipse cx={cx} cy={top + ry} rx={w / 2} ry={ry} {...base(c, sw)} />
          </g>
        );
      })}
    </g>
  );
};

/** 切片卡（检索语料块）。 */
export const ChunkCard = ({cx, cy, w = 150, h = 92, color = WHITE, sw = 2, opacity = 1, active = false, label, rows = 2, lit = 1}) => {
  const c = active ? PURPLE_LIGHT : color;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={8} {...base(c, sw)} fill={active ? Rgba(PURPLE, 0.14) : '#000'} />
      {Array.from({length: rows}, (_, i) => (
        <line key={i} x1={x + 14} y1={y + h * (0.36 + i * 0.24)} x2={x + w - 14 - (i % 2) * 26} y2={y + h * (0.36 + i * 0.24)} stroke={clamp01(lit - i * 0.2) > 0.5 ? c : GREY_LINE} strokeWidth={sw * 0.9} strokeLinecap="round" />
      ))}
      {label ? <text x={x + 12} y={y + 22} fill={c} fontSize={20} fontFamily="'Exo 2',sans-serif" fontStyle="italic">{label}</text> : null}
    </g>
  );
};

/** 芯片 / 模型（方块 + 引脚）。 */
export const ChipIcon = ({cx, cy, s = 140, color = WHITE, sw = 2.5, opacity = 1, active = false, pins = 4, busy = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  const b = s * 0.6;
  const half = b / 2;
  const pinLen = s * 0.2;
  return (
    <g opacity={opacity}>
      <rect x={cx - half} y={cy - half} width={b} height={b} rx={6} {...base(c, sw)} />
      <rect x={cx - half * 0.44} y={cy - half * 0.44} width={b * 0.44} height={b * 0.44} rx={3} {...base(GREY, sw * 0.8)} />
      {Array.from({length: pins}, (_, i) => {
        const t = (i + 0.5) / pins;
        const off = -half * 2 * (0.5 - t) * -1;
        return (
          <g key={i}>
            <line x1={cx + off} y1={cy - half} x2={cx + off} y2={cy - half - pinLen} stroke={busy > i / pins ? PURPLE_LIGHT : GREY} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx + off} y1={cy + half} x2={cx + off} y2={cy + half + pinLen} stroke={busy > (i + 0.5) / pins ? PURPLE_LIGHT : GREY} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx - half} y1={cy + off} x2={cx - half - pinLen} y2={cy + off} stroke={GREY} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx + half} y1={cy + off} x2={cx + half + pinLen} y2={cy + off} stroke={GREY} strokeWidth={sw} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

/** 锁 / 凭证（锁体 + 环）。 */
export const LockIcon = ({cx, cy, s = 130, color = WHITE, sw = 2.5, opacity = 1, active = false, open = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  const w = s * 0.66;
  const h = s * 0.46;
  const y = cy + s * 0.06;
  return (
    <g opacity={opacity}>
      <rect x={cx - w / 2} y={y} width={w} height={h} rx={8} {...base(c, sw)} fill="#000" />
      <path
        d={`M${cx - w * 0.3} ${y} L${cx - w * 0.3} ${y - h * (0.5 - open * 0.5)} a ${w * 0.3} ${h * 0.5} 0 0 1 ${w * 0.6} ${open > 0.5 ? h * 0.2 : 0} L${cx + w * 0.3} ${y}`}
        {...base(active ? c : GREY, sw)}
      />
      <circle cx={cx} cy={y + h * 0.44} r={s * 0.045} fill={c} />
    </g>
  );
};
/** 盾牌 / 完整性校验。 */
export const ShieldIcon = ({cx, cy, s = 150, color = WHITE, sw = 2.5, opacity = 1, active = false, check = 1}) => {
  const c = active ? PURPLE_LIGHT : color;
  const w = s * 0.66;
  const h = s;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    <g opacity={opacity}>
      <path d={`M${cx} ${y} L${x + w} ${y + h * 0.2} L${x + w} ${y + h * 0.58} Q${x + w} ${y + h * 0.86} ${cx} ${y + h} Q${x} ${y + h * 0.86} ${x} ${y + h * 0.58} L${x} ${y + h * 0.2} Z`} {...base(c, sw)} fill="#000" />
      {check > 0 ? (
        <path
          d={`M${cx - w * 0.24} ${cy} L${cx - w * 0.04} ${cy + h * 0.16} L${cx + w * 0.26} ${cy - h * 0.16}`}
          stroke={c}
          strokeWidth={sw * 1.6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={w}
          strokeDashoffset={w * (1 - clamp01(check))}
        />
      ) : null}
    </g>
  );
};
/** 钥匙 / 摘要密钥。 */
export const KeyIcon = ({cx, cy, s = 150, color = WHITE, sw = 2.5, opacity = 1, active = false, angle = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  return (
    <g opacity={opacity} transform={`rotate(${angle} ${cx} ${cy})`}>
      <circle cx={cx - s * 0.28} cy={cy} r={s * 0.17} {...base(c, sw)} />
      <line x1={cx - s * 0.11} y1={cy} x2={cx + s * 0.4} y2={cy} stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <line x1={cx + s * 0.28} y1={cy} x2={cx + s * 0.28} y2={cy + s * 0.14} stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <line x1={cx + s * 0.4} y1={cy} x2={cx + s * 0.4} y2={cy + s * 0.2} stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </g>
  );
};
/** 链路 / 连接（两环相扣）。 */
export const LinkIcon = ({cx, cy, s = 150, color = WHITE, sw = 2.5, opacity = 1, active = false, gap = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  const r = s * 0.2;
  const dx = s * 0.24 + gap * s * 0.3;
  return (
    <g opacity={opacity}>
      <rect x={cx - dx - r} y={cy - r} width={r * 2} height={r * 2} rx={r} {...base(c, sw)} transform={`rotate(-38 ${cx - dx} ${cy})`} />
      <rect x={cx + dx - r} y={cy - r} width={r * 2} height={r * 2} rx={r} {...base(c, sw)} transform={`rotate(-38 ${cx + dx} ${cy})`} />
    </g>
  );
};
/** 人 / 用户（头 + 肩，圆形主角用 GlowBlob 打光）。 */
export const PersonIcon = ({cx, cy, s = 150, color = WHITE, sw = 2.5, opacity = 1, active = false}) => {
  const c = active ? PURPLE_LIGHT : color;
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy - s * 0.22} r={s * 0.17} {...base(c, sw)} />
      <path d={`M${cx - s * 0.32} ${cy + s * 0.42} Q${cx} ${cy - s * 0.04} ${cx + s * 0.32} ${cy + s * 0.42}`} {...base(c, sw)} />
    </g>
  );
};
/** 服务器机架。 */
export const RackIcon = ({cx, cy, s = 170, w = 110, opacity = 1, active = false, units = 4, litIndex = -1}) => {
  const h = s;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const uh = h / units;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={6} {...base(active ? PURPLE_LIGHT : WHITE, 2.5)} />
      {Array.from({length: units}, (_, i) => (
        <g key={i}>
          <line x1={x + 6} y1={y + (i + 1) * uh} x2={x + w - 6} y2={y + (i + 1) * uh} stroke={GREY_LINE} strokeWidth={2} />
          <circle cx={x + w - 16} cy={y + i * uh + uh / 2} r={3.5} fill={i === litIndex ? '#8FF740' : GREY} />
        </g>
      ))}
    </g>
  );
};
/** 漏斗 / 召回→精排（多层梯形）。 */
export const FunnelIcon = ({cx, cy, s = 170, color = WHITE, sw = 2.5, opacity = 1, active = false, stages = 3, flow = 0}) => {
  const topW = s * 0.9;
  const stageH = (s * 0.8) / stages;
  const y0 = cy - (s * 0.4);
  return (
    <g opacity={opacity}>
      {Array.from({length: stages}, (_, i) => {
        const t0 = i / stages;
        const t1 = (i + 1) / stages;
        const w0 = topW * (1 - t0 * 0.72);
        const w1 = topW * (1 - t1 * 0.72);
        const y = y0 + i * stageH;
        const on = flow > t0;
        return <path key={i} d={`M${cx - w0 / 2} ${y} L${cx + w0 / 2} ${y} L${cx + w1 / 2} ${y + stageH * 0.9} L${cx - w1 / 2} ${y + stageH * 0.9} Z`} {...base(on && active ? PURPLE_LIGHT : color, sw)} fill="#000" opacity={on ? 1 : 0.55} />;
      })}
    </g>
  );
};
/** 仪表 / 指标（半环 + 指针）。 */
export const GaugeIcon = ({cx, cy, r = 120, color = WHITE, sw = 3, opacity = 1, active = false, value = 0, label}) => {
  const c = active ? PURPLE_LIGHT : color;
  const a0 = -210;
  const a1 = 30;
  const pt = (deg, rad) => [cx + Math.cos((deg * Math.PI) / 180) * rad, cy + Math.sin((deg * Math.PI) / 180) * rad];
  const [sx, sy] = pt(a0, r);
  const [ex, ey] = pt(a1, r);
  const [nx, ny] = pt(a0 + (a1 - a0) * clamp01(value), r * 0.78);
  return (
    <g opacity={opacity}>
      <path d={`M${sx} ${sy} A ${r} ${r} 0 1 0 ${ex} ${ey}`} {...base(GREY_LINE, sw)} />
      <path d={`M${sx} ${sy} A ${r} ${r} 0 1 0 ${ex} ${ey}`} stroke={c} strokeWidth={sw + 1} fill="none" strokeDasharray={Math.PI * r * 1.5} strokeDashoffset={Math.PI * r * 1.5 * (1 - clamp01(value))} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={c} strokeWidth={sw * 1.4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={c} />
      {label ? <text x={cx} y={cy + r * 0.55} fill={GREY} fontSize={22} textAnchor="middle" fontFamily="'Noto Sans SC',sans-serif">{label}</text> : null}
    </g>
  );
};
/** 时钟 / 时序（表盘 + 走动指针）。 */
export const ClockIcon = ({cx, cy, s = 130, color = WHITE, sw = 2.5, opacity = 1, active = false, N = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  const r = s * 0.42;
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} {...base(c, sw)} fill="#000" />
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={cx + Math.sin(a) * r * 0.86} y1={cy - Math.cos(a) * r * 0.86} x2={cx + Math.sin(a) * r} y2={cy - Math.cos(a) * r} stroke={GREY} strokeWidth={2} />;
      })}
      <line x1={cx} y1={cy} x2={cx + Math.sin((N / 60) * Math.PI * 2) * r * 0.62} y2={cy - Math.cos((N / 60) * Math.PI * 2) * r * 0.62} stroke={c} strokeWidth={sw * 1.3} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + Math.sin((N / 720) * Math.PI * 2) * r * 0.42} y2={cy - Math.cos((N / 720) * Math.PI * 2) * r * 0.42} stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </g>
  );
};
/** 天平 / 权衡。 */
export const ScaleIcon = ({cx, cy, s = 190, color = WHITE, sw = 2.5, opacity = 1, active = false, tilt = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  const arm = s * 0.4;
  const dy = tilt * arm * 0.34;
  return (
    <g opacity={opacity}>
      <line x1={cx} y1={cy - s * 0.34} x2={cx} y2={cy + s * 0.3} stroke={c} strokeWidth={sw * 1.3} strokeLinecap="round" />
      <line x1={cx - arm} y1={cy - s * 0.26 - dy} x2={cx + arm} y2={cy - s * 0.26 + dy} stroke={c} strokeWidth={sw} strokeLinecap="round" />
      {[-1, 1].map((sgn, i) => {
        const px = cx + sgn * arm;
        const py = cy - s * 0.26 + (i ? dy : -dy);
        return (
          <g key={i}>
            <line x1={px - 22} y1={py} x2={px} y2={py + 26} stroke={GREY} strokeWidth={2} />
            <line x1={px + 22} y1={py} x2={px} y2={py + 26} stroke={GREY} strokeWidth={2} />
            <path d={`M${px - 24} ${py + 26} Q${px} ${py + 44} ${px + 24} ${py + 26}`} {...base(i === 0 && active ? c : color, sw)} />
          </g>
        );
      })}
      <line x1={cx - s * 0.22} y1={cy + s * 0.3} x2={cx + s * 0.22} y2={cy + s * 0.3} stroke={c} strokeWidth={sw * 1.2} strokeLinecap="round" />
    </g>
  );
};
/** 分支 / 版本库。 */
export const BranchIcon = ({cx, cy, s = 150, color = WHITE, sw = 2.5, opacity = 1, active = false, merge = 0}) => {
  const c = active ? PURPLE_LIGHT : color;
  return (
    <g opacity={opacity}>
      <line x1={cx - s * 0.1} y1={cy - s * 0.4} x2={cx - s * 0.1} y2={cy + s * 0.4} stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <path d={`M${cx - s * 0.1} ${cy - s * 0.12} C${cx + s * 0.22} ${cy - s * 0.12} ${cx + s * 0.24} ${cy + s * 0.1 - merge * s * 0.2} ${cx + s * 0.24} ${cy + s * 0.18}`} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {[[-0.1, -0.4], [-0.1, 0.4], [0.24, 0.18]].map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx * s} cy={cy + dy * s} r={s * 0.07} fill="#000" stroke={c} strokeWidth={sw} />
      ))}
    </g>
  );
};
/** 波形 / 信号流。 */
export const WaveIcon = ({cx, cy, s = 190, color = WHITE, sw = 2.5, opacity = 1, active = false, phase = 0, amp = 1}) => {
  const c = active ? PURPLE_LIGHT : color;
  const pts = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const x = cx - s / 2 + (i / n) * s;
    const y = cy + Math.sin((i / n) * Math.PI * 3 + phase) * s * 0.2 * amp;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return <polyline points={pts.join(' ')} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
};
/** 网格 / 索引空间（向量检索、分块）。 */
export const GridIcon = ({cx, cy, s = 190, color = GREY_LINE, sw = 1.6, opacity = 1, cells = [], activeCell = -1, dot = 5}) => {
  const half = s / 2;
  const step = s / 6;
  const lines = [];
  for (let i = 0; i <= 6; i++) {
    const t = -half + i * step;
    lines.push(<line key={`v${i}`} x1={cx + t} y1={cy - half} x2={cx + t} y2={cy + half} stroke={color} strokeWidth={sw} />);
    lines.push(<line key={`h${i}`} x1={cx - half} y1={cy + t} x2={cx + half} y2={cy + t} stroke={color} strokeWidth={sw} />);
  }
  return (
    <g opacity={opacity}>
      {lines}
      {cells.map((c, i) => (
        <circle key={i} cx={cx + c[0] * half} cy={cy + c[1] * half} r={i === activeCell ? dot * 1.8 : dot} fill={i === activeCell ? PURPLE_LIGHT : WHITE} opacity={i === activeCell ? 1 : 0.75} />
      ))}
    </g>
  );
};

/** 图标注册表：分镜表里按 kind 指名，镜头文件不自己画。 */
export const ICONS = {
  doc: DocIcon,
  db: DBIcon,
  chunk: ChunkCard,
  chip: ChipIcon,
  lock: LockIcon,
  shield: ShieldIcon,
  key: KeyIcon,
  link: LinkIcon,
  person: PersonIcon,
  rack: RackIcon,
  funnel: FunnelIcon,
  gauge: GaugeIcon,
  clock: ClockIcon,
  scale: ScaleIcon,
  branch: BranchIcon,
  wave: WaveIcon,
  grid: GridIcon,
};

export const Icon = ({kind, ...rest}) => {
  const C = ICONS[kind];
  if (!C) return null;
  return <C {...rest} />;
};
