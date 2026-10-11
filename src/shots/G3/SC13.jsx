// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-013","script_sha256":"e5d64301459f03a3dc237525c8bbecc99c801aba4bc5baed3a9c60e198874ebd"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC13 · pipeline3 —— 第一步是发现。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC13",
  variant: "sequence",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "第一步是发现",
  stage: {
    kind: "pipeline3",
    focus: [0, 38, 76],
    subs: ["扫描手上的技能","找出相关的","变成候选"],
    items: [
      {id: "s1", icon: "funnel", text: "扫描"},
      {id: "s2", icon: "link", text: "匹配"},
      {id: "s3", icon: "grid", text: "候选"},
    ],
  },
};

export function SC13({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
