// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-001","script_sha256":"826855d44c7691fda0d29476857a532690b91f1703725259336f0be16d472338"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC01 · pipeline3 —— 同一个词，多种定义。
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
  narrative_job: "同一个词，多种定义",
  stage: {
    kind: "pipeline3",
    focus: [0, 38, 76],
    subs: ["同一个词","几种定义","先分清再谈"],
    items: [
      {id: "s1", icon: "chip", text: "同一个词"},
      {id: "s2", icon: "branch", text: "几种定义"},
      {id: "s3", icon: "key", text: "先分清"},
    ],
  },
};

export function SC01({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
