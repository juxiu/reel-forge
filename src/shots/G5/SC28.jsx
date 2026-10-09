import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G5_STAGE} from "./stage.jsx";

/**
 * SC28 · causechain —— 时钟漂移导致失败的因果。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC28",
  variant: "causal",
  hero_size: 190,
  camera: "pan",
  settle_frames: 30,
  hero_role: "clockfail",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "causechain",
      focus: [0,38,76],
      caption: "时钟偏了就会失败",
      items: [
        {id: "k1", icon: "clock", text: "客户端时钟偏快"},
        {id: "k2", icon: "branch", text: "服务端判定过期"},
        {id: "k3", icon: "branch", text: "请求被拒"},
      ],
    },
};

export function SC28({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G5_STAGE} />;
}
