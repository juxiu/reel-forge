// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-003","script_sha256":"66c97bb73d607899796b115085182a6d6ada1ea9dc2bfc06fc528ecd2079a701"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC03 · comparetable —— 提示词用完就散，技能把它固定下来。
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
  narrative_job: "提示词用完就散，技能把它固定下来",
  stage: {
    kind: "comparetable",
    focus: [0, 38, 76],
    left_label: "提示词",
    right_label: "技能",
    winner: 1,
    items: [
      {id: "l1", icon: "doc", text: "用完就散"},
      {id: "r1", icon: "grid", text: "固定下来"},
      {id: "l2", icon: "clock", text: "每次重写"},
      {id: "r2", icon: "link", text: "随时复用"},
    ],
  },
};

export function SC03({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
