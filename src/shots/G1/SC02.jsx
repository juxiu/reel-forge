// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-002","script_sha256":"422ba5e391c0b59de97065ab0c0cffcaf0b14158843a3f157a3417d8f51d5202"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC02 · causechain —— 技能就是一个文件夹。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC02",
  variant: "causal",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "技能就是一个文件夹",
  stage: {
    kind: "causechain",
    focus: [0, 38, 76],
    items: [
      {id: "c1", icon: "grid", text: "一个文件夹"},
      {id: "c2", icon: "doc", text: "SKILL.md"},
      {id: "c3", icon: "branch", text: "需要时自己加载"},
    ],
  },
};

export function SC02({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
