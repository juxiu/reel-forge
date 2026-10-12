// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-023","script_sha256":"31868c310a33e9339742077c9ce4bb27d3cd0d2decae07aeb0fb11570acae8be"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC23 · splitrows —— 从流程到自主的谱系。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC23",
  variant: "split",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "从流程到自主的谱系",
  stage: {
    kind: "splitrows",
    focus: [0, 38, 76],
    left_label: "写死的流程",
    right_label: "自主的系统",
    winner: 1,
    items: [
      {id: "l1", icon: "link", text: "路径写死"},
      {id: "r1", icon: "branch", text: "自主决策"},
      {id: "l2", icon: "doc", text: "workflow 一端"},
      {id: "r2", icon: "person", text: "agent 一端"},
    ],
  },
};

export function SC23({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
