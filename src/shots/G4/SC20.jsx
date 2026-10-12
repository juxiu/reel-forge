// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-020","script_sha256":"0ebcbc9b48ef629acab9dc0b778917282afef871497ad0f160192fd3a21a1f62"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC20 · ladder —— 装入专长，通用变专用。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC20",
  variant: "sequence",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "装入专长，通用变专用",
  stage: {
    kind: "ladder",
    focus: [0, 38, 76],
    items: [
      {id: "l1", icon: "person", text: "通用 agent"},
      {id: "l2", icon: "grid", text: "装入专长"},
      {id: "l3", icon: "key", text: "变成专用 agent"},
    ],
  },
};

export function SC20({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
