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
 */
export const ExplainerShot = (props) => <SemanticShot {...props} />;

export {SemanticShot};
export default ExplainerShot;
