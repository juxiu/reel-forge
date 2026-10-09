import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC15 · comparetable —— 新旧字段写法逐项对照。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC15",
  variant: "comparison",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  hero_role: "compare",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "comparetable",
      focus: [0,40,80],
      winner: 1,
      caption: "字段名的变化",
      left_label: "旧写法",
      right_label: "新写法",
      items: [
        {id: "r1", icon: "chip", text: "algorithm 缺省"},
        {id: "r2", icon: "shield", text: "algorithm 必填"},
        {id: "r3", icon: "person", text: "无 userhash"},
        {id: "r4", icon: "key", text: "可带 userhash"},
      ],
    },
};

export function SC15({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
