import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC24 · layerstack —— 字段的四个层次。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC24",
  variant: "structured",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  hero_role: "hierarchy",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "layerstack",
      focus: [0,34,68,102],
      indent: 88,
      caption: "字段分四层",
      items: [
        {id: "h1", icon: "doc", text: "头字段"},
        {id: "h2", icon: "scale", text: "规范化"},
        {id: "h3", icon: "link", text: "拼接"},
        {id: "h4", icon: "lock", text: "摘要"},
      ],
    },
};

export function SC24({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
