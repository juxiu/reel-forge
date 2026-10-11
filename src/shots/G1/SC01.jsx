// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-001","script_sha256":"9edc8b9ba13482f2066fdfc89b6bfa87fce5168d14d5fc3102086ab6810bfb78"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC01 · pipeline3 —— 通用 Agent 缺的是方法。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC01",
  variant: "sequence",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "通用 Agent 缺的是方法",
  stage: {
    kind: "pipeline3",
    focus: [0, 38, 76],
    subs: ["能干活","到你的领域就不够","把专长装进一个容器"],
    items: [
      {id: "s1", icon: "chip", text: "通用能力"},
      {id: "s2", icon: "funnel", text: "领域缺口"},
      {id: "s3", icon: "grid", text: "技能容器"},
    ],
  },
};

export function SC01({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
