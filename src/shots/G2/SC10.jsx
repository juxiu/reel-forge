import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC10 · terminal —— 报文里的认证头长什么样。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（−6…+3 窗口），所以本镜节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 */
export const SHOT_RECIPE = {
  shot_id: "SC10",
  variant: "code",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  hero_role: "wire",
  mirror: false,
  support_count: 5,
  accent_index: 0,
  stage: {
      kind: "terminal",
      focus: [0,36,72],
      caption: "客户端发出的那一行",
      title: "GET /orders HTTP/1.1",
      items: [
        {id: "t1", icon: "doc", text: "Authorization: Digest"},
        {id: "t2", icon: "person", text: "username=\"Mufasa\""},
        {id: "t3", icon: "grid", text: "realm=\"testrealm\""},
        {id: "t4", icon: "link", text: "uri=\"/orders\""},
        {id: "t5", icon: "clock", text: "qop, nc, cnonce"},
      ],
    },
};

export function SC10({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
