// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-008","script_sha256":"a7e12abc130e0e7ed295bb12c04ca123b7564fdf7ff00684ae78951065f6b7c4"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC08 · orbit —— 最成功的实现不靠框架。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC08",
  variant: "network",
  hero_size: 210,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "最成功的实现不靠框架",
  stage: {
    kind: "orbit",
    focus: [0, 38, 76],
    icon: "key",
    label: "共同点",
    cx: 640,
    cy: 350,
    rx: 400,
    ry: 150,
    items: [
      {id: "o1", icon: "doc", text: "不用复杂框架"},
      {id: "o2", icon: "db", text: "不用专用库"},
      {id: "o3", icon: "branch", text: "用简单模式"},
    ],
  },
};

export function SC08({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
