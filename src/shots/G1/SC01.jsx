import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC01 · 开场钩子 —— 一次摘要认证牵涉到哪些角色。
 *
 * 拓扑 radial：中心是认证节点（主角，210px，带紫柔光 + 脚环 + 入场冒星），
 * 六个卫星（客户端 / 代理 / 时钟 / 数据库 / 观测 / 攻击面）环绕并由辐条连到中心。
 *
 * ⚠ stage.items 只声明**拓扑与文案**，不声明入场帧：入场帧一律由 buildPlan 从字幕块推出，
 *   所以本镜的节拍与语义镜头同源，QC 判的 −6…+3 窗口对它同样成立。
 * ⚠ stage.focus 是**相对入场帧的偏移**，不是绝对帧 —— 换片子换字幕时焦点交接自动跟着首句走。
 * ⚠ 卫星顺序即辐条顺序，改动 items 会同时改画面拓扑，这是有意的：拓扑与内容不许脱钩。
 */
export const SHOT_RECIPE = {
  shot_id: "SC01",
  variant: "network",
  hero_size: 210,
  camera: "pan",
  settle_frames: 30,
  hero_role: "hook",
  mirror: false,
  support_count: 6,
  accent_index: 0,
  stage: {
    kind: "radial",
    hub: {cx: 640, cy: 372},
    rx: 448,
    ry: 196,
    icon: "shield",
    label: "HTTP Digest Fields",
    focus: [46, 84, 122],
    items: [
      {id: "client", icon: "person", text: "客户端"},
      {id: "proxy", icon: "link", text: "中间代理"},
      {id: "clock", icon: "clock", text: "时钟漂移"},
      {id: "store", icon: "db", text: "共享密钥"},
      {id: "observe", icon: "gauge", text: "重放窗口"},
      {id: "threat", icon: "branch", text: "篡改风险"},
    ],
  },
};

export function SC01({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}