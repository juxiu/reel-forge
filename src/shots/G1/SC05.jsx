// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-005","script_sha256":"7764d6b48abaedc4dac8cc8797efae20d6eb8fdb761a409c6b837ae478db4e1d"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC05 · splitrows —— 工具给手，技能给方法。
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
  narrative_job: "工具给手，技能给方法",
  stage: {
    kind: "splitrows",
    focus: [0, 38, 76],
    left_label: "工具与插件",
    right_label: "技能",
    winner: 1,
    items: [
      {id: "l1", icon: "chip", text: "给一双手"},
      {id: "r1", icon: "branch", text: "给方法"},
      {id: "l2", icon: "lock", text: "一次性接入"},
      {id: "r2", icon: "grid", text: "可叠加组合"},
    ],
  },
};

export function SC05({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
