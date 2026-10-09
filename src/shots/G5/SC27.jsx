import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G5_STAGE} from "./stage.jsx";

/**
 * SC27 · ladder —— 重放防护的三档。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC27",
  variant: "sequence",
  hero_size: 190,
  camera: "push",
  settle_frames: 30,
  hero_role: "defense",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "ladder",
      focus: [0,40,80],
      caption: "三档防护",
      items: [
        {id: "z1", icon: "wave", text: "仅 nonce"},
        {id: "z2", icon: "clock", text: "nonce 加计数"},
        {id: "z3", icon: "shield", text: "再加窗口"},
      ],
    },
};

export function SC27({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G5_STAGE} />;
}
