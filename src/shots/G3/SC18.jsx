// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-018","script_sha256":"dfa0aa6cc8532ba13b426207d00b3baeed3d43a3c9ac2e7c5fd9d3689a3a9e56"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC18 · orbit —— 技能的解剖，目录加 SKILL.md。
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
  narrative_job: "技能的解剖，目录加 SKILL.md",
  stage: {
    kind: "orbit",
    focus: [0, 38, 76],
    icon: "doc",
    label: "SKILL.md",
    cx: 640,
    cy: 350,
    rx: 400,
    ry: 150,
    items: [
      {id: "o1", icon: "chip", text: "指令"},
      {id: "o2", icon: "branch", text: "脚本"},
      {id: "o3", icon: "db", text: "资料"},
    ],
  },
};

export function SC18({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
