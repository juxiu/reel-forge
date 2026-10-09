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
 * 形态对齐参照片 examples/rag/shots_src/G*/ 的做法（一组镜头共用一个舞台，状态是帧号的纯函数），
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

/** 内容区（16:9）。所有构图必须落在这一带：y<175 有流程轨，y>620 是字幕带。 */
export const AREA = {l: 60, r: 1220, t: 175, b: 620};

/**
 * 入场帧的唯一口径。
 *
 * ⚠ 舞台不自己另算入场帧：`plan.hero.f0` 由 buildPlan 从**首块字幕**推出（锚在 −6…+3 窗口内），
 *   所以 authored 镜头和语义镜头用的是同一套节拍，QC 判的窗口对两者都成立。
 *   recipe 的 focus 是**相对入场帧的偏移**而不是绝对帧 —— 换片子、换字幕块时
 *   整组的焦点交接会自动跟着首句走，不会因为写死绝对帧而整组错拍。
 */
export const entryOf = (plan, st) => Number(plan?.hero?.f0) || Number(st?.in) || 1;
export const marksOf = (plan, st) => (st?.focus || []).map((o) => entryOf(plan, st) + Number(o));

/**
 * 紫色焦点在若干槽之间游走：marks[i] 是第 i 槽成为焦点的帧。
 * 11 帧爬坡上升、下一槽激活后 11 帧回落 —— 任一帧至多一个槽满紫（交接瞬间交叠在 0.5 附近）。
 * 纪律「紫只给当前重点」就靠这一处实现，各拓扑不再各写一套。
 */
export function focusWalk(marks, N, rise = 11) {
  const k = marks.map((m, i) => {
    const up = clamp01((N - m) / rise);
    const next = marks[i + 1];
    const down = next === undefined ? 0 : clamp01((N - next) / rise);
    return up * (1 - down);
  });
  return k.some((v) => v > 0) ? k : k.map(() => 0);
}

/** 槽 i 是否已成为「过去」（注意力交给下一个时降到 0.5，而不是清场——这是承接做法）。 */
export const isPast = (i, marks, N) => (marks[i + 1] === undefined ? 0 : clamp01((N - marks[i + 1]) / 11));

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
          <Icon kind={icon} cx={half} cy={half} s={size - iconScale} active reveal={1} glow={false} />
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
          <TechSub cx={cx} cy={cy + half + 66}>{label}</TechSub>
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
        <Icon kind={icon} cx={s / 2} cy={s / 2} s={s - 18} active={active} reveal={clamp01(n / BEAT.DRAW_ON)} />
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
          <Icon kind={icon} cx={iconSize / 2} cy={iconSize / 2} s={iconSize - 14} active={focus > 0.5} reveal={clamp01(n / BEAT.DRAW_ON)} />
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
  const k = focusWalk(marksOf(plan, st), N);
  const bw = 320;
  const gap = 100;
  const y = 300;
  const x0 = 640 - (bw * items.length + gap * (items.length - 1)) / 2 + bw / 2;
  const arrow = drawOn(N - IN, BEAT.DRAW_ON);
  return (
    <>
      <Svg>
        {items.slice(0, -1).map((it, i) => (
          <LineArrow key={`a${it.id}`} x1={x0 + i * (bw + gap) + bw / 2 + 14} y1={y} x2={x0 + (i + 1) * (bw + gap) - bw / 2 - 14} y2={y} progress={arrow} color={GREY_MID} width={2.5} head={11} />
        ))}
      </Svg>
      {items.map((it, i) => {
        const cx = x0 + i * (bw + gap);
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: 1 - 0.45 * isPast(i, marksOf(plan, st), N)}}>
                <Box x={cx - bw / 2} y={y - 78} w={bw} h={156} border={k[i] > 0.5 ? PURPLE : GREY_LINE} radius={14} glow={k[i] > 0.5} bloom={k[i] <= 0.5} />
                <div style={{...abs(cx - bw / 2 + 26, y - 44, 88, 88), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Icon kind={it.icon} cx={44} cy={44} s={80} active={k[i] > 0.5} reveal={1} />
                </div>
                <Label x={cx - bw / 2 + 132} y={y - 17} size={30} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={bw - 158}>{it.text}</Label>
              </div>
            </SoftIn>
            {i < items.length - 1 ? <Track x1={cx + bw / 2 + 10} x2={cx + bw + gap - 10} y={y + 52} N={N} f0={it.f0 + 10} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} /> : null}
          </div>
        );
      })}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}

/** causechain —— 因 → 机制 → 果，纵向串联（下行视线）。 */
export function CauseChain({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
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
              <div style={{position: "absolute", inset: 0, opacity: 1 - 0.45 * isPast(i, marks, N)}}>
                <Box x={x} y={y} w={w} h={76} border={k[i] > 0.5 ? PURPLE : GREY_LINE} radius={10} bloom={k[i] <= 0.5} />
                <div style={{...abs(x + 20, y + 8, 60, 60), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Icon kind={it.icon} cx={30} cy={30} s={56} active={k[i] > 0.5} reveal={1} />
                </div>
                <Label x={x + 104} y={y + 38 - 16} size={30} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={w - 140}>{it.text}</Label>
              </div>
            </SoftIn>
          </div>
        );
      })}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}

/** citeside —— 左侧主张 + 右侧来源卡扇出（证据在旁，不是并列）。 */
export function CiteSide({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const main = items[0];
  const rest = items.slice(1);
  const cardW = 400;
  const cardH = 78;
  const top = 220;
  const gap = 108;
  return (
    <>
      {main ? (
        <SoftIn N={N} f0={main.f0}>
          <div style={{position: "absolute", inset: 0}}>
            <Box x={110} y={280} w={430} h={150} border={PURPLE} radius={14} glow />
            <div style={{...abs(134, 300, 92, 92), display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Icon kind={st.main_icon || "shield"} cx={46} cy={46} s={86} active reveal={1} />
            </div>
            <Label x={246} y={344} size={30} color={WHITE} maxW={270}>{main.text}</Label>
            <Track x1={552} y1={356} x2={686} y2={356} N={N} f0={main.f0 + 12} />
          </div>
        </SoftIn>
      ) : null}
      {rest.map((it, i) => {
        const y = top + i * gap;
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: softOp(N - it.f0, BEAT.SOFT_IN)}}>
                <Box x={700} y={y} w={cardW} h={cardH} border={GREY_LINE} radius={10} />
                <div style={{...abs(716, y + 15, 48, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Icon kind={st.cite_icons?.[i] || it.icon || "doc"} cx={24} cy={24} s={44} reveal={1} />
                </div>
                <Label x={782} y={y + 39 - 15} size={27} color={GREY_LIGHT} maxW={cardW - 104}>{it.text}</Label>
              </div>
            </SoftIn>
            <ChainArrows points={[[545, 356], [640, y + cardH / 2], [700, y + cardH / 2]]} N={N} f0={it.f0 - 6} per={7} color={GREY_MID} width={2} head={8} />
          </div>
        );
      })}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}

/** terminal —— 终端窗口 + 等宽行，部分行被点亮（代码/报文本体）。 */
export function Terminal({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
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
          <Box x={x} y={y} w={w} h={h} border={GREY_LINE} radius={12} />
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
            <div style={{...abs(x + 30, ry, w - 60, rowH - 6), display: "flex", alignItems: "center", opacity: softOp(n, BEAT.SOFT_IN) * (1 - 0.4 * isPast(i, marks, N))}}>
              <div style={{width: 16, height: 16, flex: "0 0 16px", borderRadius: 8, background: k[i] > 0.5 ? PURPLE_LIGHT : GREY_MID, marginRight: 20}} />
              <MonoText x={66} y={9} size={25} color={k[i] > 0.5 ? WHITE : GREY_LIGHT}>{String(it.text).slice(0, shown)}</MonoText>
            </div>
            {k[i] > 0.5 ? <div style={{...abs(x + 30, ry, (w - 60) * clamp01((N - it.f0) / 20), rowH - 6), borderLeft: `2px solid ${PURPLE}`, background: "rgba(102,48,248,0.10)"}} /> : null}
          </div>
        );
      })}
      <Note cx={640} cy={Math.min(AREA.b - 4, y + h + 26)}>{st.caption}</Note>
    </>
  );
}

/** orbit —— 中心节点 + 椭圆轨道上的若干节点 + 一条缓慢转动的扫描线。 */
export function Orbit({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items.filter((it) => it.kind !== "flow");
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const cx = st.cx ?? 640;
  const cy = st.cy ?? 380;
  const rx = st.rx ?? 400;
  const ry = st.ry ?? 178;
  const size = Number(recipe.hero_size) || 210;
  const spin = (N - IN) * 1.6;
  return (
    <>
      <Svg>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={GREY_LINE} strokeWidth={2} strokeDasharray="18 12" opacity={softOp(N - IN, BEAT.FADE_IN)} />
        <LineArrow x1={cx} y1={cy} x2={cx + Math.cos((spin * Math.PI) / 180) * rx} y2={cy + Math.sin((spin * Math.PI) / 180) * ry} progress={1} color={Rgba(PURPLE_LIGHT, 0.5)} width={2} head={0} />
        {items.map((it, i) => {
          const a = (Math.PI * 2 * i) / Math.max(1, items.length) - Math.PI / 2;
          return <LineArrow key={`l${it.id}`} x1={cx} y1={cy} x2={cx + Math.cos(a) * rx} y2={cy + Math.sin(a) * ry} progress={drawOn(N - IN, BEAT.DRAW_ON)} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} width={k[i] > 0.5 ? 2.5 : 1.8} head={0} opacity={0.3 + 0.5 * k[i]} />;
        })}
      </Svg>
      <Core cx={cx} cy={cy} size={size} N={N} f0={IN} icon={st.icon} label={st.label} />
      {items.map((it, i) => {
        const a = (Math.PI * 2 * i) / Math.max(1, items.length) - Math.PI / 2;
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
  const k = focusWalk(marks, N);
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);
  const colW = 480;
  const lx = 100;
  const rx = 700;
  const rowH = 84;
  const top = 226;
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
          const focus = off === (st.winner ?? 1) ? 1 : 0;
          return (
            <div key={it.id}>
              <SoftIn N={N} f0={it.f0}>
                <div style={{position: "absolute", inset: 0, opacity: 1 - 0.4 * isPast(idx, marks, N)}}>
                  <Box x={x} y={top + i * rowH} w={colW} h={rowH - 14} border={focus ? PURPLE : GREY_LINE} radius={10} glow={focus} bloom={!focus} />
                  <div style={{...abs(x + 18, top + i * rowH + 12, 48, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <Icon kind={it.icon} cx={24} cy={24} s={44} active={focus} reveal={1} />
                  </div>
                  <Label x={x + 86} y={top + i * rowH + 35 - 15} size={28} color={focus ? WHITE : GREY_LIGHT} maxW={colW - 110}>{it.text}</Label>
                </div>
              </SoftIn>
            </div>
          );
        }),
      )}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}

/** ballot —— 若干候选并排成列，选中项上方落一枚✓（表决/优选）。 */
export function Ballot({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
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
        const op = 1 - 0.4 * isPast(i, marks, N);
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{position: "absolute", inset: 0, opacity: op}}>
                {chosen ? (
                  <div style={{...abs(cx - 26, y - 108, 52, 52), opacity: drawOn(N - it.f0 - 10, 14)}}>
                    <Check cx={26} cy={26} size={44} color={PURPLE_LIGHT} progress={drawOn(N - it.f0 - 10, 14)} />
                  </div>
                ) : null}
                <Box x={cx - cw / 2} y={y - 66} w={cw} h={h} border={chosen ? PURPLE : GREY_LINE} radius={14} glow={chosen} bloom={!chosen} />
                <div style={{...abs(cx - cw / 2 + 24, y - 44, 76, 76), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Icon kind={it.icon} cx={38} cy={38} s={70} active={chosen} reveal={1} />
                </div>
                <Label x={cx - cw / 2 + 116} y={y - 4} size={29} color={chosen ? WHITE : GREY_LIGHT} maxW={cw - 142}>{it.text}</Label>
                <div style={{...abs(cx - cw / 2, y + h - 26, cw * clamp01((N - it.f0) / 24), 6), background: chosen ? PURPLE : GREY_LINE, opacity: 0.85}} />
              </div>
            </SoftIn>
            {i < items.length - 1 ? <Track x1={cx + cw / 2 + 6} x2={cx + cw + gap - 6} y={y + h - 23} N={N} f0={it.f0 + 10} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} /> : null}
          </div>
        );
      })}
      <Note cx={640} cy={y + h + 40}>{st.caption}</Note>
    </>
  );
}

/** layerstack —— 三四块横板层叠，x 依次错位（层次/封装）。 */
export function LayerStack({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const w = 720;
  const h = 74;
  const gap = 22;
  const top = 224;
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
              <div style={{position: "absolute", inset: 0, opacity: 1 - 0.4 * isPast(i, marks, N)}}>
                <Box x={x} y={y} w={w} h={h} border={k[i] > 0.5 ? PURPLE : GREY_LINE} radius={10} glow={k[i] > 0.5} bloom={k[i] <= 0.5} />
                <div style={{...abs(x + 20, y + 13, 48, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Icon kind={it.icon} cx={24} cy={24} s={44} active={k[i] > 0.5} reveal={1} />
                </div>
                <Label x={x + 88} y={y + h / 2 - 16} size={29} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={w - 116}>{it.text}</Label>
              </div>
            </SoftIn>
          </div>
        );
      })}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}

/** comparetable —— 带表头的双列对照表，胜出列整列高亮（逐项对比）。 */
export function CompareTable({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
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
              <Box x={cx - cw / 2} y={0} w={cw} h={56} border={side === winner ? PURPLE : GREY_LINE} radius={10} glow={side === winner} bloom={side !== winner} />
              <CText cx={cx} cy={28} size={28} weight={800} color={side === winner ? WHITE : GREY_LIGHT}>{side === 0 ? st.left_label : st.right_label}</CText>
            </div>
            {Array.from({length: rows}, (_, r) => items[r * 2 + side]).map((it, r) =>
              it ? (
                <div key={it.id}>
                  <SoftIn N={N} f0={it.f0}>
                    <div style={{...abs(cx - cw / 2, top + 66 + r * rowH, cw, rowH - 12), display: "flex", alignItems: "center", opacity: softOp(N - it.f0, BEAT.SOFT_IN) * (side === winner ? 1 : 0.82)}}>
                      <Box x={cx - cw / 2} y={0} w={cw} h={rowH - 12} border={side === winner ? PURPLE : GREY_LINE} radius={8} bloom={side !== winner} />
                      <div style={{width: 44, height: 44, flex: "0 0 44px", marginLeft: 16}}>
                        <Icon kind={it.icon} cx={22} cy={22} s={40} active={side === winner} reveal={1} />
                      </div>
                      <Label x={54} y={16} size={27} color={side === winner ? WHITE : GREY_LIGHT} maxW={cw - 130}>{it.text}</Label>
                    </div>
                  </SoftIn>
                </div>
              ) : null,
            )}
          </React.Fragment>
        );
      })}
      <Note cx={640} cy={Math.min(AREA.b - 4, top + 66 + rows * rowH + 26)}>{st.caption}</Note>
    </>
  );
}

/** reshape —— 一个形被箭头压成另一个形（转换的「形变」而非并置）。 */
export function Reshape({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const cy = 350;
  const lx = 330;
  const rx = 830;
  const s = 150;
  const press = clamp01((N - IN - 26) / 30);
  const shrink = 1 - 0.42 * press;
  const grow = 0.5 + 0.5 * press;
  return (
    <>
      <div style={{...abs(lx - s / 2, cy - s / 2, s, s), transform: `scale(${shrink.toFixed(3)})`, transformOrigin: `${lx}px ${cy}px`, opacity: 1 - 0.35 * press}}>
        <Box x={lx - s / 2} y={cy - s / 2} w={s} h={s} border={GREY_LINE} radius={12} />
        <div style={{...abs(lx - 40, cy - 40, 80, 80), display: "flex", alignItems: "center", justifyContent: "center"}}>
          <Icon kind={st.from_icon || items[0]?.icon || "doc"} cx={40} cy={40} s={76} reveal={clamp01((N - IN) / BEAT.DRAW_ON)} />
        </div>
        <Note cx={lx} cy={cy + s / 2 + 34}>{items[0]?.text}</Note>
      </div>
      <Svg>
        <LineArrow x1={lx + s / 2 + 26} y1={cy} x2={rx - s / 2 - 26} y2={cy} progress={drawOn(N - IN - 6, BEAT.DRAW_ON)} color={PURPLE_LIGHT} width={3} head={13} glow />
      </Svg>
      <Track x1={lx + s / 2 + 26} x2={rx - s / 2 - 26} y={cy + 58} N={N} f0={IN + 10} />
      <div style={{...abs(rx - s / 2, cy - s / 2, s, s), transform: `scale(${grow.toFixed(3)})`, transformOrigin: `${rx}px ${cy}px`}}>
        <Box x={rx - s / 2} y={cy - s / 2} w={s} h={s} border={PURPLE} radius={60} glow />
        <div style={{...abs(rx - 40, cy - 40, 80, 80), display: "flex", alignItems: "center", justifyContent: "center"}}>
          <Icon kind={st.to_icon || items[1]?.icon || "lock"} cx={40} cy={40} s={76} active reveal={clamp01((N - IN - 20) / BEAT.DRAW_ON)} />
        </div>
      </div>
      <Note cx={rx} cy={cy + s / 2 + 34}>{items[1]?.text}</Note>
      {items[2] ? (
        <SoftIn N={N} f0={items[2].f0}>
          <div style={{...abs(560, cy - 172, 160, 60), opacity: softOp(N - items[2].f0, BEAT.SOFT_IN)}}>
            <GlowBlob cx={640} cy={cy - 142} r={64} N={N} k={k[2] > 0.4 ? 0.9 : 0.3} />
            <CText cx={640} cy={cy - 142} size={30} weight={800} color={k[2] > 0.4 ? WHITE : GREY_LIGHT} maxW={300}>{items[2].text}</CText>
          </div>
        </SoftIn>
      ) : null}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}

/** ladder —— 竖向梯子：两侧立柱 + 若干横档，当前档整档点亮（分级/档位）。 */
export function Ladder({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
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
            <div style={{...abs(lx + 26, top + i * gap - 28, rx - lx - 52, 56), display: "flex", alignItems: "center", opacity: 1 - 0.4 * isPast(i, marks, N)}}>
              <div style={{width: 46, height: 46, flex: "0 0 46px"}}>
                <Icon kind={it.icon} cx={23} cy={23} s={42} active={k[i] > 0.5} reveal={1} />
              </div>
              <Label x={68} y={14} size={29} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={rx - lx - 160}>{it.text}</Label>
            </div>
          </SoftIn>
        </div>
      ))}
      <Note cx={640} cy={AREA.b - 4}>{st.caption}</Note>
    </>
  );
}