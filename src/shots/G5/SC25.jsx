import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G5_STAGE} from "./stage.jsx";

/**
 * SC25 · comparetable —— 有没有计数器的差别。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC25",
  variant: "comparison",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  hero_role: "replay",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "comparetable",
      focus: [0,40,80],
      winner: 1,
      caption: "计数器挡掉重放",
      left_label: "无计数器",
      right_label: "有计数器",
      items: [
        {id: "x1", icon: "clock", text: "可原样重放"},
        {id: "x2", icon: "shield", text: "序号必须递增"},
        {id: "x3", icon: "wave", text: "窗口仍有限"},
        {id: "x4", icon: "shield", text: "过期即拒绝"},
      ],
    },
};

export function SC25({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G5_STAGE} />;
}
