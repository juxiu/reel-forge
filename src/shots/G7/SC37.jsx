import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G7_STAGE} from "./stage.jsx";

/**
 * SC37 · pipeline3 —— 接入的三步。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC37",
  variant: "sequence",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  hero_role: "adopt",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "pipeline3",
      focus: [0,40,80],
      caption: "接入要改三处",
      items: [
        {id: "p1", icon: "chip", text: "选算法"},
        {id: "p2", icon: "grid", text: "配字段"},
        {id: "p3", icon: "scale", text: "对齐顺序"},
      ],
    },
};

export function SC37({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G7_STAGE} />;
}
