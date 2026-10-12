// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-007","script_sha256":"3bb3ecdba72526c002e459211d43594b80b5b40d6e097e545a594e89c5288e18"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC07 · layerstack —— 一年、数十个团队的现场经验。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC07",
  variant: "structured",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  narrative_job: "一年、数十个团队的现场经验",
  stage: {
    kind: "layerstack",
    focus: [0, 38, 76],
    items: [
      {id: "a1", icon: "clock", text: "过去一年"},
      {id: "a2", icon: "gauge", text: "数十个团队"},
      {id: "a3", icon: "doc", text: "一线经验"},
      {id: "a4", icon: "grid", text: "反复验证"},
    ],
  },
};

export function SC07({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
