import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC13 · ballot —— 算法三选一。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC13",
  variant: "preference",
  hero_size: 185,
  camera: "pan",
  settle_frames: 30,
  hero_role: "choice",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "ballot",
      focus: [0,38,76],
      pick: 2,
      caption: "强度分档，按需选",
      items: [
        {id: "a1", icon: "chip", text: "弱摘要"},
        {id: "a2", icon: "chip", text: "过渡摘要"},
        {id: "a3", icon: "shield", text: "强摘要"},
      ],
    },
};

export function SC13({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
