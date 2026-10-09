import React from 'react';
import {SemanticShot} from './SemanticShots.jsx';

/**
 * 镜头入口：生成的 SCnn.jsx 外壳只 import 这一个符号。
 *
 * ⚠ 这里**只有一个引擎**，不要把它当成「两种渲染器」来理解：
 *   · 手工分镜（recipe.stage.items 给了坐标与文案）→ 引擎按 authored 数据排，不再从 IR 猜；
 *   · 语义分镜（只有 scene.visual.objects / matched_rules）→ 引擎用 plan.mjs 的 pickHero/pickSupport
 *     从 IR 里取词、配骨架、发节拍。
 * 两条路在 src/shots/plan.mjs 里汇成同一个 render plan，所以 QC 判的排版、节拍、离场、光效
 * 与画面渲染的是同一份数。以前这里写成 `export {SemanticShot as ExplainerShot}`，
 * 看上去像另有独立的 authored 渲染器，实际没有——改名不改行为只会让人继续按错的假设改画面。
 *
 * plan 的缺陷（hero-overlong / icon-unregistered / beat-after-exit / accent-overflow …）
 * 由引擎挂到 window-free 的 data 属性并交给 QC 读 plan.issues，不靠肉眼从画面上猜。
 *
 * ---------------------------------------------------------------------------
 * `stage` prop = 组私有舞台（对齐参照片 shots_src/Gn/ 里 layout.tsx / g3ui.tsx 的做法）。
 *
 * 为什么需要它：recipe.stage.items 里的坐标只能让引擎把**通用图元**（Box / Icon / CText）
 * 摆到作者指定的位置，能防「塌成一套版式」，但表达不了组内自定义的视觉语汇——
 * 虚线槽、发光主角节点、紫色焦点在多个槽之间游走、TiltPlane 上的前后对照。
 * 参照片 44 镜真正拉开质量差距的就是这层（每组 128–315 行的私有图元模块）。
 *
 * 契约（有意收窄，避免它变成第二个引擎）：
 *   1. 舞台组件只负责**画面内容**。离场归零、运镜、扫光白名单、setPiece 时序仍由 SemanticShot
 *      在外层统一施加 —— 否则组里就能私开扫光，白名单（SWEEP_WHITELIST_MAX）当场失效。
 *   2. 舞台组件拿到的 plan 是同一个 buildPlan 结果，所以 plan.issues / repairs 照旧被 QC 读到；
 *      authored 镜头不会因为走了舞台就绕开分镜合规审计。
 *   3. 不传 stage 时行为与从前完全一致（语义变体走通用引擎）。舞台是**按组**提供的，
 *      不是按镜头——所以「一镜一写法」这种漂移在结构上就不可能发生。
 */
export const ExplainerShot = (props) => <SemanticShot {...props} />;

export {SemanticShot};
export default ExplainerShot;