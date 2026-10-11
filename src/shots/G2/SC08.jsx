// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-008","script_sha256":"ab2b9f0b4721b6a5ba46bd6ca86c8f7008870181f2e8b3d592d646e029330f5b"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC08 · orbit —— 三个目录各管一件事。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC08",
  variant: "network",
  hero_size: 210,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "三个目录各管一件事",
  stage: {
    kind: "orbit",
    focus: [0, 38, 76],
    icon: "grid",
    label: "技能目录",
    cx: 640,
    cy: 350,
    rx: 400,
    ry: 150,
    items: [
      {id: "o1", icon: "chip", text: "能跑的代码"},
      {id: "o2", icon: "db", text: "沉淀的文档"},
      {id: "o3", icon: "rack", text: "模板与素材"},
    ],
  },
};

export function SC08({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
