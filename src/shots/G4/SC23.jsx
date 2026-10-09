import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC23 · ballot —— 顺序的三种取法。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC23",
  variant: "preference",
  hero_size: 185,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "order",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "ballot",
      focus: [0,38,76],
      pick: 2,
      caption: "顺序的三种取法",
      items: [
        {id: "o1", icon: "grid", text: "手写固定序"},
        {id: "o2", icon: "scale", text: "按字典序"},
        {id: "o3", icon: "doc", text: "按规范序"},
      ],
    },
};

export function SC23({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
