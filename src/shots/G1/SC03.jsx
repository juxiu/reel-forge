import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC03 · 协商 —— 三种校验方案里选哪个。
 *
 * 拓扑 ranked3：三行候选横向排行，最右一列是判定标记（选中 ✓ / 淘汰 ✗），
 * 行间有一条行进轨道撑住持续动作。这一列判定标记是本镜独有的语法。
 *
 * ⚠ stage.pick 指定第几行是「选中」—— 它同时决定紫框、glow 与 ✓ 的出现，三者不许各判各的。
 * ⚠ 淘汰行不消失，只降到 0.5 不透明度（isPast）：这是「讲完仍留在画面上」的承接做法。
 */
export const SHOT_RECIPE = {
  shot_id: "SC03",
  variant: "preference",
  hero_size: 185,
  camera: "push",
  settle_frames: 30,
  hero_role: "negotiation",
  mirror: false,
  support_count: 3,
  accent_index: 2,
  stage: {
    kind: "ranked3",
    pick: 2,
    caption: "只有端到端能覆盖整条链路",
    focus: [0, 40, 80],
    items: [
      {id: "c1", icon: "clock", text: "单跳摘要"},
      {id: "c2", icon: "link", text: "逐跳摘要"},
      {id: "c3", icon: "shield", text: "端到端摘要"},
    ],
  },
};

export function SC03({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}