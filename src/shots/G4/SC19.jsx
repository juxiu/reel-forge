import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC19 · citeside —— 规范化依据在规范里。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC19",
  variant: "evidence",
  hero_size: 195,
  camera: "pan",
  settle_frames: 30,
  hero_role: "evidence",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "citeside",
      focus: [0,44],
      caption: "顺序为什么有讲究",
      main_icon: "doc",
      cite_icons: ["doc","scale"],
      items: [
        {id: "m", icon: "doc", text: "两侧必须按同一顺序拼接"},
        {id: "s1", icon: "doc", text: "规范给出规范串定义"},
        {id: "s2", icon: "scale", text: "顺序错则摘要不等"},
      ],
    },
};

export function SC19({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
