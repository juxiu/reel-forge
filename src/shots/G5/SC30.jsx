import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G5_STAGE} from "./stage.jsx";

/**
 * SC30 · terminal —— 计数器相关字段。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC30",
  variant: "code",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  hero_role: "counter",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "terminal",
      focus: [0,34,68],
      caption: "每次请求都要变的东西",
      title: "nonce count",
      items: [
        {id: "n1", icon: "clock", text: "nc 每次自增"},
        {id: "n2", icon: "wave", text: "cnonce 每次随机"},
        {id: "n3", icon: "lock", text: "qop 固定取值"},
      ],
    },
};

export function SC30({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G5_STAGE} />;
}
