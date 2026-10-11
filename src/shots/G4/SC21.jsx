// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-021","script_sha256":"6c597a83b912fb91811b25ce4b6665dd603fe884dd1d3f3f1badd6add43a5b39"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC21 · ballot —— 什么时候值得建一个技能。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC21",
  variant: "preference",
  hero_size: 185,
  camera: "push",
  settle_frames: 30,
  narrative_job: "什么时候值得建一个技能",
  stage: {
    kind: "ballot",
    focus: [0, 38, 76],
    pick: 2,
    items: [
      {id: "b1", icon: "doc", text: "反复粘贴"},
      {id: "b2", icon: "chunk", text: "清单变长"},
      {id: "b3", icon: "db", text: "文档塞不下"},
    ],
  },
};

export function SC21({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
