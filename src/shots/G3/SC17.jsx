import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC17 · ladder —— 强度分级。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC17",
  variant: "sequence",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "levels",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "ladder",
      focus: [0,40,80],
      caption: "三档强度",
      items: [
        {id: "g1", icon: "wave", text: "不加密"},
        {id: "g2", icon: "chip", text: "弱摘要"},
        {id: "g3", icon: "shield", text: "强摘要"},
      ],
    },
};

export function SC17({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
