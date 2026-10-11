// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-024","script_sha256":"08bde88c7ddf50b301671f16d16d2336d68e34f330eb0ee17b435f2bfc6d7772"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC24 · causechain —— 技能是一份能被执行的方法论。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC24",
  variant: "causal",
  hero_size: 190,
  camera: "push",
  settle_frames: 30,
  narrative_job: "技能是一份能被执行的方法论",
  stage: {
    kind: "causechain",
    focus: [0, 38, 76],
    items: [
      {id: "c1", icon: "grid", text: "从一个文件夹开始"},
      {id: "c2", icon: "branch", text: "装的是方法论"},
      {id: "c3", icon: "person", text: "也是入职指南"},
    ],
  },
};

export function SC24({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
