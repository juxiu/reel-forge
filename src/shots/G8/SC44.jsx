import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G8_STAGE} from "./stage.jsx";

/**
 * SC44 · layerstack —— 判断的三个层次。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC44",
  variant: "structured",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "criteria",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "layerstack",
      focus: [0,36,72],
      indent: 100,
      caption: "判断有先后",
      items: [
        {id: "j1", icon: "wave", text: "场景"},
        {id: "j2", icon: "link", text: "链路"},
        {id: "j3", icon: "gauge", text: "成本"},
      ],
    },
};

export function SC44({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G8_STAGE} />;
}
