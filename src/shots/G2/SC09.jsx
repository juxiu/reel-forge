// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-009","script_sha256":"f246cc13904042aeb179fc0a15021bc704ff3cd5eda49378e956b4d52770bff2"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC09 · comparetable —— SKILL.md 分成元数据与指令两段。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC09",
  variant: "comparison",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "SKILL.md 分成元数据与指令两段",
  stage: {
    kind: "comparetable",
    focus: [0, 38, 76],
    left_label: "元数据段",
    right_label: "指令段",
    winner: 0,
    items: [
      {id: "l1", icon: "key", text: "name"},
      {id: "r1", icon: "doc", text: "指令正文"},
      {id: "l2", icon: "gauge", text: "description"},
      {id: "r2", icon: "branch", text: "步骤与边界"},
    ],
  },
};

export function SC09({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
