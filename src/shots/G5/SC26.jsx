import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G5_STAGE} from "./stage.jsx";

/**
 * SC26 · reshape —— 报文变成计数窗口。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC26",
  variant: "transformation",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "window",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "reshape",
      focus: [0,44,88],
      caption: "重放被压进窗口里",
      from_icon: "doc",
      to_icon: "clock",
      items: [
        {id: "y1", icon: "doc", text: "报文"},
        {id: "y2", icon: "clock", text: "计数窗口"},
        {id: "y3", icon: "branch", text: "拒绝重放"},
      ],
    },
};

export function SC26({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G5_STAGE} />;
}
