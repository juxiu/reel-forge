import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G7_STAGE} from "./stage.jsx";

/**
 * SC40 · terminal —— 配置长什么样。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC40",
  variant: "code",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  hero_role: "config",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "terminal",
      focus: [0,34,68],
      caption: "落到配置上",
      title: "配置片段",
      items: [
        {id: "g1", icon: "chip", text: "algorithm=强摘要"},
        {id: "g2", icon: "lock", text: "qop=auth"},
        {id: "g3", icon: "clock", text: "nc 每次自增"},
      ],
    },
};

export function SC40({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G7_STAGE} />;
}
