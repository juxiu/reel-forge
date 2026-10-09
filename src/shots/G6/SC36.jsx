import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G6_STAGE} from "./stage.jsx";

/**
 * SC36 · reshape —— 共享密钥变成每跳密钥。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC36",
  variant: "transformation",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  hero_role: "keyrotate",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "reshape",
      focus: [0,44,88],
      from_sub: "一处泄露全丢",
    to_sub: "可单独收回",
    caption: "共享密钥变成每跳一把",
      from_icon: "key",
      to_icon: "branch",
      items: [
        {id: "m1", icon: "key", text: "共享密钥"},
        {id: "m2", icon: "branch", text: "每跳密钥"},
        {id: "m3", icon: "shield", text: "可单独撤回"},
      ],
    },
};

export function SC36({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G6_STAGE} />;
}
