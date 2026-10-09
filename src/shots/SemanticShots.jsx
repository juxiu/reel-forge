import React from 'react';
import {useCurrentFrame} from 'remotion';
import {buildPlan} from './plan.mjs';
import {ReelContext} from './context.mjs';
import {useDesign} from '../remotion/Design.jsx';
import {Box, CText, ChainArrows, Check, Cross, FocusIn, GREY, GREY_LINE, GREY_MID, Label, LineArrow, PURPLE, PURPLE_LIGHT, SoftIn, Svg, TechText, WHITE} from '../remotion/Primitives.jsx';
import {BigNumber, CameraRig, GhostText, GlowBlob, HaloRing, HeroGlow, LightSweep, SET_PIECE, StageLine, TiltPlane, countTo, ghostOpacity, setPiece} from '../remotion/Fx.jsx';
import {Icon} from '../remotion/Icons.jsx';
import {BEAT, clamp01, drawOn, emphasisPulse, exitDrop, slideIn, softOp} from '../visual/easing.mjs';

/**
 * 语义镜头引擎 —— 分镜数据（RenderIR + 镜头文件里的 SHOT_RECIPE）到画面的那一段。
 *
 * 构图固定成两条横向带，纵向尺寸由当前画幅推导（同一份代码服务 16:9 与 9:16）：
 *   主角带  内容区上 42%   一个够大的字 / 大数字 / 图形，独占视觉重心
 *   机理带  其余部分      按变体安排的配角图元：白描边图标 + 26px 标签 + 连线
 * composition.focus = 'single-hero' 时主角带吃满内容区，配角缩到主角脚下的窄轨。
 *
 * 三条纪律写死在这里，不给镜头文件留口子：
 *   1) 紫色只给当前重点：同镜头 ≤1 个 active 图元（多余的由 plan 降级并记 issue）；
 *   2) 光只跟主角：配角不带 glow / box-shadow，柔光呼吸只给主角；
 *   3) 三轮紫光横扫（LightSweep）由**全片白名单**放行 —— 只有 ReelContext.fx.sweepScenes 列到的镜头才画。
 *      引擎自己不按「这镜看起来精彩」加戏，全片 ≤2 处是片级预算。
 *
 * ⚠ 入场帧一律来自 plan（相对本镜头首块字幕 −6…+3、逐件 2 帧错峰），镜头文件不要另算。
 * ⚠ 这里不做文案兜底：分镜没给合法主角文案时 plan 报 hero-overlong，画面退化成关键词，
 *    交给 selfcheck/QC 拦下 ——「按字号预算截断加省略号」是上一版最伤画面的写法。
 *
 * ⚠ 9:16 说明：参照项目本身只支持 1280×720 横屏，reel-forge 的竖屏是按宽度归一到 1280 逻辑宽
 *    （s=720/1280）实现的，内容区按 0.35×logicalH 纵向放宽，构图仍是横屏那套。
 *    真竖屏构图（纵向堆叠、字号按设备像素下限重算）是后续独立一步，现在不要当已达标。
 */

/** 内容区纵向划分：主角带 / 机理带（随 logicalH 伸缩，16:9 时与样片逐像素一致）。 */
export function layoutBands(bands, logicalH = 720) {
  const top = bands.contentTop ?? 175;
  const bottom = bands.contentBottom ?? logicalH - 100;
  const avail = bottom - top;
  const designH = Math.round(Math.min(avail, Math.max(445, logicalH * 0.35)));
  const offset = Math.round((avail - designH) / 2);
  const ct = top + offset;
  const cb = ct + designH;
  return {
    full: {top: ct, bottom: cb},
    hero: {top: ct, bottom: Math.round(ct + designH * 0.42)},
    support: {top: Math.round(ct + designH * 0.42 + 12), bottom: cb},
    designH,
  };
}

const isCJK = (s) => /[㐀-䶿一-鿿]/.test(String(s || ''));

export function SemanticShot({scene, recipe = {}, variant, captions: captionsProp, stage}) {
  const frame = useCurrentFrame();
  const d = useDesign();
  const ctx = React.useContext(ReelContext) || {};
  const fps = Number(ctx.fps) || 30;
  const captions = captionsProp || ctx.captions || [];
  const N = frame + 1; // 镜头内 1-based：Remotion 的 useCurrentFrame() 是 0-based

  const plan = buildPlan({scene, recipe: {...recipe, variant: variant || recipe.variant}, captions, fps, bands: d.bands, logicalH: d.height});
  const lb = layoutBands(d.bands, d.height);
  const pos = heroPos(plan, lb);
  const sp = setPiece(1, plan.subFrom);
  const ex = N >= plan.exit.exitAt ? exitDrop(N - plan.exit.exitAt, 12) : {opacity: 1, dy: 0};
  const sceneId = String(scene?.id || scene?.scene_id || '');
  const sweepAllowed = plan.fx.sweep && (ctx.fx?.sweepScenes || []).includes(sceneId);

  return (
    <div style={{position: 'absolute', inset: 0, opacity: ex.opacity, transform: `translateY(${ex.dy.toFixed(1)}px)`}}>
      <CameraRig N={N} keys={plan.camera.keys}>
        {sweepAllowed ? <LightSweep N={N} rounds={sp.sweeps} dy={pos.cy - 335} /> : null}
        {plan.fx.setPiece ? <StageLine N={N} f0={sp.line} flashAt={sp.flash} cy={pos.cy} w={760} /> : null}
        {plan.fx.setPiece ? <GhostHero plan={plan} N={N} pos={pos} until={sp.pulse} /> : null}
        {stage
          ? <StageLayer stage={stage} plan={plan} N={N} scene={scene} recipe={recipe} lb={lb} pos={pos} sp={sp} d={d} />
          : <SceneContent plan={plan} N={N} pos={pos} lb={lb} sp={sp} />}
      </CameraRig>
    </div>
  );
}

/**
 * 组私有舞台层。
 *
 * ⚠ 离场 / 运镜 / 扫光 / setPiece 全部在外层（SemanticShot）统一施加，这里只画画面内容 ——
 *    让舞台组件拿到 N（镜头内 1-based 帧号）就能按绝对节拍编排，不需要也不允许自己管相机。
 * ⚠ stage.components 是**按组**给的映射：镜头文件只报自己的 shot_id，
 *    映射查不到就退回通用引擎（而不是抛错）——舞台是增强，不该成为单点故障。
 */
function StageLayer({stage, plan, N, scene, recipe, lb, pos, sp, d}) {
  const Comp = pickStageComponent(stage, plan, recipe);
  if (!Comp) return <SceneContent plan={plan} N={N} pos={pos} lb={lb} sp={sp} />;
  return (
    <StageOrientation d={d}>
      <Comp plan={plan} N={N} scene={scene} recipe={recipe} lb={lb} pos={pos} sp={sp} design={d} />
    </StageOrientation>
  );
}

/**
 * 竖屏摆位：把按 16:9 设计的构图块**居中**到竖屏内容区。
 *
 * ⚠ 现状与边界要说清楚：竖屏逻辑画布高 2276，而各拓扑的内容块按 16:9 写在 y175–620。
 *   不做这一步时，构图被钉在画布顶部 —— 只占竖屏内容区的 22%，下面 1700px 全空，
 *   字幕带孤零零挂在最底下。这不是「另有一套竖屏构图」，那是**同一块构图居中**。
 *
 * ⚠ 真正的竖屏重构（纵向堆叠、字号按设备像素下限重算、双栏改单栏）**没有做**，
 *   参照项目本身也只有 1280×720，没有竖屏参照物。这里不把它写成「已支持竖屏」：
 *   能保证的是双比例**时长/顺序/拓扑/文案完全一致**（verify:text-provenance C 段在判），
 *   画面是同一块构图居中，不做纵向重排。
 */
const PORTRAIT_MIN_LOGICAL_H = 900;
const BASE_CONTENT_CENTER = 398; // 16:9 内容区 y175–620 的中点
function StageOrientation({d, children}) {
  if (!d || d.height <= PORTRAIT_MIN_LOGICAL_H) return children;
  const dy = Math.round((d.bands.contentTop + d.bands.contentBottom) / 2 - BASE_CONTENT_CENTER);
  if (!dy) return children;
  return <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`}}>{children}</div>;
}

/** 按 shot_id 在组私有映射里取组件；取不到返回 null（退回通用引擎）。 */
function pickStageComponent(stage, plan, recipe) {
  if (typeof stage === 'function') return stage;
  const id = String(recipe?.shot_id || plan?.variant || '');
  const map = stage?.components;
  if (map && typeof map === 'object') return map[id] || null;
  return null;
}

/** 主角位置：单主角模式吃满内容区宽，双带模式左置（mirror 时右置）。 */
function heroPos(plan, lb) {
  const single = plan.focus === 'single-hero';
  const cy = Math.round(single ? (lb.full.top + lb.full.bottom) / 2 : (lb.hero.top + lb.hero.bottom) / 2);
  const usable = 1160;
  const cx = single ? 640 : Math.round(plan.mirror ? 1220 - usable * 0.6 / 2 : 60 + usable * 0.6 / 2);
  return {cx, cy, single, squeeze: isCJK(plan.hero.text) ? 0.85 : 1};
}

/** 登场型高光的幽灵轮廓：主角白描边 10% 隐现，脉冲起撤掉。 */
const GhostHero = ({plan, N, pos, until}) => {
  if (plan.hero.kind === 'number') return null;
  const op = ghostOpacity(N, SET_PIECE.ghost + 1, until);
  if (op <= 0) return null;
  return (
    <GhostText cx={pos.cx} cy={pos.cy} size={plan.hero.size} letterSpacing={0} opacity={op}>
      {plan.hero.text}
    </GhostText>
  );
};

// ---------------- 配角排布 ----------------
/**
 * 给每个配角算槽位（设计像素）。authored stage 显式给了 x/y 就直接用，
 * 其余按变体选一种几何：环状 / 双栏 / 清单 / 链条 / 汇聚。
 */
export function itemSlots(plan, lb) {
  const out = new Map();
  const rails = plan.items.filter((it) => it.kind === 'flow');
  const solid = plan.items.filter((it) => it.kind !== 'flow');

  const band = plan.focus === 'single-hero' ? {l: 90, r: 1190, t: lb.support.top, b: lb.support.bottom} : {l: 720, r: 1200, t: lb.support.top, b: lb.support.bottom};
  const w = band.r - band.l;
  const h = band.b - band.t;

  solid.forEach((it) => {
    if (Number.isFinite(Number(it.x)) && Number.isFinite(Number(it.y))) {
      out.set(it.id, {cx: Math.round(Number(it.x) + (Number(it.w) || 0) / 2), cy: Math.round(Number(it.y) + (Number(it.h) || 0) / 2), w: Number(it.w) || undefined, h: Number(it.h) || undefined, authored: true});
    }
  });
  const auto = solid.filter((it) => !out.get(it.id));
  const n = auto.length;

  const rowLayout = (rowLike) => {
    const rowH = Math.floor(h / Math.max(1, n));
    auto.forEach((it, i) => out.set(it.id, {cx: Math.round(band.l + w / 2), cy: Math.round(band.t + rowH * (i + 0.5)), w: Math.round(w), h: rowLike ? Math.min(56, rowH - 10) : Math.max(40, rowH - 12), ...rowLike}));
  };
  const gridLayout = (cols) => {
    const cw = Math.floor(w / cols) - 14;
    const ch = Math.floor(h / Math.max(1, Math.ceil(n / cols))) - 10;
    auto.forEach((it, i) => out.set(it.id, {cx: Math.round(band.l + cw / 2 + (i % cols) * (cw + 14)), cy: Math.round(band.t + ch / 2 + Math.floor(i / cols) * (ch + 10)), w: cw, h: ch}));
  };

  switch (plan.variant) {
    case 'network': {
      const cx = Math.round(band.l + w / 2);
      const cy = Math.round(band.t + h / 2);
      const rx = Math.max(60, Math.min(215, Math.round(w / 2) - 30));
      const ry = Math.max(40, Math.min(112, Math.round(h / 2) - 26));
      auto.forEach((it, i) => {
        const a = (Math.PI * 2 * i) / Math.max(1, n) - Math.PI / 2;
        out.set(it.id, {cx: Math.round(cx + Math.cos(a) * rx), cy: Math.round(cy + Math.sin(a) * ry), hub: {cx, cy}});
      });
      break;
    }
    case 'comparison':
      gridLayout(Math.max(1, Math.min(2, n)));
      break;
    case 'structured':
      rowLayout();
      auto.forEach((it) => out.set(it.id, {...out.get(it.id), list: true}));
      break;
    case 'code':
      rowLayout();
      auto.forEach((it) => out.set(it.id, {...out.get(it.id), code: true}));
      break;
    case 'preference':
      rowLayout({row: true});
      break;
    case 'evidence': {
      const cw = Math.floor(w / Math.max(1, n)) - 14;
      auto.forEach((it, i) => out.set(it.id, {cx: Math.round(band.l + cw / 2 + i * (cw + 14)), cy: Math.round(band.t + (i === 0 ? h * 0.16 : h * 0.74)), w: cw, h: Math.round(h * 0.42), fan: i > 0}));
      break;
    }
    case 'sequence':
    case 'causal':
    case 'split':
    case 'transformation': {
      const cols = Math.min(3, Math.max(1, n));
      gridLayout(cols);
      if (Math.ceil(n / cols) === 1) auto.forEach((it, i) => out.set(it.id, {...out.get(it.id), chain: i < n - 1}));
      break;
    }
    default:
      rowLayout();
  }

  rails.forEach((it, i) => out.set(it.id, {rail: true, y: Math.round(lb.support.bottom - 24 - i * 30), l: 90, r: plan.focus === 'single-hero' ? 1190 : 690}));
  return out;
}

// ---------------- 渲染 ----------------
const SceneContent = ({plan, N, pos, lb, sp}) => {
  const slots = itemSlots(plan, lb);
  const pulse = plan.fx.pulse && N >= sp.pulse ? emphasisPulse(N - sp.pulse) : 1;
  // 光环：登场型高光按舞台线帧起，单独声明 fx.halo 的镜头也要能亮（否则 halo 是个假开关，
  // 分镜里写了却什么都不会发生——这类「声明了但渲染层不认」的键最容易被当成已经生效）。
  const haloOn = plan.fx.halo || plan.fx.setPiece;
  const haloAt = plan.fx.setPiece ? SET_PIECE.line + 1 : 8;
  const haloP = haloOn ? drawOn(N - haloAt, 26) : 0;
  const haloCy = Math.round((lb.hero.bottom + lb.support.top) / 2);
  const haloPhase = (N - SET_PIECE.line) * 2.2;
  // 分层视差只在分镜声明 parallax 时启用：主角（前景）位移比相机大，描边/连线（背景）几乎不动。
  // 深度来自**同一份相机 keys**，不是各层自己加动画 —— 否则运镜 QC 判的位移和画面看到的位移不是一回事。
  const dp = plan.camera.depths;
  const haloBack = haloP > 0 ? <HaloRing cx={pos.cx} cy={haloCy} p={haloP} half="back" fillOp={0.5 * haloP} phase={haloPhase} /> : null;
  const haloFront = haloP > 0 ? <HaloRing cx={pos.cx} cy={haloCy} p={haloP} half="front" fillOp={0.5 * haloP} phase={haloPhase} /> : null;
  const faces = plan.items.map((it) => {
    const s = slots.get(it.id);
    if (!s || s.rail) return null;
    return <ItemFace key={it.id} it={it} slot={s} N={N} />;
  });
  if (!dp) {
    return (
      <>
        {haloBack}
        <HeroLayer plan={plan} N={N} pos={pos} pulse={pulse} />
        {haloFront}
        <Svg>
          <ItemStrokes plan={plan} N={N} slots={slots} lb={lb} />
        </Svg>
        {faces}
      </>
    );
  }
  return (
    <>
      <ParallaxLayer N={N} keys={plan.camera.keys} depth={dp.back}>
        <Svg>
          <ItemStrokes plan={plan} N={N} slots={slots} lb={lb} />
        </Svg>
      </ParallaxLayer>
      {haloBack}
      {faces}
      <ParallaxLayer N={N} keys={plan.camera.keys} depth={dp.front}>
        <HeroLayer plan={plan} N={N} pos={pos} pulse={pulse} />
      </ParallaxLayer>
      {haloFront}
    </>
  );
};

/** 主角层：文字 / 大数字两种主角，矩形柔光 vs 圆形光斑；光只打这里。 */
const HeroLayer = ({plan, N, pos, pulse}) => {
  const hero = plan.hero;
  // 主角入场帧由 plan 给（= 首句字幕 −4，钳到镜头首帧）；写死 1 会让主角比解说早登场，
  // 镜头比字幕块早开几帧时尤其明显（观众看到画面已经摆好了，耳朵里还在说上一句）。
  const heroF0 = Number(hero.f0) || 1;
  const k = clamp01(plan.key) * softOp(N - heroF0, BEAT.SOFT_IN);
  const node =
    hero.kind === 'number' ? (
      <BigNumber cx={pos.cx} cy={pos.cy} value={countTo(N - heroF0, 0, hero.value ?? 0, BEAT.COUNTER)} size={Math.max(110, Math.round(hero.size * 0.66))} unit={hero.unit} />
    ) : (
      <CText cx={pos.cx} cy={pos.cy} size={hero.size} weight={900} color={WHITE} scaleX={pos.squeeze} maxW={hero.maxW} shadow={k > 0.5 ? '0 0 34px rgba(102,45,248,.45)' : undefined}>
        {hero.text}
      </CText>
    );
  const boxW = Math.min(hero.maxW || 696, 700);
  return (
    <>
      {hero.kind === 'number' ? <GlowBlob cx={pos.cx} cy={pos.cy} r={Math.round(hero.size * 1.2)} N={N} k={k} /> : <HeroGlow x={pos.cx - boxW / 2} y={pos.cy - hero.size / 2 - 14} w={boxW} h={hero.size + 28} N={N} k={k * 0.9} />}
      <div style={{position: 'absolute', inset: 0, transform: `scale(${pulse.toFixed(4)})`, transformOrigin: `${pos.cx}px ${pos.cy}px`}}>
        {plan.fx.glitch ? <FocusIn N={N} f0={heroF0} seed={7}>{node}</FocusIn> : <SoftIn N={N} f0={heroF0} len={BEAT.SOFT_IN}>{node}</SoftIn>}
      </div>
      {hero.sub ? (
        <SoftIn N={N} f0={plan.subFrom + 16}>
          <TechText x={pos.single ? 490 : pos.cx - boxW / 2} y={pos.cy + hero.size * 0.72} size={30}>
            {hero.sub}
          </TechText>
        </SoftIn>
      ) : null}
    </>
  );
};

/** 描边层：连线 / 卡片框 / 轨道 / 图标 / 分镜显式连线 —— 一张 SVG 画完。 */
const ItemStrokes = ({plan, N, slots, lb}) => {
  const nodes = [];
  for (const it of plan.items) {
    const s = slots.get(it.id);
    if (!s) continue;
    if (s.rail) {
      nodes.push(<Rail key={it.id} N={N} f0={it.f0} s={s} />);
      continue;
    }
    const op = softOp(N - it.f0, BEAT.SOFT_IN);
    if (op <= 0) continue;
    const draw = drawOn(N - it.f0, BEAT.DRAW_ON);

    if (it.icon) {
      nodes.push(
        <g key={`i${it.id}`} opacity={op}>
          <Icon
            kind={it.icon}
            cx={s.cx}
            cy={s.cy - (it.text ? 24 : 0)}
            s={iconSize(s)}
            active={it.active}
            reveal={draw}
            check={draw}
            value={clamp01((N - it.f0) / 26)}
            flow={clamp01((N - it.f0) / 60)}
            lit={Math.floor(((N - it.f0) / 12) % 4)}
            N={N}
            {...(it.props || {})}
          />
        </g>,
      );
    }
    if (s.w && (s.row || s.code || plan.variant === 'comparison' || plan.variant === 'evidence' || it.kind === 'box')) {
      const bw = s.w * draw;
      nodes.push(<rect key={`r${it.id}`} x={s.cx - bw / 2} y={s.cy - s.h / 2} width={bw} height={s.h} rx={10} fill="none" stroke={it.active ? PURPLE : GREY_LINE} strokeWidth={it.active ? 2.5 : 2} opacity={op} />);
    }
    if (s.list) {
      nodes.push(<line key={`l${it.id}`} x1={s.cx - s.w / 2} y1={s.cy + s.h / 2} x2={s.cx - s.w / 2 + s.w * draw} y2={s.cy + s.h / 2} stroke={it.active ? PURPLE : GREY_LINE} strokeWidth={2} opacity={op} />);
    }
    if (s.hub) nodes.push(<LineArrow key={`a${it.id}`} x1={s.hub.cx} y1={s.hub.cy} x2={s.cx} y2={s.cy} progress={draw} color={it.active ? PURPLE_LIGHT : GREY_MID} width={it.active ? 2.5 : 2} head={0} />);
    if (s.chain) {
      const nxt = plan.items[plan.items.indexOf(it) + 1];
      const ns = nxt ? slots.get(nxt.id) : null;
      if (ns) nodes.push(<LineArrow key={`c${it.id}`} x1={s.cx + s.w / 2 + 6} y1={s.cy} x2={ns.cx - ns.w / 2 - 8} y2={ns.cy} progress={draw} color={it.active ? PURPLE_LIGHT : WHITE} width={2.5} head={9} glow={it.active} />);
    }
    if (s.fan) {
      const first = plan.items.find((x) => !slots.get(x.id)?.fan && !slots.get(x.id)?.rail);
      const fs = first ? slots.get(first.id) : null;
      if (fs) nodes.push(<LineArrow key={`f${it.id}`} x1={s.cx} y1={s.cy - s.h / 2} x2={fs.cx} y2={fs.cy + fs.h / 2} progress={draw} color={it.active ? PURPLE_LIGHT : GREY_MID} width={2} head={8} />);
    }
    if (it.mark === 'check') nodes.push(<Check key={`ck${it.id}`} cx={s.cx + (s.w || 120) / 2 - 22} cy={s.cy} size={30} progress={draw} color={it.active ? PURPLE_LIGHT : WHITE} />);
    if (it.mark === 'cross') nodes.push(<Cross key={`cx${it.id}`} cx={s.cx + (s.w || 120) / 2 - 22} cy={s.cy} size={26} progress={draw} color={GREY} />);
  }

  const net = plan.items.find((it) => slots.get(it.id)?.hub);
  if (net) {
    const {hub} = slots.get(net.id);
    const r = slideIn(N - net.f0, 20, 2.5);
    nodes.push(<circle key="hub" cx={hub.cx} cy={hub.cy} r={16 + 8 * r} fill="none" stroke={PURPLE_LIGHT} strokeWidth={2.5} opacity={r} />);
    nodes.push(<circle key="hub2" cx={hub.cx} cy={hub.cy} r={30 + 6 * Math.sin((N - net.f0) * 0.12)} fill="none" stroke={GREY_LINE} strokeWidth={1.6} opacity={r * 0.7} />);
  }
  if (plan.variant === 'transformation') {
    nodes.push(<TiltPlane key="tilt" cx={640} cy={Math.round((lb.support.top + lb.support.bottom) / 2)} w={520} h={200} skew={-22} sy={0.42} opacity={softOp(N - 2, 12) * 0.5} sw={1.6} stroke={GREY_LINE} />);
  }
  // 分镜显式声明的连线（authored stage 用图元 id 引用）
  plan.links.forEach((l, i) => {
    const a = slots.get(l.from);
    const b = slots.get(l.to);
    if (!a || !b || a.rail || b.rail) return;
    nodes.push(<ChainArrows key={`lk${i}`} points={[[a.cx, a.cy], [b.cx, b.cy]]} N={N} f0={l.f0} per={6} color={a.active || b.active ? PURPLE_LIGHT : WHITE} />);
  });
  return <>{nodes}</>;
};

const iconSize = (s) => Math.round(Math.min(132, Math.max(86, s.w ? s.w * 0.5 : 110)));

/** 数据流轨道：内容区横轨 + 匀速行进小球（持续到下一拍的动词）。 */
const Rail = ({N, f0, s}) => {
  const op = softOp(N - f0, BEAT.SOFT_IN);
  if (op <= 0) return null;
  return (
    <g opacity={op}>
      <line x1={s.l} y1={s.y} x2={s.r} y2={s.y} stroke={GREY_LINE} strokeWidth={2} strokeDasharray="14 10" />
      {[0, 0.34, 0.68].map((o, i) => {
        const t = ((N - f0) / 54 + o) % 1;
        return <circle key={i} cx={s.l + (s.r - s.l) * t} cy={s.y} r={i === 1 ? 6 : 4.5} fill={i === 1 ? PURPLE_LIGHT : WHITE} opacity={0.35 + 0.65 * Math.sin(Math.PI * t)} />;
      })}
    </g>
  );
};

/** 配角的文字面：大数字 / 代码块 / 标签；active 才转紫。 */
const ItemFace = ({it, slot, N}) => {
  const op = softOp(N - it.f0, 8);
  if (op <= 0) return null;
  const color = it.active ? PURPLE_LIGHT : WHITE;
  if (it.kind === 'number' && it.value !== null) {
    return <BigNumber cx={slot.cx} cy={slot.cy} value={countTo(N - it.f0, 0, it.value, BEAT.COUNTER)} size={Math.min(96, Math.max(54, Math.round((slot.h || 90) * 0.72)))} unit={it.unit} opacity={op} />;
  }
  if (it.kind === 'code') {
    const w = slot.w || 320;
    const h = slot.h || 44;
    return (
      <>
        <Box x={slot.cx - w / 2} y={slot.cy - h / 2} w={w} h={h} border={it.active ? PURPLE : GREY_LINE} radius={8} bloom={false} style={{opacity: op}} />
        <Label x={slot.cx - w / 2 + 14} y={slot.cy - 16} size={24} color={color} opacity={op} family="'SF Mono', Menlo, Consolas, monospace">
          {it.text}
        </Label>
      </>
    );
  }
  if (!it.text) return null;
  return <CText cx={slot.cx} cy={slot.cy + (it.icon ? 32 : 0)} size={it.icon ? 26 : 30} weight={800} color={color} opacity={op} maxW={Math.max(120, (slot.w || 240) - 18)}>{it.text}</CText>;
};

export default SemanticShot;
