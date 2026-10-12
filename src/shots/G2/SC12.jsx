// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-012","script_sha256":"945cea744408cc220b0be414c5e6b3dd8d3d113a14f74ac8d5523f2ef6fad5df"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC12 · reshape —— 通用能力不等于能干活。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC12",
  variant: "transformation",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "通用能力不等于能干活",
  stage: {
    kind: "reshape",
    focus: [0, 38],
    from_icon: "chip",
    to_icon: "doc",
    from_sub: "只有通用能力",
    to_sub: "缺真实工作法",
    items: [
      {id: "f", icon: "chip", text: "通用能力"},
      {id: "t", icon: "doc", text: "程序性知识"},
    ],
  },
};

export function SC12({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
