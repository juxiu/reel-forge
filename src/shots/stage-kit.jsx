import React from "react";
import {Box, CText, ChainArrows, Check, Cross, Label, LineArrow, MonoText, Pill, SoftIn, Svg, TechSub, WHITE} from "../remotion/Primitives.jsx";
import {GlowBlob, HaloRing, HeroGlow, Sparkle, TiltPlane} from "../remotion/Fx.jsx";
import {Icon} from "../remotion/Icons.jsx";
import {abs} from "../remotion/Design.jsx";
import {GREY, GREY_LIGHT, GREY_LINE, GREY_MID, PURPLE, PURPLE_LIGHT, Rgba, mixHex} from "../visual/style.mjs";
import {BEAT, clamp01, drawOn, fadeIn, powOutRemain, rnd, softOp} from "../visual/easing.mjs";

/**
 * 舞台套件：组私有舞台共用的底层语汇 + 一组拓扑各异的构图。
 *
 * 形态对齐参照片 examples/rag/shots_src/Gn/ 的做法（一组镜头共用一个舞台，状态是帧号的纯函数），
 * 但**刻意不复制它按组重复私有模块的写法**：参照片 8 个组各带一份 layout.tsx / g3ui.tsx /
 * vspace.ts，加起来一千多行里大部分是重复的槽位、轨道与焦点爬坡。这里把那些抽成一套 kit，
 * 各组 stage.jsx 只留**本组的拓扑清单与镜头映射**。
 *
 * ⚠ 为什么这么分：重复八份的代价不是磁盘，是漂移——八份 focusWalk 会各自演进，
 *   于是「紫色焦点只在一个槽」这条纪律在第 5 组悄悄失效没人知道。共用一份就没有这个问题。
 *   真正需要各组自己写的不是这些零件，而是**镜头映射与参数**（哪些镜用哪种拓扑、
 *   谁是焦点、焦点何时交接），那些仍然写在各组的 stage.jsx 与镜头 recipe 里。
 *
 * ⚠ 拓扑不是「变体名换皮」：每个 kind 的骨架结构不同（环 / 双栏 / 行 / 轨 / 层 / 梯 / 表 / 窗），
 *   不存在两个 kind 能靠同一套排版函数渲染出来。
 *   scripts/verify-authored-shots.mjs 按 kind 做组内去重与全片占比审计。
 */

/**
 * 内容区（16:9）。所有构图必须落在这一带：y<175 有流程轨，y>620 是字幕带。
 *
 * ⚠⚠ 但**画布上的坐标不等于最终像素**：CameraRig 会做
 *   `translate(640,360) scale(s) translate(-cam)`，s 最大约 1.083（pan）。
 *   所以「y ≤ 620」并不够 —— 变换后会被推到 638（正好落进字幕带）。
 *   反解出真正该守的上界：**变换前 y ≤ 360 + (607-360)/1.083 ≈ 588**。
 *   这就是底部副标一律放在 `AREA.b - 60`（=580）的原因；
 *   放在 -4 / -6 / -24 都会被相机推进字幕带 —— verify:shot-sample 实测 17.79% 的空隙带被点亮。
 *
 * 换句话说：cameraSafe 是**变换后**的约束，而构图是**变换前**写的，中间隔着一层逆变换。
 */
export const AREA = {l: 60, r: 1220, t: 175, b: 620};

/** 底部内容在**变换前**必须≤ 这个值，才保证变换后仍在 cameraSafe.bottom(607) 之内。 */
export const AREA_BOTTOM_SAFE = 588;

/**
 * 图标容器：把 Icons.jsx 的图元包进自己的 <svg>。
 *
 * ⚠ 为什么必须有它：Icons.jsx 里每个图元返回的是 SVG 的 `<g>`（见 DocIcon）。
 *   `<g>` 放在 `<svg>` 之外会被浏览器直接丢弃 —— 不报错、不报警，画面上就是**图标整片消失**。
 *   通用引擎没这个问题是因为它把图标都放进 `SemanticShots` 的 `<Svg>` 描边层里；
 *   而组私有舞台是直接在 `<div>` 里摆图元的，于是 19 处调用集体隐身。
 *   这个 bug 只有真渲染才看得见：静态门（syntax / imports / jsx-symbols）全绿。
 *
 * 用法：给的是**图元要画的中心点**（cx/cy）与边长 s，容器自动对齐。
 */
export const Glyph = ({kind, cx, cy, s, active = false, reveal, opacity = 1, bloom = false, style}) => {
  if (!kind) return null;
  const pad = Math.max(8, Math.round(s * 0.12));
  const box = s + pad * 2;
  return (
    <svg
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      style={{
        position: 'absolute',
        left: cx - box / 2,
        top: cy - box / 2,
        overflow: 'visible',
        opacity,
        filter: bloom ? 'drop-shadow(0 0 3px rgba(255,255,255,.45))' : undefined,
        ...style,
      }}
    >
      <Icon kind={kind} cx={box / 2} cy={box / 2} s={s} active={active} reveal={reveal} />
    </svg>
  );
};

/**
 * 入场帧的唯一口径。
 *
 * ⚠ 舞台不自己另算入场帧：`plan.hero.f0` 由 buildPlan 从**首块字幕**推出（锚在 −6…+3 窗口内），
 *   所以 authored 镜头和语义镜头用的是同一套节拍，QC 判的窗口对两者都成立。
 *   recipe 的 focus 是**相对入场帧的偏移**而不是绝对帧 —— 换片子、换字幕块时
 *   整组的焦点交接会自动跟着首句走，不会因为写死绝对帧而整组错拍。
 */
export const entryOf = (plan, st) => Number(plan?.hero?.f0) || Number(st?.in) || 1;

/**
 * 焦点拍表（绝对帧号）。**优先用 plan 里铺满整镜的 tileFocus 结果**。
 *
 * ⚠ 为什么要换口径：作者写在 recipe.stage.focus 里的偏移是**相对入场帧、只覆盖镜头前段**的
 *   （典型 [0,40,80]，加起来约 110 帧），而镜头有 150–323 帧。末拍之后画面上只剩幕底呼吸，
 *   motion_check 实测变化 0.02–0.12（still_thr = 0.35 以下）→ 每镜都报 motion_too_low（阻断）。
 *   plan.mjs 的 tileFocus 把作者的分格节奏按周期铺满整镜，这里直接消费结果；
 *   plan 没给（非 authored 镜、或旧计划）时才回退到「入场帧 + 相对偏移」的老口径。
 */
export const marksOf = (plan, st) => {
  const tiled = plan?.focusMarks;
  if (Array.isArray(tiled) && tiled.length) return tiled;
  return (st?.focus || []).map((o) => entryOf(plan, st) + Number(o));
};

/** 焦点爬坡帧数：起/落各 11 帧，交接瞬间两槽交叠在 0.5 附近。
 *  真源在 BEAT.FOCUS_RISE —— plan.mjs 铺焦点拍表时要按同一个数字预留末拍落位窗口。 */
export const FOCUS_RISE = BEAT.FOCUS_RISE;

/**
 * 紫色焦点在若干**槽**之间游走。
 *
 * @param marks 焦点拍表（绝对帧号，可能跨多轮循环 —— 长度 ≥ slots）
 * @param N     当前镜内 1-based 帧号
 * @param slots 槽数（= plan.focusSlots，取「作者焦点数」与「图元数」的较大者）
 * @returns k[] 每个槽的紫度（0–1）；拍表第 j 拍驱动槽 j % slots。
 *
 * 11 帧爬坡上升、下一拍激活后 11 帧回落 —— 任一帧至多一个槽满紫，纪律「紫只给当前重点」靠这一处实现。
 * 拍表铺满整镜后，末拍之后的段落也持续有槽在交接，画面因此全镜都有大面积步进变化。
 */
export function focusWalk(marks, N, slots = marks.length, rise = FOCUS_RISE) {
  const n = Math.max(1, Math.round(Number(slots) || marks.length || 1));
  const k = new Array(n).fill(0);
  for (let j = 0; j < marks.length; j++) {
    const up = clamp01((N - marks[j]) / rise);
    const next = marks[j + 1];
    const down = next === undefined ? 0 : clamp01((N - next) / rise);
    const v = up * (1 - down);
    const slot = j % n;
    if (v > k[slot]) k[slot] = v;
  }
  return k;
}

/**
 * 槽 i 是否已成为「过去」（注意力交给下一拍时降到 0.6 倍，而不是清场——这是承接做法）。
 * 取「最后一个已到、且槽序为 i 的拍」的下一拍作为回落基准；拍表循环时下一轮会自然把它复位。
 */
export const isPast = (i, marks, N, slots = marks.length, rise = FOCUS_RISE) => {
  const n = Math.max(1, Math.round(Number(slots) || marks.length || 1));
  let j = -1;
  for (let t = 0; t < marks.length; t++) if (marks[t] <= N && t % n === i) j = t;
  if (j < 0) return 0;
  const next = marks[j + 1];
  if (next === undefined) return 0;
  return clamp01((N - next) / rise);
};

// ---------------------------------------------------------------- 私有图元

/** 主角光环的爬坡：入场后 26 帧 draw-on，常亮不再变化（呼吸交给 HeroGlow）。 */
const haloOn = (N, f0) => clamp01((N - f0 - 8) / 26);

/**
 * 中心节点：本镜主角。紫色柔光 + 脚下光环 + 入场时三颗小星。
 * 高度由 recipe.hero_size 给（≥HERO_MIN 170），**光只打这里** —— 配角一律不带光。
 */
export const Core = ({cx, cy, size, N, f0, icon = "shield", label = "", iconScale = 24}) => {
  const n = N - f0;
  if (n < 0) return null;
  const s = clamp01(1 - powOutRemain(n, BEAT.SCALE_IN, 2.2));
  const k = clamp01(0.15 + 1.4 * s);
  const halo = haloOn(N, f0) * k;
  const half = size / 2;
  return (
    <>
      <HaloRing cx={cx} cy={cy + half + 26} rxo={size * 0.92} ryo={size * 0.2} rxi={size * 0.62} ryi={size * 0.13} p={halo} fillOp={0.5 * halo} phase={(N - f0) * 2.2} half="back" />
      <HeroGlow x={cx - size / 2} y={cy - size / 2} w={size} h={size} N={N} k={k * 0.9} />
      <div style={{position: "absolute", inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: s > 0 ? `scale(${s.toFixed(3)})` : undefined, opacity: k}}>
        <div style={{...abs(cx - half, cy - half, size, size), display: "flex", alignItems: "center", justifyContent: "center"}}>
          <Glyph kind={icon} cx={half} cy={half} s={size - iconScale} active reveal={1} glow={false} />
        </div>
      </div>
      {[0, 1, 2].map((j) => {
        const kk = n - 20 - j * 4;
        if (kk < 0 || kk > 34) return null;
        const op = fadeIn(kk, 8) * (1 - clamp01((kk - 20) / 14));
        if (op <= 0) return null;
        return <Sparkle key={j} cx={cx - size / 2 + 24 + rnd(31, j) * (size - 48)} cy={cy - half - 20 - rnd(32, j) * 40} r={9 + rnd(33, j) * 7} opacity={op} color={WHITE} />;
      })}
      {label ? (
        <SoftIn N={N} f0={f0 + 16}>
          {/* 22px：主角副标签收窄，底部两侧卫星的标签（radial/orbit 椭圆 ±60°）不再与它角碰 */}
          <TechSub cx={cx} cy={cy + half + 66} size={22}>{label}</TechSub>
        </SoftIn>
      ) : null}
    </>
  );
};

/**
 * 小图标节点：白描边图标 + 可选标签。**不带光**（光的纪律：光只跟主角）。
 * size ≥110 的判定交给 frame_metrics，这里不自我安慰。
 */
export const Node = ({cx, cy, s = 92, icon, text, N, f0, active = false, labelSize = 26, labelDy = null, maxW = 190, opacity = 1}) => {
  const n = N - f0;
  if (n < 0) return null;
  const op = softOp(n, BEAT.SOFT_IN) * opacity;
  if (op <= 0) return null;
  return (
    <div style={{opacity: op}}>
      <div style={{...abs(cx - s / 2, cy - s / 2, s, s), display: "flex", alignItems: "center", justifyContent: "center"}}>
        <Glyph kind={icon} cx={s / 2} cy={s / 2} s={s - 18} active={active} reveal={clamp01(n / BEAT.DRAW_ON)} />
      </div>
      {text ? (
        <CText cx={cx} cy={labelDy === null ? cy + s / 2 + 24 : labelDy} size={labelSize} weight={700} color={active ? WHITE : GREY} maxW={maxW}>
          {text}
        </CText>
      ) : null}
    </div>
  );
};

/**
 * 虚线槽：2px 虚线框 + 左上角编号徽章。focus 是本槽紫度，past 是「已成过去」的程度。
 * 描边灰→紫线性插值，徽章同步。
 */
export const Slot = ({x, y, w, h, i, N, f0, focus = 0, past = 0, text = "", icon = null, iconSize = 76}) => {
  const n = N - f0;
  if (n < 0) return null;
  const dx = 300 * powOutRemain(n, BEAT.LATERAL, 2.5);
  const op = softOp(n, BEAT.SOFT_IN) * (1 - 0.5 * past);
  const stroke = mixHex(GREY, PURPLE_LIGHT, focus);
  const px = x + dx;
  return (
    <div style={{opacity: op}}>
      <div
        style={{
          ...abs(px, y, w, h),
          boxSizing: "border-box",
          border: `2px dashed ${stroke}`,
          borderRadius: 8,
          background: "rgba(0,0,0,0.42)",
          boxShadow: focus > 0 ? `0 0 18px 4px ${Rgba(PURPLE, 0.45 * focus)}` : undefined,
        }}
      />
      {icon ? (
        <div style={{...abs(px + 22, y + (h - iconSize) / 2, iconSize, iconSize)}}>
          <Glyph kind={icon} cx={iconSize / 2} cy={iconSize / 2} s={iconSize - 14} active={focus > 0.5} reveal={clamp01(n / BEAT.DRAW_ON)} />
        </div>
      ) : null}
      {text ? (
        <Label x={px + (icon ? 22 + iconSize + 16 : 24)} y={y + h / 2 - 15} size={27} color={focus > 0.5 ? WHITE : GREY_LIGHT} maxW={w - (icon ? 22 + iconSize + 40 : 48)}>
          {text}
        </Label>
      ) : null}
      <div style={{...abs(px - 16, y - 16, 32, 32), boxSizing: "border-box", borderRadius: 16, background: "#000", border: `2px solid ${stroke}`, opacity: softOp(n - 12, 8)}}>
        <CText cx={16} cy={16} size={21} weight={800} color={mixHex(GREY, WHITE, focus)} dy={-1}>
          {String(i + 1)}
        </CText>
      </div>
    </div>
  );
};

/** 轨道上匀速行进的光点：给静态构图一件「持续到下一拍」的动词动作。 */
export const Track = ({x1, x2, y, N, f0, color = PURPLE_LIGHT}) => {
  const op = softOp(N - f0, BEAT.SOFT_IN);
  if (op <= 0) return null;
  return (
    <g opacity={op}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={GREY_LINE} strokeWidth={2} strokeDasharray="14 10" />
      {[0, 0.5].map((o, j) => {
        const t = ((N - f0) / 66 + o) % 1;
        return <circle key={j} cx={x1 + (x2 - x1) * t} cy={y} r={j === 0 ? 6 : 4.5} fill={j === 0 ? color : WHITE} opacity={0.35 + 0.65 * Math.sin(Math.PI * t)} />;
      })}
    </g>
  );
};

/** 竖向轨道（带行进光点）。ladder / layerstack / causechain 用它当纵向持续动作。 */
export const VTrack = ({x, y1, y2, N, f0, color = PURPLE_LIGHT}) => {
  const op = softOp(N - f0, BEAT.SOFT_IN);
  if (op <= 0) return null;
  return (
    <g opacity={op}>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={GREY_LINE} strokeWidth={2} strokeDasharray="14 10" />
      {[0, 0.5].map((o, j) => {
        const t = ((N - f0) / 74 + o) % 1;
        return <circle key={j} cx={x} cy={y1 + (y2 - y1) * t} r={j === 0 ? 6 : 4.5} fill={j === 0 ? color : WHITE} opacity={0.35 + 0.65 * Math.sin(Math.PI * t)} />;
      })}
    </g>
  );
};

/** 镜内小标题（TechSub 灰字副标）。 */
export const Note = ({cx, cy, children}) => (children ? <TechSub cx={cx} cy={cy}>{children}</TechSub> : null);

// ---------------------------------------------------------------- 拓扑池
//
// 每个 kind 的骨架互不相同。参数全部由镜头 recipe 的 stage 提供（几何 + 文案 + 焦点拍），
// 组件本身不含任何具体选题内容 —— 这样组私有文件里能看出「这一镜摆成什么样」，
// 而不是把坐标埋进一个与内容无关的通用函数里。

/** pipeline3 —— 三个横向阶段 + 阶段间箭头（工序推进）。 */
export function Pipeline3({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const k = focusWalk(marksOf(plan, st), N, plan.focusSlots);
  // 3 个框 + 2 个间隙必须落在 cameraSafe.x89–1191 内：3*bw + 2*gap ≤ 1102。
  // 之前bw=344/gap=96 → 总宽 1224，左框被切出画外，画面密度反而下降。
  const bw = 318;
  const gap = 74;
  const y = 330;
  const x0 = 640 - (bw * items.length + gap * (items.length - 1)) / 2 + bw / 2;
  const arrow = drawOn(N - IN, BEAT.DRAW_ON);
  return (
    <>
      <Svg>
        {items.slice(0, -1).map((it, i) => (
          <LineArrow key={`a${it.id}`} x1={x0 + i * (bw + gap) + bw / 2 + 14} y1={y} x2={x0 + (i + 1) * (bw + gap) - bw / 2 - 14} y2={y} progress={arrow} color={GREY_MID} width={3} head={11} />
        ))}
      </Svg>
      {items.map((it, i) => {
        const cx = x0 + i * (bw + gap);
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: 1 - 0.45 * isPast(i, marksOf(plan, st), N, plan.focusSlots)}}>
                <Box x={cx - bw / 2} y={y - 115} w={bw} h={230} border={k[i] > 0.5 ? PURPLE : GREY} radius={14} glow={k[i] > 0.5} bloom={k[i] <= 0.5} />
                {/*步骤徽章：序号压在左上角，给这一镜一个可读的「走到第几步」。*/}
                <div style={{...abs(cx - bw / 2 + 16, y - 99, 36, 36), boxSizing: "border-box", borderRadius: 19, background: "#000", border: `2px solid ${k[i] > 0.5 ? PURPLE : GREY}`, opacity: softOp(N - it.f0 - 6, 8)}}>
                  <CText cx={18} cy={18} size={21} weight={800} color={k[i] > 0.5 ? WHITE : GREY} dy={-1}>{i + 1}</CText>
                </div>
                {/*框内四带：图标(-72..20) / 标签(24..61) / 副行(62..98) / 进度条(104..112)，互不相压。*/}
                <div style={{...abs(cx - bw / 2 + 48, y - 72, 92, 92), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Glyph kind={it.icon} cx={46} cy={46} s={88} active={k[i] > 0.5} reveal={1} />
                </div>
                <Label x={cx - bw / 2 + 24} y={y + 24} size={32} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={bw - 48}>{it.text}</Label>
                {/*副行：这一格到底做什么。recipe 用 stage.subs 提供；缺省就不画，
                    免得为了凑密度塞占位文字 —— 那是另一种假的丰富。*/}
                {st.subs?.[i] ? (
                  <TechSub cx={cx} cy={y + 80} size={30} hud={false}>{st.subs[i]}</TechSub>
                ) : null}
                {/*格内进度条：随入场推进，给静态版面一件持续动作；底轨常亮，进度段紫色。*/}
                <div style={{...abs(cx - bw / 2 + 24, y + 104, bw - 48, 8), background: GREY, opacity: 0.85}} />
                <div style={{...abs(cx - bw / 2 + 24, y + 104, (bw - 48) * clamp01((N - it.f0) / 26), 8), background: k[i] > 0.5 ? PURPLE_LIGHT : PURPLE, opacity: 0.95}} />
              </div>
            </SoftIn>
            {i < items.length - 1 ? <Track x1={cx + bw / 2 + 10} x2={cx + bw + gap - 10} y={y + 66} N={N} f0={it.f0 + 10} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} /> : null}
          </div>
        );
      })}
    </>
  );
}

/** causechain —— 因 → 机制 → 果，纵向串联（下行视线）。 */
export function CauseChain({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const x = 200;
  const w = 880;
  const top = 200;
  const gap = 128;
  return (
    <>
      <Svg>
        <VTrack x={x - 44} y1={top} y2={top + (items.length - 1) * gap} N={N} f0={IN} />
        {items.map((it, i) => (
          <LineArrow key={`d${it.id}`} x1={x - 44} y1={top + i * gap + 38} x2={x - 44} y2={top + (i + 1) * gap - 38} progress={drawOn(N - it.f0, 12)} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} width={2} head={9} />
        ))}
      </Svg>
      {items.map((it, i) => {
        const y = top + i * gap;
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: 1 - 0.45 * isPast(i, marks, N, plan.focusSlots)}}>
                <Box x={x} y={y} w={w} h={76} border={k[i] > 0.5 ? PURPLE : GREY} radius={10} bloom={k[i] <= 0.5} />
                <div style={{...abs(x + 20, y + 8, 60, 60), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Glyph kind={it.icon} cx={30} cy={30} s={56} active={k[i] > 0.5} reveal={1} />
                </div>
                <Label x={x + 104} y={y + 38 - 16} size={30} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={w - 140}>{it.text}</Label>
              </div>
            </SoftIn>
          </div>
        );
      })}
    </>
  );
}

/** citeside —— 左侧主张 + 右侧来源卡扇出（证据在旁，不是并列）。 */
export function CiteSide({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  // 焦点也走这一镜：主张占槽 0，来源卡依次占 1..n。铺满整镜的拍表让「主张 ↔ 出处」一路交接，
  // 主体框（430×150 / 400×78）整块换色 + dim 是这一镜的大面积步进变化来源。
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const main = items[0];
  const rest = items.slice(1);
  const cardW = 400;
  const cardH = 78;
  const top = 220;
  const gap = 108;
  const mainHot = k[0] > 0.5;
  return (
    <>
      {main ? (
        <SoftIn N={N} f0={main.f0}>
          <div style={{position: "absolute", inset: 0, opacity: 1 - 0.35 * isPast(0, marks, N, plan.focusSlots)}}>
            <Box x={110} y={280} w={430} h={150} border={mainHot ? PURPLE : GREY} radius={14} glow={mainHot} bloom={!mainHot} />
            <div style={{...abs(134, 300, 92, 92), display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Glyph kind={st.main_icon || "shield"} cx={46} cy={46} s={86} active={mainHot} reveal={1} />
            </div>
            <Label x={246} y={344} size={30} color={mainHot ? WHITE : GREY_LIGHT} maxW={270}>{main.text}</Label>
            <Track x1={552} y1={356} x2={686} y2={356} N={N} f0={main.f0 + 12} color={mainHot ? PURPLE_LIGHT : GREY_LINE} />
          </div>
        </SoftIn>
      ) : null}
      {rest.map((it, i) => {
        const y = top + i * gap;
        const idx = i + 1;
        const hot = k[idx] > 0.5;
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: softOp(N - it.f0, BEAT.SOFT_IN) * (1 - 0.35 * isPast(idx, marks, N, plan.focusSlots))}}>
                <Box x={700} y={y} w={cardW} h={cardH} border={hot ? PURPLE : GREY} radius={10} glow={hot} bloom={!hot} />
                <div style={{...abs(716, y + 15, 48, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Glyph kind={st.cite_icons?.[i] || it.icon || "doc"} cx={24} cy={24} s={44} active={hot} reveal={1} />
                </div>
                <Label x={782} y={y + 39 - 15} size={27} color={hot ? WHITE : GREY_LIGHT} maxW={cardW - 104}>{it.text}</Label>
              </div>
            </SoftIn>
            <ChainArrows points={[[545, 356], [640, y + cardH / 2], [700, y + cardH / 2]]} N={N} f0={it.f0 - 6} per={7} color={hot ? PURPLE_LIGHT : GREY_MID} width={2} head={8} />
          </div>
        );
      })}
    </>
  );
}

/** terminal —— 终端窗口 + 等宽行，部分行被点亮（代码/报文本体）。 */
export function Terminal({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const x = 150;
  const y = 200;
  const w = 980;
  const rowH = 52;
  const h = 74 + items.length * rowH;
  const typed = Math.floor(clamp01((N - IN) / (items.length * 14)) * items.length * 34);
  return (
    <>
      <SoftIn N={N} f0={IN}>
        <div style={{position: "absolute", inset: 0}}>
          <Box x={x} y={y} w={w} h={h} border={GREY} radius={12} />
          <div style={{...abs(x + 22, y + 26, 96, 14), display: "flex", gap: 12}}>
            {[0, 1, 2].map((j) => (
              <div key={j} style={{width: 14, height: 14, borderRadius: 7, background: j === 0 ? PURPLE_LIGHT : GREY_MID}} />
            ))}
          </div>
          <MonoText x={x + 136} y={y + 24} size={24} color={GREY_MID}>{st.title}</MonoText>
        </div>
      </SoftIn>
      {items.map((it, i) => {
        const ry = y + 74 + i * rowH;
        const n = N - it.f0;
        if (n < 0) return null;
        const shown = Math.max(0, Math.min(String(it.text).length, typed - i * 34));
        return (
          <div key={it.id}>
            <div style={{...abs(x + 30, ry, w - 60, rowH - 6), display: "flex", alignItems: "center", opacity: softOp(n, BEAT.SOFT_IN) * (1 - 0.4 * isPast(i, marks, N, plan.focusSlots))}}>
              <div style={{width: 16, height: 16, flex: "0 0 16px", borderRadius: 8, background: k[i] > 0.5 ? PURPLE_LIGHT : GREY_MID, marginRight: 20}} />
              <MonoText x={66} y={9} size={25} color={k[i] > 0.5 ? WHITE : GREY_LIGHT}>{String(it.text).slice(0, shown)}</MonoText>
            </div>
            {k[i] > 0.5 ? <div style={{...abs(x + 30, ry, (w - 60) * clamp01((N - it.f0) / 20), rowH - 6), borderLeft: `2px solid ${PURPLE}`, background: "rgba(102,48,248,0.10)"}} /> : null}
          </div>
        );
      })}
    </>
  );
}

/** orbit —— 中心节点 + 椭圆轨道上的若干节点 + 一条缓慢转动的扫描线。 */
export function Orbit({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items.filter((it) => it.kind !== "flow");
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const cx = st.cx ?? 640;
  const cy = st.cy ?? 380;
  const rx = st.rx ?? 400;
  const ry = st.ry ?? 178;
  const size = Number(recipe.hero_size) || 210;
  const spin = (N - IN) * 1.6;
  // 连线一律从主角光晕边缘起画：穿过主角的线会透过半透明 HeroGlow 露出来。
  const r0 = size / 2 + 12;
  const spinA = (spin * Math.PI) / 180;
  const spinX = Math.cos(spinA) * rx;
  const spinY = Math.sin(spinA) * ry;
  const spinLen = Math.hypot(spinX, spinY);
  return (
    <>
      <Svg>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={GREY_LINE} strokeWidth={2} strokeDasharray="18 12" opacity={softOp(N - IN, BEAT.FADE_IN)} />
        <LineArrow x1={cx + (spinX / spinLen) * r0} y1={cy + (spinY / spinLen) * r0} x2={cx + spinX} y2={cy + spinY} progress={1} color={Rgba(PURPLE_LIGHT, 0.5)} width={2} head={0} />
        {items.map((it, i) => {
          const a = (Math.PI * 2 * i) / Math.max(1, items.length);
          const dx = Math.cos(a) * rx;
          const dy = Math.sin(a) * ry;
          const len = Math.hypot(dx, dy);
          const r1 = Math.max(r0 + 2, len - 50);
          const ux = dx / len;
          const uy = dy / len;
          return <LineArrow key={`l${it.id}`} x1={cx + ux * r0} y1={cy + uy * r0} x2={cx + ux * r1} y2={cy + uy * r1} progress={drawOn(N - IN, BEAT.DRAW_ON)} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} width={k[i] > 0.5 ? 2.5 : 1.8} head={0} opacity={0.3 + 0.5 * k[i]} />;
        })}
      </Svg>
      <Core cx={cx} cy={cy} size={size} N={N} f0={IN} icon={st.icon} label={st.label} />
      {items.map((it, i) => {
        const a = (Math.PI * 2 * i) / Math.max(1, items.length);
        return <Node key={it.id} cx={Math.round(cx + Math.cos(a) * rx)} cy={Math.round(cy + Math.sin(a) * ry)} icon={it.icon} text={it.text} N={N} f0={it.f0} active={k[i] > 0.5} />;
      })}
    </>
  );
}

/** splitrows —— 左右两列各一叠行，中间一条竖分隔（清单对清单）。 */
export function SplitRows({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);
  const colW = 480;
  const lx = 100;
  const rx = 700;
  const rowH = 84;
  // ⚠ 列头（Note=TechSub 26px，cy = top−44 → 字形顶 ≈ top−59）必须躲开流程轨带：
  //   push 满幅 s≈1.16 时顶部内容上抬 ≈ (360−y)·0.16，rest 字形顶 ≤192 必撞胶囊
  //   （成片 SC42 实测「客户端代价」被轨压住）。字形顶在满推下 ≥176 → top ≥ 261。
  //   单行时整体下移到 300 让构图在内容区里立得住；两行 265（末行框底 419，contentBottom 620 之上）。
  const rows = Math.max(left.length, right.length);
  const top = rows === 1 ? 300 : 265;
  const seam = drawOn(N - IN, BEAT.DRAW_ON);
  return (
    <>
      <Svg>
        <line x1={640} y1={top - 22} x2={640} y2={top + Math.max(left.length, right.length) * rowH} stroke={GREY_LINE} strokeWidth={2} opacity={seam} />
      </Svg>
      <Note cx={lx + colW / 2} cy={top - 44}>{st.left_label}</Note>
      <Note cx={rx + colW / 2} cy={top - 44}>{st.right_label}</Note>
      {[
        {list: left, x: lx, off: 0},
        {list: right, x: rx, off: 1},
      ].map(({list, x, off}) =>
        list.map((it, i) => {
          const idx = i * 2 + off;
          // ⚠ 以前 focus 只由 winner 列恒定决定（off === winner ? 1 : 0），不消费 focusWalk 的 k[idx]：
          //   焦点拍表铺满整镜后，紫色从未在行间交接，isPast 的 0.4 级 dim 又只有 ~0.2 的灰度差
          //   （低于 still_thr 0.35）→ 那一镜连着 4.5 s 零变化，motion_check 判「真静」。
          //   照 CompareTable 的写法：winner 列是 base 底色，每一拍再把当前行整块翻成紫 + 亮灯。
          const base = off === (st.winner ?? 1);
          const hot = k[idx] > 0.5;
          return (
            <div key={it.id}>
              <SoftIn N={N} f0={it.f0}>
                <div style={{position: "absolute", inset: 0, opacity: 1 - 0.4 * isPast(idx, marks, N, plan.focusSlots)}}>
                  <Box x={x} y={top + i * rowH} w={colW} h={rowH - 14} border={hot ? PURPLE_LIGHT : base ? PURPLE : GREY} radius={10} glow={hot} bloom={!base && !hot} />
                  <div style={{...abs(x + 18, top + i * rowH + 12, 48, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <Glyph kind={it.icon} cx={24} cy={24} s={44} active={base || hot} reveal={1} />
                  </div>
                  <Label x={x + 86} y={top + i * rowH + 35 - 15} size={28} color={base || hot ? WHITE : GREY_LIGHT} maxW={colW - 110}>{it.text}</Label>
                </div>
              </SoftIn>
            </div>
          );
        }),
      )}
    </>
  );
}

/** ballot —— 若干候选并排成列，选中项上方落一枚✓（表决/优选）。 */
export function Ballot({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const pick = st.pick ?? items.length - 1;
  const cw = 300;
  const gap = 46;
  const x0 = 640 - (cw * items.length + gap * (items.length - 1)) / 2 + cw / 2;
  const y = 300;
  const h = 190;
  return (
    <>
      {items.map((it, i) => {
        const cx = x0 + i * (cw + gap);
        const chosen = i === pick;
        const op = 1 - 0.4 * isPast(i, marks, N, plan.focusSlots);
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: op}}>
                {chosen ? (
                  <div style={{...abs(cx - 26, y - 108, 52, 52), opacity: drawOn(N - it.f0 - 10, 14)}}>
                    <Check cx={26} cy={26} size={44} color={PURPLE_LIGHT} progress={drawOn(N - it.f0 - 10, 14)} />
                  </div>
                ) : null}
                <Box x={cx - cw / 2} y={y - 66} w={cw} h={h} border={chosen ? PURPLE : GREY} radius={14} glow={chosen} bloom={!chosen} />
                <div style={{...abs(cx - cw / 2 + 24, y - 44, 76, 76), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Glyph kind={it.icon} cx={38} cy={38} s={70} active={chosen} reveal={1} />
                </div>
                <Label x={cx - cw / 2 + 116} y={y - 4} size={29} color={chosen ? WHITE : GREY_LIGHT} maxW={cw - 142}>{it.text}</Label>
                <div style={{...abs(cx - cw / 2, y + h - 26, cw * clamp01((N - it.f0) / 24), 6), background: chosen ? PURPLE : GREY_LINE, opacity: 0.85}} />
              </div>
            </SoftIn>
            {i < items.length - 1 ? <Track x1={cx + cw / 2 + 6} x2={cx + cw + gap - 6} y={y + h - 23} N={N} f0={it.f0 + 10} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} /> : null}
          </div>
        );
      })}
    </>
  );
}

/** layerstack —— 三四块横板层叠，x 依次错位（层次/封装）。 */
export function LayerStack({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const w = 720;
  const h = 68;
  const gap = 16;
  const top = 216;
  const x0 = 200;
  const step = st.indent ?? 92;
  return (
    <>
      <Svg>
        <VTrack x={x0 - 52} y1={top + 30} y2={top + (items.length - 1) * (h + gap) + h - 30} N={N} f0={IN} />
      </Svg>
      {items.map((it, i) => {
        const x = x0 + i * step;
        const y = top + i * (h + gap);
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: 1 - 0.4 * isPast(i, marks, N, plan.focusSlots)}}>
                <Box x={x} y={y} w={w} h={h} border={k[i] > 0.5 ? PURPLE : GREY} radius={10} glow={k[i] > 0.5} bloom={k[i] <= 0.5} />
                <div style={{...abs(x + 20, y + 10, 48, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Glyph kind={it.icon} cx={24} cy={24} s={44} active={k[i] > 0.5} reveal={1} />
                </div>
                <Label x={x + 88} y={y + h / 2 - 16} size={29} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={w - 116}>{it.text}</Label>
              </div>
            </SoftIn>
          </div>
        );
      })}
      {/* 行高×行数收得很紧（4 行末行底 = 216+3*84+68 = 536），距 contentBottom 620 仍有余量 */}
    </>
  );
}

/** comparetable —— 带表头的双列对照表，胜出列整列高亮（逐项对比）。 */
export function CompareTable({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const winner = st.winner ?? 1;
  const cw = 300;
  const gap = 40;
  const x0 = 640 - (cw * 2 + gap) / 2 + cw / 2;
  const top = 210;
  const rowH = 74;
  const rows = Math.ceil(items.length / 2);
  return (
    <>
      {[0, 1].map((side) => {
        const cx = x0 + side * (cw + gap);
        return (
          <React.Fragment key={side}>
            <div style={{...abs(cx - cw / 2, top, cw, 56), display: "flex", alignItems: "center", justifyContent: "center", opacity: softOp(N - IN, BEAT.SOFT_IN)}}>
              {/*⚠ Box/CText 用**相对 wrapper 的坐标**，不是全画布坐标。
               wrapper 已经在 (cx-cw/2, top)，内部再写一遍同样的绝对值等于偏移两次：
               左边那列的框被推到 640..940（看着像右列），右边那列的框跑到 1320..1620 直接出画。
               真渲染才看得出「表头只剩一个、另一列没有框」——静态门完全测不到。*/}
              <Box x={0} y={0} w={cw} h={56} border={side === winner ? PURPLE : GREY} radius={10} glow={side === winner} bloom={side !== winner} />
              <CText cx={cw / 2} cy={28} size={28} weight={800} color={side === winner ? WHITE : GREY_LIGHT}>{side === 0 ? st.left_label : st.right_label}</CText>
            </div>
            {Array.from({length: rows}, (_, r) => items[r * 2 + side]).map((it, r) => {
              if (!it) return null;
              // 逐行焦点：item 的下标就是槽号（行内 = r*2+side）。整行框换色 + dim 是该镜的大面积步进变化。
              const idx = r * 2 + side;
              const base = side === winner;
              const hot = k[idx] > 0.5;
              return (
                <div key={it.id}>
                  <SoftIn N={N} f0={it.f0}>
                    <div style={{...abs(cx - cw / 2, top + 66 + r * rowH, cw, rowH - 12), display: "flex", alignItems: "center", opacity: softOp(N - it.f0, BEAT.SOFT_IN) * (base ? 1 : 0.82) * (1 - 0.3 * isPast(idx, marks, N, plan.focusSlots))}}>
                      <Box x={0} y={0} w={cw} h={rowH - 12} border={hot ? PURPLE_LIGHT : base ? PURPLE : GREY} radius={8} glow={hot} bloom={!base && !hot} />
                      <div style={{width: 44, height: 44, flex: "0 0 44px", marginLeft: 16}}>
                        <Glyph kind={it.icon} cx={22} cy={22} s={40} active={base || hot} reveal={1} />
                      </div>
                      {/* 图标盒到 60，文字从 62 起；maxW 放宽到 cw-76，Label 内置 fitSize 自动缩号 */}
                      <Label x={62} y={16} size={27} color={base || hot ? WHITE : GREY_LIGHT} maxW={cw - 76}>{it.text}</Label>
                    </div>
                  </SoftIn>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

/** reshape —— 一个形被箭头压成另一个形（转换的「形变」而非并置）。 */
export function Reshape({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const cy = 342;
  const lx = 336;
  const rx = 824;
  const s = 208;
  const press = clamp01((N - IN - 26) / 30);
  const shrink = 1 - 0.3 * press;
  const grow = 0.55 + 0.45 * press;
  // 形变在 IN+26…IN+56 就演完了，之后只剩呼吸 —— 焦点拍表把「原来的形 ↔ 变成的形 ↔ 结果」铺满整镜，
  // 两个 208×208 的大形整块换色 / dim 就是这一镜后半段的大面积步进变化。
  const fromHot = k[0] > 0.5;
  const toHot = k[1] > 0.5;
  // ⚠ 整段只用**相对各自 wrapper 的坐标**。
  //   这里原来把 wrapper 定位到 (lx-s/2, cy-s/2)，里面的 Box / Glyph 又各写一遍同样的绝对值，
  //   等于偏移两次：两个形被推到画外、图元与文字散在别处，画面上只剩一根箭头。
  //   「wrapper 已定位，内部就用相对坐标」这条现在由 scripts/verify-relative-coords.mjs 静态守住。
  return (
    <>
      <div style={{...abs(lx - s / 2, cy - s / 2, s, s), transform: `scale(${shrink.toFixed(3)})`, transformOrigin: `${lx}px ${cy}px`, opacity: (1 - 0.35 * press) * (1 - 0.4 * isPast(0, marks, N, plan.focusSlots))}}>
        <Box x={0} y={0} w={s} h={s} border={fromHot ? PURPLE_LIGHT : GREY} radius={12} glow={fromHot} />
        <Glyph kind={st.from_icon || items[0]?.icon || "doc"} cx={s / 2} cy={s / 2 - 16} s={112} active={fromHot} reveal={clamp01((N - IN) / BEAT.DRAW_ON)} />
        <div style={{position: 'absolute', left: 22, top: s - 30, width: s - 44, height: 4, background: fromHot ? PURPLE_LIGHT : GREY, opacity: 0.55}} />
        <div style={{position: 'absolute', left: 22, top: s + 12, width: s}}>
          <CText cx={s / 2} cy={20} size={32} weight={800} color={fromHot ? WHITE : GREY_LIGHT} maxW={s}>{items[0]?.text}</CText>
        </div>
        {/*副标放形下（标签再下一行）：形是圆角矩形/圆，副标放形内底部必然压到描边*/}
        {st.from_sub ? (
          <div style={{position: 'absolute', left: 0, top: s + 56, width: s}}>
            <CText cx={s / 2} cy={13} size={24} weight={600} color={GREY} maxW={s + 40}>{st.from_sub}</CText>
          </div>
        ) : null}
      </div>
      <Svg>
        <LineArrow x1={lx + s / 2 + 30} y1={cy} x2={rx - s / 2 - 30} y2={cy} progress={drawOn(N - IN - 6, BEAT.DRAW_ON)} color={PURPLE_LIGHT} width={3} head={13} glow />
      </Svg>
      <Track x1={lx + s / 2 + 30} x2={rx - s / 2 - 30} y={cy + 62} N={N} f0={IN + 10} />
      <div style={{...abs(rx - s / 2, cy - s / 2, s, s), transform: `scale(${(grow * (1 + 0.05 * k[1])).toFixed(3)})`, transformOrigin: `${rx}px ${cy}px`, opacity: 1 - 0.35 * isPast(1, marks, N, plan.focusSlots)}}>
        <Box x={0} y={0} w={s} h={s} border={toHot ? PURPLE_LIGHT : PURPLE} radius={s / 2} glow />
        <Glyph kind={st.to_icon || items[1]?.icon || "lock"} cx={s / 2} cy={s / 2 - 16} s={112} active reveal={clamp01((N - IN - 20) / BEAT.DRAW_ON)} />
        <div style={{position: 'absolute', left: 30, top: s - 30, width: s - 60, height: 4, background: PURPLE, opacity: 0.9}} />
        <div style={{position: 'absolute', left: 0, top: s + 12, width: s}}>
          <CText cx={s / 2} cy={20} size={32} weight={800} color={WHITE} maxW={s}>{items[1]?.text}</CText>
        </div>
        {st.to_sub ? (
          <div style={{position: 'absolute', left: 0, top: s + 56, width: s}}>
            <CText cx={s / 2} cy={13} size={24} weight={600} color={GREY_LIGHT} maxW={s + 40}>{st.to_sub}</CText>
          </div>
        ) : null}
      </div>
      {items[2] ? (
        <SoftIn N={N} f0={items[2].f0}>
          <div style={{...abs(560, cy - 196, 160, 64), opacity: softOp(N - items[2].f0, BEAT.SOFT_IN)}}>
            <GlowBlob cx={80} cy={32} r={62} N={N} k={k[2] > 0.4 ? 0.9 : 0.3} />
            <CText cx={80} cy={32} size={30} weight={800} color={k[2] > 0.4 ? WHITE : GREY_LIGHT} maxW={300}>{items[2].text}</CText>
          </div>
        </SoftIn>
      ) : null}
    </>
  );
}

/** ladder —— 竖向梯子：两侧立柱 + 若干横档，当前档整档点亮（分级/档位）。 */
export function Ladder({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N, plan.focusSlots);
  const lx = 300;
  const rx = 980;
  const top = 208;
  const gap = 106;
  const draw = clamp01((N - IN) / (BEAT.DRAW_ON + items.length * 8));
  return (
    <>
      <Svg>
        <line x1={lx} y1={top - 18} x2={lx} y2={top + (items.length - 1) * gap + 44} stroke={GREY_MID} strokeWidth={4} opacity={draw} />
        <line x1={rx} y1={top - 18} x2={rx} y2={top + (items.length - 1) * gap + 44} stroke={GREY_MID} strokeWidth={4} opacity={draw} />
        {items.map((it, i) => (
          <LineArrow key={`r${it.id}`} x1={lx} y1={top + i * gap} x2={rx} y2={top + i * gap} progress={drawOn(N - it.f0, 14)} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} width={k[i] > 0.5 ? 3 : 2} head={0} glow={k[i] > 0.5} />
        ))}
      </Svg>
      {items.map((it, i) => (
        <div key={it.id}>
          <SoftIn N={N} f0={it.f0}>
            <div style={{...abs(lx + 26, top + i * gap - 28, rx - lx - 52, 56), display: "flex", alignItems: "center", opacity: 1 - 0.4 * isPast(i, marks, N, plan.focusSlots)}}>
              <div style={{width: 46, height: 46, flex: "0 0 46px"}}>
                <Glyph kind={it.icon} cx={23} cy={23} s={42} active={k[i] > 0.5} reveal={1} />
              </div>
              <Label x={68} y={14} size={29} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={rx - lx - 160}>{it.text}</Label>
            </div>
          </SoftIn>
        </div>
      ))}
    </>
  );
}