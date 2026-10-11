// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-018","script_sha256":"17343863f9e3922ab4975d0d921227d8a5ba8e028d1d0523303d99b432c0b321"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC18 · orbit —— 一个任务往往要用好几个技能。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC18",
  variant: "network",
  hero_size: 210,
  camera: "push",
  settle_frames: 30,
  narrative_job: "一个任务往往要用好几个技能",
  stage: {
    kind: "orbit",
    focus: [0, 38, 76],
    icon: "grid",
    label: "一个任务",
    cx: 640,
    cy: 350,
    rx: 400,
    ry: 150,
    items: [
      {id: "o1", icon: "chip", text: "技能 A"},
      {id: "o2", icon: "db", text: "技能 B"},
      {id: "o3", icon: "link", text: "技能 C"},
    ],
  },
};

export function SC18({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
