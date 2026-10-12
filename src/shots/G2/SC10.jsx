// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-010","script_sha256":"e497962e28b4b0ad54a3d65583a65bcb54d0e351549d4f93caaa4f7dfa04bdd0"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC10 · citeside —— 用可组合能力完成专门化。
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
  narrative_job: "用可组合能力完成专门化",
  stage: {
    kind: "citeside",
    focus: [0, 38, 76],
    main_icon: "person",
    items: [
      {id: "m", icon: "person", text: "定制 agent"},
      {id: "c1", icon: "grid", text: "每个场景造一个"},
      {id: "c2", icon: "branch", text: "可组合能力"},
      {id: "c3", icon: "key", text: "按需专门化"},
    ],
  },
};

export function SC10({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
