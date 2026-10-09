import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC12 · splitrows —— 两侧各自负责什么。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC12",
  variant: "split",
  hero_size: 190,
  camera: "push",
  settle_frames: 30,
  hero_role: "division",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "splitrows",
      focus: [0,40,80],
      winner: 1,
      caption: "职责落在两侧",
      left_label: "客户端做的",
      right_label: "服务端做的",
      items: [
        {id: "d1", icon: "key", text: "算摘要"},
        {id: "d2", icon: "scale", text: "比对摘要"},
        {id: "d3", icon: "shield", text: "生成挑战"},
        {id: "d4", icon: "shield", text: "返回结果"},
      ],
    },
};

export function SC12({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
