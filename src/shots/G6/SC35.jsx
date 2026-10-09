import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G6_STAGE} from "./stage.jsx";

/**
 * SC35 · comparetable —— 两种覆盖范围对照。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC35",
  variant: "comparison",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "coverage",
  mirror: false,
  support_count: 2,
  accent_index: 0,
  stage: {
      kind: "comparetable",
      focus: [0,40],
      winner: 1,
      caption: "差别在链路长度",
      left_label: "覆盖一跳",
      right_label: "覆盖整条链",
      items: [
        {id: "b1", icon: "wave", text: "代理可读原文"},
        {id: "b2", icon: "lock", text: "全程不可读原文"},
      ],
    },
};

export function SC35({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G6_STAGE} />;
}
