// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-010","script_sha256":"5aaf4682b8b3d152694ae535487ee55556c88e9b0a4d4586607b4253aff13755"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC10 · citeside —— 写技能像给新同事写入职指南。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC10",
  variant: "evidence",
  hero_size: 195,
  camera: "push",
  settle_frames: 30,
  narrative_job: "写技能像给新同事写入职指南",
  stage: {
    kind: "citeside",
    focus: [0, 38, 76],
    main_icon: "person",
    items: [
      {id: "m", icon: "person", text: "入职指南"},
      {id: "c1", icon: "clock", text: "什么时候用它"},
      {id: "c2", icon: "funnel", text: "把踩过的坑写清"},
      {id: "c3", icon: "grid", text: "不用再踩一遍"},
    ],
  },
};

export function SC10({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
