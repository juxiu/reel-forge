import React from "react";
import {Box, CText, Check, Cross, Label, LineArrow, MonoText, SoftIn, Svg, TechSub, WHITE} from "../../remotion/Primitives.jsx";
import {GlowBlob, TiltPlane} from "../../remotion/Fx.jsx";
import {Icon} from "../../remotion/Icons.jsx";
import {abs} from "../../remotion/Design.jsx";
import {GREY, GREY_LIGHT, GREY_LINE, GREY_MID, PURPLE, PURPLE_LIGHT} from "../../visual/style.mjs";
import {BEAT, clamp01, drawOn, softOp} from "../../visual/easing.mjs";
import {AREA, Core, Glyph, Track, entryOf, focusWalk, isPast, marksOf, Node as Satellite} from "../stage-kit.jsx";

/**
 * G1 组（第 1 章）私有舞台。
 *
 * 形态对齐参照片 examples/rag/shots_src/G1/layout.tsx 的做法：**一组的镜头共用一个舞台，
 * 状态是绝对帧号的纯函数**，相邻镜头因此天然承接（元素不必清场，只演进），组界才需要真正离场。
 * 这一层是 44 镜里质量差距的来源 —— recipe.stage.items 的坐标只能把通用图元摆到作者指定位置，
 * 表达不了「虚线槽 + 编号徽章 + 紫色焦点在槽间游走」这类组内语汇。
 *
 * ---------------------------------------------------------------------------
 * 拓扑（stage.kind）声明在 recipe 里，是本组与通用引擎的分界：
 *   SC01 radial     中心节点 + 环绕卫星 + 辐条
 *   SC02 split2col  原文 ↔ 结构化 双栏对照
 *   SC03 ranked3    三行候选 + 末端判定标记（✓ / ✗）
 *   SC04 rail4      右侧纵轨串起四层字段
 *   SC05 dualpanel  左右两块对置 + 中缝分隔
 *   SC06 beforeafter 倾斜平面上的前后转换
 *
 * ⚠ 六种拓扑**互不嵌套**：没有任何两种能靠同一个 layout 函数渲染出来。
 *    scripts/verify-authored-shots.mjs 按 kind 做全片去重审计，塌回通用版式会直接 FAIL。
 *
 * 纪律（与 SemanticShots 一致，这里不重犯）：
 *   1. 紫色只给当前重点：同一时刻至多 1 个 active，由 focusWalk 的 11 帧爬坡保证交接不重叠；
 *   2. 光只跟主角：卫星 / 配角不带 box-shadow，柔光与光环只给中心节点；
 *   3. 入场帧一律取 plan 算出的 item.f0（锚在字幕块 −6…+3 窗口内），舞台不自己另算节拍。
 */

// ---------------------------------------------------------------- 六个拓扑

/**
 * SC01 · radial —— 中心认证节点 + 六个卫星（辐条）。
 * 用来在一镜里把「一次握手牵涉到哪些角色」一次说完，是全片的开场钩子。
 */
function Radial({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const hub = {cx: st.hub.cx, cy: st.hub.cy};
  const size = Number(recipe.hero_size) || 210;
  const items = plan.items.filter((it) => it.kind !== "flow");
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const spokes = drawOn(N - IN, BEAT.DRAW_ON);
  return (
    <>
      <Svg>
        {items.map((it, i) => {
          const a = (Math.PI * 2 * i) / Math.max(1, items.length);
          const sx = Math.round(hub.cx + Math.cos(a) * st.rx);
          const sy = Math.round(hub.cy + Math.sin(a) * st.ry);
          return <LineArrow key={`sp${it.id}`} x1={hub.cx} y1={hub.cy} x2={sx} y2={sy} progress={spokes} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} width={k[i] > 0.5 ? 2.5 : 2} head={0} opacity={0.32 + 0.5 * k[i]} />;
        })}
      </Svg>
      <Core cx={hub.cx} cy={hub.cy} size={size} N={N} f0={IN} icon={st.icon} label={st.label} />
      {items.map((it, i) => {
        const a = (Math.PI * 2 * i) / Math.max(1, items.length);
        return (
          <Satellite
            key={it.id}
            cx={Math.round(hub.cx + Math.cos(a) * st.rx)}
            cy={Math.round(hub.cy + Math.sin(a) * st.ry)}
            icon={it.icon}
            text={it.text}
            N={N}
            f0={it.f0}
            active={k[i] > 0.5}
          />
        );
      })}
    </>
  );
}

/**
 * SC02 · split2col —— 左「原始报文」右「解析出的字段」，中缝一条 draw-on 箭头。
 * 与 SC01 的差别是拓扑性的：没有中心节点，是两栏各自成块。
 */
function Split2Col({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);
  const colW = 470;
  const lx = 110;
  const rx = 700;
  const arrow = drawOn(N - IN, BEAT.DRAW_ON);
  return (
    <>
      <Box x={lx - 22} y={AREA.t + 4} w={colW + 44} h={392} border={GREY} radius={14} opacity={softOp(N - IN, BEAT.FADE_IN)} />
      <Box x={rx - 22} y={AREA.t + 4} w={colW + 44} h={392} border={PURPLE} radius={14} glow opacity={softOp(N - IN, BEAT.FADE_IN) * 0.9} />
      <Svg>
        <LineArrow x1={lx + colW} y1={380} x2={rx - 14} y2={380} progress={arrow} color={PURPLE_LIGHT} width={3} head={12} glow />
      </Svg>
      <CText cx={lx + colW / 2} cy={AREA.t - 6} size={30} weight={800} color={GREY_LIGHT}>{st.left_label}</CText>
      <CText cx={rx + colW / 2} cy={AREA.t - 6} size={30} weight={800} color={WHITE}>{st.right_label}</CText>
      {left.map((it, i) => (
        <div key={it.id}>
          <SoftIn N={N} f0={it.f0}>
            <div style={{...abs(lx, 250 + i * 74, colW, 60), display: "flex", alignItems: "center"}}>
              <div style={{width: 46, height: 46, flex: "0 0 46px"}}>
                <Glyph kind={it.icon} cx={23} cy={23} s={44} reveal={1} />
              </div>
              <MonoText x={62} y={14} size={26} color={GREY_LIGHT}>{it.text}</MonoText>
            </div>
          </SoftIn>
        </div>
      ))}
      {right.map((it, i) => (
        <div key={it.id}>
          <SoftIn N={N} f0={it.f0}>
            <div style={{...abs(rx, 250 + i * 74, colW, 60), display: "flex", alignItems: "center"}}>
              <div style={{width: 46, height: 46, flex: "0 0 46px"}}>
                <Glyph kind={it.icon} cx={23} cy={23} s={44} active reveal={1} />
              </div>
              <MonoText x={62} y={14} size={26} color={WHITE}>{it.text}</MonoText>
            </div>
          </SoftIn>
        </div>
      ))}
    </>
  );
}

/**
 * SC03 · ranked3 —— 三行候选 + 末端判定标记。
 * 与前两镜的差别：横向排行结构，右侧一列 ✓/✗ 是这一镜独有的语法（预选 / 淘汰）。
 */
function Ranked3({plan, N, recipe}) {
  const st = recipe.stage;
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const rowH = 108;
  const top = 226;
  const x = 150;
  const w = 980;
  const pick = st.pick;
  return (
    <>
      {items.map((it, i) => {
        const y = top + i * (rowH + 22);
        const chosen = i === pick;
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <Box x={x} y={y} w={w} h={rowH} border={chosen ? PURPLE : GREY} radius={12} glow={chosen} bloom={!chosen} opacity={1 - 0.45 * isPast(i, marks, N)} />
              <div style={{...abs(x + 24, y + (rowH - 72) / 2, 72, 72), display: "flex", alignItems: "center", justifyContent: "center"}}>
                <Glyph kind={it.icon} cx={36} cy={36} s={66} active={chosen} reveal={1} />
              </div>
              <Label x={x + 120} y={y + rowH / 2 - 17} size={32} color={chosen ? WHITE : GREY_LIGHT} maxW={560}>{it.text}</Label>
              <div style={{...abs(x + w - 76, y + (rowH - 44) / 2, 44, 44)}}>
                {chosen ? <Check cx={22} cy={22} size={40} color={PURPLE_LIGHT} progress={drawOn(N - it.f0 - 10, 14)} /> : <Cross cx={22} cy={22} size={34} color={GREY_MID} progress={drawOn(N - it.f0 - 10, 14)} />}
              </div>
            </SoftIn>
            {i < items.length - 1 ? <Track x1={x + 40} x2={x + w - 40} y={y + rowH + 11} N={N} f0={it.f0 + 12} color={k[i] > 0.4 ? PURPLE_LIGHT : GREY_LINE} /> : null}
          </div>
        );
      })}
      <TechSub cx={640} cy={top + 3 * (rowH + 22) + 16}>{st.caption}</TechSub>
    </>
  );
}

/**
 * SC04 · rail4 —— 右侧一条纵轨串起四层字段（解析→校验→签名→落库）。
 * 与前三镜的差别：多了一条贯穿的纵向轨道，字段块挂在轨道节点上，视线沿轨道下行。
 */
function Rail4({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const railX = 1078;
  const top = 214;
  const gap = 106;
  const trackProgress = clamp01((N - IN) / (BEAT.DRAW_ON + items.length * 6));
  return (
    <>
      <Svg>
        <line x1={railX} y1={top - 16} x2={railX} y2={top + (items.length - 1) * gap} stroke={GREY_LINE} strokeWidth={3} strokeDasharray="16 12" opacity={trackProgress} />
        {items.map((it, i) => (
          <circle key={`n${it.id}`} cx={railX} cy={top + i * gap} r={9} fill={k[i] > 0.5 ? PURPLE_LIGHT : GREY} opacity={softOp(N - it.f0, 8)} />
        ))}
        {items.map((it, i) => (
          <LineArrow key={`c${it.id}`} x1={railX - 26} y1={top + i * gap} x2={railX - 116} y2={top + i * gap} progress={drawOn(N - it.f0, 12)} color={k[i] > 0.5 ? PURPLE_LIGHT : GREY_LINE} width={2} head={0} />
        ))}
      </Svg>
      {items.map((it, i) => {
        const y = top + i * gap - 46;
        return (
          <div key={it.id}>
            <SoftIn N={N} f0={it.f0}>
              <div style={{...abs(150, y, 800, 92), display: "flex", alignItems: "center", opacity: 1 - 0.45 * isPast(i, marks, N)}}>
                <div style={{width: 64, height: 64, flex: "0 0 64px"}}>
                  <Glyph kind={it.icon} cx={32} cy={32} s={60} active={k[i] > 0.5} reveal={1} />
                </div>
                <Box x={86} y={14} w={714} h={64} border={k[i] > 0.5 ? PURPLE : GREY} radius={8} bloom={k[i] <= 0.5} />
                <Label x={112} y={30} size={30} color={k[i] > 0.5 ? WHITE : GREY_LIGHT} maxW={640}>{it.text}</Label>
              </div>
            </SoftIn>
          </div>
        );
      })}
      <TechSub cx={614} cy={AREA.b - 60}>{st.caption}</TechSub>
    </>
  );
}

/**
 * SC05 · dualpanel —— 左右两块对置，中间一条竖缝。
 * 与 SC02 的差别：SC02 是「原文→字段」的转换（横向箭头），这里是两个方案的**并置对比**，
 * 所以没有方向性箭头，取而代之的是中缝与两侧的对位关系。
 */
function DualPanel({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const pw = 470;
  const py = AREA.t + 16;
  const ph = 336;
  const lx = 120;
  const rx = 690;
  const seam = drawOn(N - IN, BEAT.DRAW_ON);
  const winner = st.winner;
  return (
    <>
      <Box x={lx} y={py} w={pw} h={ph} border={GREY} radius={14} opacity={softOp(N - IN, BEAT.FADE_IN)} />
      <Box x={rx} y={py} w={pw} h={ph} border={PURPLE} radius={14} glow opacity={softOp(N - IN, BEAT.FADE_IN) * 0.9} />
      <Svg>
        <line x1={640} y1={py - 18} x2={640} y2={py + ph + 18} stroke={GREY_LINE} strokeWidth={2} opacity={seam} />
      </Svg>
      <CText cx={lx + pw / 2} cy={py - 34} size={30} weight={800} color={GREY_LIGHT}>{items[0]?.text}</CText>
      <CText cx={rx + pw / 2} cy={py - 34} size={30} weight={800} color={WHITE}>{items[1]?.text}</CText>
      {[items[0], items[1]].map((it, side) => {
        if (!it) return null;
        const bx = side === 0 ? lx : rx;
        const act = side === winner;
        return (
          <div key={it.id}>
            <div style={{...abs(bx + pw / 2 - 84, py + 84, 168, 168), display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Glyph kind={st.icons?.[side] || it.icon} cx={84} cy={84} s={160} active={act} reveal={clamp01((N - it.f0) / BEAT.DRAW_ON)} />
            </div>
            <div style={{...abs(bx + 40, py + 268, pw - 80, 48), display: "flex", alignItems: "center", justifyContent: "center"}}>
              {act ? <Check cx={pw / 2 - 80} cy={24} size={38} color={PURPLE_LIGHT} progress={drawOn(N - it.f0 - 12, 14)} /> : null}
              <Label x={act ? 20 : 0} y={10} size={26} color={act ? WHITE : GREY} maxW={pw - 120} align="center">{st.notes?.[side]}</Label>
            </div>
          </div>
        );
      })}
      <TechSub cx={640} cy={py + ph + 44}>{st.caption}</TechSub>
      <Track x1={lx + 30} x2={rx - 30} y={AREA.b - 60} N={N} f0={IN + 18} color={k[winner] > 0.4 ? PURPLE_LIGHT : GREY_LINE} />
    </>
  );
}

/**
 * SC06 · beforeafter —— 倾斜平面上的前后转换（message → digest → verified）。
 * 全组唯一的斜置构图：两个 TiltPlane 一前一后，中间一道传送轨道与光点，
 * 收在右侧一枚通过标记上（这一镜是本章的落点，所以它是本组唯一带 check 终态的拓扑）。
 */
function BeforeAfter({plan, N, recipe}) {
  const st = recipe.stage;
  const IN = entryOf(plan, st);
  const items = plan.items;
  const marks = marksOf(plan, st);
  const k = focusWalk(marks, N);
  const py = 306;
  const p1x = 348;
  const p2x = 796;
  const pw = 376;
  const travel = clamp01((N - IN - 20) / 60);
  // ⚠ 平面**不再自带标题**。原来 items 是「原文/摘要/通过」、平面标题是「原始报文/摘要 + 校验值」，
  //   同一件事说了两遍，而且两行只差 23px 叠在一起 —— 真渲染才看得出这种冗余。
  //   现在只留items 这一组文案，排在斜置平面上方。
  return (
    <>
      {/*⚠ 斜置平面**不能放文字**。
          TiltPlane 对所有子元素施加 scaleY(0.46) skewX(-20°)，文字放进去会被压扁成斜体、
          几乎不可读（实测「原文」糊成一团）。参照片的斜置平面里放的是矢量形状，不是文字。
          所以：文案留在平面上方（可读），平面内部放几道横向线条示意「一张躺平的纸」——
          这既补了密度，又不会被形变破坏。*/}
      <TiltPlane cx={p1x} cy={py} w={pw} h={210} skew={-20} sy={0.46} stroke={GREY_MID} sw={2} fill="rgba(0,0,0,0.86)" opacity={softOp(N - IN, BEAT.FADE_IN)}>
        {[0, 1, 2, 3].map((r) => (
          <div key={r} style={{position: 'absolute', left: 46, top: 60 + r * 34, width: pw - 92 - r * 26, height: 7, background: GREY, opacity: 0.5 - r * 0.07}} />
        ))}
      </TiltPlane>
      <TiltPlane cx={p2x} cy={py} w={pw} h={210} skew={-20} sy={0.46} stroke={PURPLE} sw={2.5} fill="rgba(0,0,0,0.9)" opacity={softOp(N - IN - 14, BEAT.FADE_IN)}>
        {[0, 1, 2].map((r) => (
          <div key={r} style={{position: 'absolute', left: 46, top: 66 + r * 38, width: pw - 92 - r * 30, height: 8, background: PURPLE_LIGHT, opacity: 0.75 - r * 0.12}} />
        ))}
      </TiltPlane>
      {/* 平面上的标签：左右各一个，跟平面一起倾斜也不会糊（字在平面外，保留可读性）*/}
      <div style={{...abs(p1x - 150, 214, 300, 52), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Glyph kind={st.from_icon || items[0]?.icon || "doc"} cx={26} cy={26} s={40} reveal={clamp01((N - IN) / BEAT.DRAW_ON)} />
        <CText cx={168} cy={26} size={36} weight={800} color={GREY_LIGHT} maxW={240}>{items[0]?.text}</CText>
      </div>
      <div style={{...abs(p2x - 150, 214, 300, 52), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Glyph kind={st.to_icon || items[1]?.icon || "lock"} cx={26} cy={26} s={40} active reveal={clamp01((N - IN - 14) / BEAT.DRAW_ON)} />
        <CText cx={168} cy={26} size={36} weight={800} color={WHITE} maxW={240}>{items[1]?.text}</CText>
      </div>
      <Svg>
        <LineArrow x1={p1x + pw / 2} y1={py + 26} x2={p2x - pw / 2} y2={py + 26} progress={drawOn(N - IN - 6, BEAT.DRAW_ON)} color={PURPLE_LIGHT} width={3} head={12} glow />
      </Svg>
      <Track x1={p1x + pw / 2} x2={p2x - pw / 2} y={py + 64} N={N} f0={IN + 10} />
      {items[2] ? (
        <SoftIn N={N} f0={items[2].f0}>
          <div style={{...abs(566, 206, 148, 66), opacity: travel}}>
            <GlowBlob cx={74} cy={33} r={64} N={N} k={k[2] > 0.4 ? 0.95 : 0.3} />
            <CText cx={74} cy={33} size={36} weight={800} color={k[2] > 0.4 ? WHITE : GREY_LIGHT} maxW={280}>{items[2].text}</CText>
          </div>
        </SoftIn>
      ) : null}
      <div style={{...abs(p2x + pw / 2 + 10, py - 6, 60, 60), opacity: softOp(N - IN - 40, 12)}}>
        <Check cx={30} cy={30} size={52} color={PURPLE_LIGHT} progress={drawOn(N - IN - 40, 16)} />
      </div>
      <TechSub cx={640} cy={AREA.b - 60}>{st.caption}</TechSub>
    </>
  );
}

/**
 * G1 舞台导出。
 *
 * ⚠ 映射按 shot_id 给，不按 variant 给 —— 拓扑与镜头一一绑定，
 *    于是「variant 名换了但画面没变」这种偷懒在结构上不会发生。
 */
export const G1_STAGE = {
  group: "G1",
  topologies: ["radial", "split2col", "ranked3", "rail4", "dualpanel", "beforeafter"],
  components: {
    SC01: Radial,
    SC02: Split2Col,
    SC03: Ranked3,
    SC04: Rail4,
    SC05: DualPanel,
    SC06: BeforeAfter,
  },
};

export default G1_STAGE;