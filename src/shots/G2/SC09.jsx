import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC09 · citeside —— 主张在左，出处在右扇出。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC09",
  variant: "evidence",
  hero_size: 195,
  camera: "push",
  settle_frames: 30,
  hero_role: "evidence",
  mirror: false,
  support_count: 3,
  accent_index: 0,
  stage: {
      kind: "citeside",
      focus: [0,44],
      caption: "事实与出处",
      main_icon: "shield",
      cite_icons: ["doc","gauge"],
      items: [
        {id: "m", icon: "shield", text: "摘要是 HTTP 里可选的认证机制"},
        {id: "s1", icon: "doc", text: "规范定义字段与算法"},
        {id: "s2", icon: "gauge", text: "示例语境取自摘要规范"},
      ],
    },
};

export function SC09({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
