// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-005","script_sha256":"767c8833052c6383eafb7520409689320078735c017baac538d665b3b8c5de74"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC05 · splitrows —— workflow 由代码路径编排。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC05",
  variant: "split",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "workflow 由代码路径编排",
  stage: {
    kind: "splitrows",
    focus: [0, 38, 76],
    left_label: "代码路径",
    right_label: "LLM 与工具",
    winner: 0,
    items: [
      {id: "l1", icon: "link", text: "预定义路径"},
      {id: "r1", icon: "chip", text: "LLM 与工具"},
      {id: "l2", icon: "doc", text: "顺序先定好"},
      {id: "r2", icon: "grid", text: "照路径执行"},
    ],
  },
};

export function SC05({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
