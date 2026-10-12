// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-009","script_sha256":"3bc893655c957d86bb87ec1869f890711ae1c189a9b32077f6d025843e44d730"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC09 · comparetable —— 简单可组合战胜复杂框架。
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
  narrative_job: "简单可组合战胜复杂框架",
  stage: {
    kind: "comparetable",
    focus: [0, 38, 76],
    left_label: "复杂框架",
    right_label: "简单模式",
    winner: 1,
    items: [
      {id: "l1", icon: "db", text: "专用库"},
      {id: "r1", icon: "grid", text: "简单模式"},
      {id: "l2", icon: "lock", text: "整套绑定"},
      {id: "r2", icon: "link", text: "自由组合"},
    ],
  },
};

export function SC09({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
