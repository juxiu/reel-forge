// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-015","script_sha256":"14b39c8e6174864ced22a766f783fc48568f61f6e0df0abfbdfaf9fb04546160"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC15 · reshape —— 只加载最小的那一部分。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC15",
  variant: "transformation",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  narrative_job: "只加载最小的那一部分",
  stage: {
    kind: "reshape",
    focus: [0, 38],
    from_icon: "db",
    to_icon: "chunk",
    from_sub: "一千行文档",
    to_sub: "响应还很快",
    items: [
      {id: "f", icon: "db", text: "全部内容"},
      {id: "t", icon: "chunk", text: "最小片段"},
    ],
  },
};

export function SC15({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
