import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC21 · orbit —— 谁有权定义字段顺序。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC21",
  variant: "network",
  hero_size: 210,
  camera: "push",
  settle_frames: 30,
  hero_role: "authority",
  mirror: false,
  support_count: 4,
  accent_index: 0,
  stage: {
      kind: "orbit",
      focus: [40,76,112],
      rx: 396,
      ry: 176,
      cx: 640,
      cy: 382,
      icon: "grid",
      label: "字段顺序",
      items: [
        {id: "p1", icon: "doc", text: "规范"},
        {id: "p2", icon: "person", text: "客户端"},
        {id: "p3", icon: "db", text: "服务端"},
        {id: "p4", icon: "gauge", text: "测试向量"},
      ],
    },
};

export function SC21({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
