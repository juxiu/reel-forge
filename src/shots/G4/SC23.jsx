// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-023","script_sha256":"18364260cad11a8aa01493b1c09436a8fff6e975bc85dec2a93544caf5f589df"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC23 · splitrows —— 自动与点名两种调用方式。
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
  narrative_job: "自动与点名两种调用方式",
  stage: {
    kind: "splitrows",
    focus: [0, 38, 76],
    left_label: "自动加载",
    right_label: "点名调用",
    winner: 0,
    items: [
      {id: "l1", icon: "link", text: "相关时自动加载"},
      {id: "r1", icon: "person", text: "直接点名调用"},
      {id: "l2", icon: "shield", text: "两种都靠描述"},
      {id: "r2", icon: "doc", text: "描述是唯一的门"},
    ],
  },
};

export function SC23({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
