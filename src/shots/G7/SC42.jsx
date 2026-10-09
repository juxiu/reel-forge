import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G7_STAGE} from "./stage.jsx";

/**
 * SC42 · splitrows —— 两侧各自的代价。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC42",
  variant: "split",
  hero_size: 190,
  camera: "push",
  settle_frames: 30,
  hero_role: "costside",
  mirror: false,
  support_count: 2,
  accent_index: 0,
  stage: {
      kind: "splitrows",
      focus: [0,40],
      winner: 0,
      caption: "代价落在两侧",
      left_label: "客户端代价",
      right_label: "服务端代价",
      items: [
        {id: "i1", icon: "key", text: "多存一次摘要"},
        {id: "i2", icon: "wave", text: "多算一次摘要"},
      ],
    },
};

export function SC42({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G7_STAGE} />;
}
