import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G7_STAGE} from "./stage.jsx";

/**
 * SC38 · causechain —— 代价从哪来。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC38",
  variant: "causal",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "cost",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "causechain",
      focus: [0,38,76],
      caption: "代价从这几处来",
      items: [
        {id: "e1", icon: "link", text: "每跳多算一次"},
        {id: "e2", icon: "scale", text: "两侧顺序要对齐"},
        {id: "e3", icon: "gauge", text: "调试成本变高"},
      ],
    },
};

export function SC38({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G7_STAGE} />;
}
