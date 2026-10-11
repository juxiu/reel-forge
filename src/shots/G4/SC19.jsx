// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-019","script_sha256":"c9ba0c3c66f5794c68929554c6fa0a5f5aee19ab7f4f28125f2f3df622625b58"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC19 · citeside —— 技能没被触发，九成是描述没写好。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC19",
  variant: "causal",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "技能没被触发，九成是描述没写好",
  stage: {
    kind: "citeside",
    focus: [0, 38, 76],
    main_icon: "funnel",
    items: [
      {id: "m", icon: "funnel", text: "九成是描述没写好"},
      {id: "c1", icon: "doc", text: "描述写得含糊"},
      {id: "c2", icon: "clock", text: "没有触发时机"},
      {id: "c3", icon: "shield", text: "等于不存在"},
    ],
  },
};

export function SC19({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
