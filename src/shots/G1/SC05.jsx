import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC05 · 对比 —— 两种覆盖范围并置。
 *
 * 拓扑 dualpanel：左右两块面板对置，中间一条竖缝，**没有方向性箭头**
 *（SC02 的转换有箭头，这里是并置对比，方向性是错的语义）。
 * 右侧是本镜焦点，带紫框 + glow + ✓；左侧一律灰。
 *
 * ⚠ stage.winner 指向焦点侧（0 左 / 1 右），它同时决定紫框、glow 与 ✓，三者不许各判各的。
 * ⚠ items[0]/items[1] 是两块面板的标题，icon 走 stage.icons 覆盖 —— 面板图标与行图标不是一套。
 */
export const SHOT_RECIPE = {
  shot_id: "SC05",
  variant: "comparison",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "compare",
  mirror: false,
  support_count: 2,
  accent_index: 1,
  stage: {
    kind: "dualpanel",
    winner: 1,
    icons: ["clock", "shield"],
    notes: ["只覆盖一跳", "覆盖整条链路"],
    caption: "覆盖范围的差别不在算法，在链路长度",
    focus: [0, 46],
    items: [
      {id: "p1", icon: "clock", text: "单跳校验"},
      {id: "p2", icon: "shield", text: "端到端校验"},
    ],
  },
};

export function SC05({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}