// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-003","script_sha256":"3a482e33253ebde161f8bb2f31a1964a17852ef46eb0deb18e5e611946eec747"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC03 · comparetable —— 定义二，按预定流程走。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC03",
  variant: "comparison",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  narrative_job: "定义二，按预定流程走",
  stage: {
    kind: "comparetable",
    focus: [0, 38, 76],
    left_label: "自主系统",
    right_label: "预定流程",
    winner: 0,
    items: [
      {id: "l1", icon: "clock", text: "长期独立运行"},
      {id: "r1", icon: "doc", text: "按流程走"},
      {id: "l2", icon: "chip", text: "自己拿主意"},
      {id: "r2", icon: "link", text: "照规定接龙"},
    ],
  },
};

export function SC03({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
