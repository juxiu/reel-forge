import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G6_STAGE} from "./stage.jsx";

/**
 * SC34 · layerstack —— 每一跳要做的四件事。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC34",
  variant: "structured",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  hero_role: "perhop",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "layerstack",
      focus: [0,34,68,102],
      indent: 92,
      caption: "每一跳都要做",
      items: [
        {id: "j1", icon: "person", text: "认证"},
        {id: "j2", icon: "link", text: "转发"},
        {id: "j3", icon: "shield", text: "再认证"},
        {id: "j4", icon: "db", text: "落库"},
      ],
    },
};

export function SC34({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G6_STAGE} />;
}
