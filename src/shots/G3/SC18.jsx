import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC18 · causechain —— 弱算法被淘汰的因果。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC18",
  variant: "causal",
  hero_size: 190,
  camera: "push",
  settle_frames: 30,
  hero_role: "deprecation",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "causechain",
      focus: [0,38,76],
      caption: "为什么弱算法被弃用",
      items: [
        {id: "w1", icon: "wave", text: "长度可被穷举"},
        {id: "w2", icon: "branch", text: "碰撞更易构造"},
        {id: "w3", icon: "shield", text: "逐步淘汰"},
      ],
    },
};

export function SC18({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
