// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-011","script_sha256":"0714f147a1eef9d6ba5fe9bea2a184f5eb4bb132c1ea728b042caa10dbc9e163"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC11 · ladder —— 可控与灵活，按任务选。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC11",
  variant: "sequence",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "可控与灵活，按任务选",
  stage: {
    kind: "ladder",
    focus: [0, 38, 76],
    items: [
      {id: "l1", icon: "link", text: "写死路径，可控"},
      {id: "l2", icon: "chip", text: "交给模型，灵活"},
      {id: "l3", icon: "key", text: "先想清楚要哪种"},
    ],
  },
};

export function SC11({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
