// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-021","script_sha256":"e3092898f55177ed4f4cb59752b4a0aa57017acc779523e38ddec08889f2a394"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC21 · ballot —— 捕获知识而非重造。
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
  narrative_job: "捕获知识而非重造",
  stage: {
    kind: "ballot",
    focus: [0, 38, 76],
    pick: 1,
    items: [
      {id: "b1", icon: "grid", text: "每个用例重造"},
      {id: "b2", icon: "db", text: "捕获程序性知识"},
      {id: "b3", icon: "person", text: "专门化 agent"},
    ],
  },
};

export function SC21({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
