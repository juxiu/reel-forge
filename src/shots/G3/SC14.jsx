// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-014","script_sha256":"44581573eeccf5a7c61371322e5dda2d7ea226e7a34b2a5f590e59b91e35a6b1"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC14 · ballot —— 例证 Claude Code。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC14",
  variant: "preference",
  hero_size: 185,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "例证 Claude Code",
  stage: {
    kind: "ballot",
    focus: [0, 38, 76],
    pick: 0,
    items: [
      {id: "b1", icon: "chip", text: "Claude Code"},
      {id: "b2", icon: "doc", text: "本地代码执行"},
      {id: "b3", icon: "db", text: "文件系统"},
    ],
  },
};

export function SC14({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
