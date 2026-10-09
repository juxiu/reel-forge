import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC07 · pipeline3 —— 挑战—回应—校验三步推进。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC07",
  variant: "sequence",
  hero_size: 190,
  camera: "push",
  settle_frames: 30,
  hero_role: "handshake",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "pipeline3",
      focus: [0,40,80],
      caption: "摘要认证要走完这三步",
    subs: ["服务端发起挑战", "客户端算出摘要", "服务端比对结果"],
      items: [
        {id: "s1", icon: "shield", text: "挑战"},
        {id: "s2", icon: "key", text: "回应"},
        {id: "s3", icon: "shield", text: "校验"},
      ],
    },
};

export function SC07({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
