// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-013","script_sha256":"107a7a20a1fcdb45d81ccfa7a47711a54c741493c1b01a03b6663a7d98441e93"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC13 · pipeline3 —— 通用 agent 走进计算环境。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC13",
  variant: "sequence",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "通用 agent 走进计算环境",
  stage: {
    kind: "pipeline3",
    focus: [0, 38, 76],
    subs: ["模型在变强","环境更完整","交互更真实"],
    items: [
      {id: "s1", icon: "gauge", text: "模型变强"},
      {id: "s2", icon: "db", text: "完整计算环境"},
      {id: "s3", icon: "branch", text: "直接交互"},
    ],
  },
};

export function SC13({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
