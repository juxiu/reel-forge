import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC22 · splitrows —— 请求侧与响应侧字段。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC22",
  variant: "split",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  hero_role: "sides",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "splitrows",
      focus: [0,40,80],
      winner: 1,
      caption: "两侧字段不同",
      left_label: "请求侧",
      right_label: "响应侧",
      items: [
        {id: "q1", icon: "doc", text: "method 与 uri"},
        {id: "q2", icon: "lock", text: "response"},
        {id: "q3", icon: "clock", text: "qop 与 nc"},
        {id: "q4", icon: "key", text: "cnonce 与 opaque"},
      ],
    },
};

export function SC22({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
