// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-007","script_sha256":"7f73fec33e6cd25182555a46d4f6eb3195e6106d671559d0ace9e121587fbce2"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC07 · layerstack —— 一个技能目录长这样。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC07",
  variant: "structured",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  narrative_job: "一个技能目录长这样",
  stage: {
    kind: "layerstack",
    focus: [0, 38, 76],
    items: [
      {id: "a1", icon: "doc", text: "SKILL.md（必需）"},
      {id: "a2", icon: "chip", text: "scripts"},
      {id: "a3", icon: "db", text: "references"},
      {id: "a4", icon: "rack", text: "assets"},
    ],
  },
};

export function SC07({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
