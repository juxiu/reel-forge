import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC16 · reshape —— 口令被压成摘要。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC16",
  variant: "transformation",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  hero_role: "transform",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "reshape",
      focus: [0,44,88],
      caption: "口令不经过网络",
      from_icon: "key",
      to_icon: "shield",
      items: [
        {id: "f1", icon: "key", text: "口令"},
        {id: "f2", icon: "wave", text: "摘要"},
        {id: "f3", icon: "shield", text: "校验"},
      ],
    },
};

export function SC16({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
