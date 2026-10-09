import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G6_STAGE} from "./stage.jsx";

/**
 * SC32 · splitrows —— 逐跳与端到端。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC32",
  variant: "split",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "scope",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "splitrows",
      focus: [0,40,80],
      winner: 1,
      caption: "覆盖范围不同",
      left_label: "逐跳摘要",
      right_label: "端到端摘要",
      items: [
        {id: "u1", icon: "link", text: "每跳各自计算"},
        {id: "u2", icon: "shield", text: "整条链只算一次"},
        {id: "u3", icon: "wave", text: "只能覆盖一段"},
        {id: "u4", icon: "shield", text: "覆盖整条链"},
      ],
    },
};

export function SC32({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G6_STAGE} />;
}
