import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC08 · causechain —— 明文口令的三级因果。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC08",
  variant: "causal",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "motivation",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "causechain",
      focus: [0,38,76],
      caption: "为什么明文口令不够",
      items: [
        {id: "c1", icon: "wave", text: "抓包即可读出口令"},
        {id: "c2", icon: "branch", text: "同一凭据可被复用"},
        {id: "c3", icon: "lock", text: "只能换成摘要"},
      ],
    },
};

export function SC08({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
