import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G5_STAGE} from "./stage.jsx";

/**
 * SC29 · citeside —— 时钟要求的出处。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC29",
  variant: "evidence",
  hero_size: 195,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "evidence",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "citeside",
      focus: [0,44],
      caption: "规范里的时钟要求",
      main_icon: "clock",
      cite_icons: ["doc","clock"],
      items: [
        {id: "m", icon: "clock", text: "两侧时钟必须足够接近"},
        {id: "s1", icon: "doc", text: "规范要求同步时间"},
        {id: "s2", icon: "gauge", text: "偏差过大会被拒"},
      ],
    },
};

export function SC29({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G5_STAGE} />;
}
