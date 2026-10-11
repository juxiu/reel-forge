// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-006","script_sha256":"9f6981d5bfdffb0afa21242444039827a4314693bab4d25f999f1fd6e8a9ec81"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC06 · orbit —— 开放标准，换个平台不用重写。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC06",
  variant: "network",
  hero_size: 210,
  camera: "push",
  settle_frames: 30,
  narrative_job: "开放标准，换个平台不用重写",
  stage: {
    kind: "orbit",
    focus: [0, 38, 76],
    icon: "wave",
    label: "开放标准",
    cx: 640,
    cy: 350,
    rx: 400,
    ry: 150,
    items: [
      {id: "o1", icon: "rack", text: "跨平台"},
      {id: "o2", icon: "link", text: "同一格式"},
      {id: "o3", icon: "grid", text: "免重写"},
    ],
  },
};

export function SC06({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
