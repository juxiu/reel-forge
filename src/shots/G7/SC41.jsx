import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G7_STAGE} from "./stage.jsx";

/**
 * SC41 · orbit —— 落地要碰哪些组件。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC41",
  variant: "network",
  hero_size: 210,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "touchpoints",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "orbit",
      focus: [40,78],
      rx: 396,
      ry: 176,
      cx: 640,
      cy: 380,
      icon: "rack",
      label: "落地涉及",
      items: [
        {id: "h1", icon: "link", text: "网关"},
        {id: "h2", icon: "db", text: "应用"},
        {id: "h3", icon: "person", text: "客户端"},
        {id: "h4", icon: "gauge", text: "运维"},
      ],
    },
};

export function SC41({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G7_STAGE} />;
}
