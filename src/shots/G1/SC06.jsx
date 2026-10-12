// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-006","script_sha256":"c2a5d0289ff7d0ab3b525fe900bc26364c61fbfdfa9c280e60edda82215784a9"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC06 · orbit —— agent 自主决定过程。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC06",
  variant: "network",
  hero_size: 210,
  camera: "push",
  settle_frames: 30,
  narrative_job: "agent 自主决定过程",
  stage: {
    kind: "orbit",
    focus: [0, 38, 76],
    icon: "person",
    label: "agent",
    cx: 640,
    cy: 350,
    rx: 400,
    ry: 150,
    items: [
      {id: "o1", icon: "branch", text: "自主决定步骤"},
      {id: "o2", icon: "clock", text: "长期独立运行"},
      {id: "o3", icon: "chip", text: "用工具完成任务"},
    ],
  },
};

export function SC06({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
