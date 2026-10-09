import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC20 · terminal —— 规范化后的请求串。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC20",
  variant: "code",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "canonical",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "terminal",
      focus: [0,34,68,102],
      caption: "规范化之后",
      title: "canonical request",
      items: [
        {id: "c1", icon: "doc", text: "GET"},
        {id: "c2", icon: "link", text: "/orders"},
        {id: "c3", icon: "person", text: "auth"},
        {id: "c4", icon: "lock", text: "digest"},
      ],
    },
};

export function SC20({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
