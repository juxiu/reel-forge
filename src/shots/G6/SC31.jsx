import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G6_STAGE} from "./stage.jsx";

/**
 * SC31 · orbit —— 代理在链上的位置。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC31",
  variant: "network",
  hero_size: 210,
  camera: "pan",
  settle_frames: 30,
  hero_role: "proxies",
  mirror: false,
  support_count: 5,
  accent_index: 0,
  stage: {
      kind: "orbit",
      focus: [40,78,116],
      rx: 356,
      ry: 140,
      cx: 640,
      cy: 380,
      icon: "link",
      label: "代理链",
      items: [
        {id: "v1", icon: "person", text: "客户端"},
        {id: "v2", icon: "link", text: "第一跳"},
        {id: "v3", icon: "branch", text: "中间代理"},
        {id: "v4", icon: "db", text: "服务端"},
        {id: "v5", icon: "gauge", text: "缓存"},
      ],
    },
};

export function SC31({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G6_STAGE} />;
}
