// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-011","script_sha256":"972d3d6910399f4c10e31439daa4ac9de0220c879461aae42b879b2b36803c8a"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC11 · ladder —— 关键在于渐进式披露。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC11",
  variant: "sequence",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "关键在于渐进式披露",
  stage: {
    kind: "ladder",
    focus: [0, 38, 76],
    items: [
      {id: "l1", icon: "doc", text: "描述：一直挂着"},
      {id: "l2", icon: "chunk", text: "正文：命中才读"},
      {id: "l3", icon: "db", text: "附属文件：按需再取"},
    ],
  },
};

export function SC11({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
