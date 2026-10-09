import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC06 · 转换 —— 报文变成摘要，本章落点。
 *
 * 拓扑 beforeafter：两个倾斜平面（TiltPlane）一前一后，中间传送轨道 + 行进光点，
 * 三个词（原文 / 摘要 / 通过）依次亮起，收在右侧一枚通过标记上。
 * 这是全组唯一的斜置构图，也是唯一以 ✓ 收尾的拓扑。
 *
 * ⚠ 第三个词是**终态**：它不是「出现」，而是随 travel 从 0 长到 1（到达才算），
 *   所以它必须排在原文与摘要之后 —— items 的顺序即因果顺序。
 * ⚠ 两个平面的 skew / sy 一致：斜置是这一镜的视觉语法，不是随手加的装饰。
 */
export const SHOT_RECIPE = {
  shot_id: "SC06",
  variant: "transformation",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  hero_role: "transform",
  mirror: true,
  support_count: 3,
  accent_index: 0,
  stage: {
    kind: "beforeafter",
    before_label: "原始报文",
    after_label: "摘要 + 校验值",
    caption: "服务器只回一个摘要，密码仍不经过网络",
    focus: [0, 48, 96],
    items: [
      {id: "t1", icon: "doc", text: "原文"},
      {id: "t2", icon: "wave", text: "摘要"},
      {id: "t3", icon: "lock", text: "通过"},
    ],
  },
};

export function SC06({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}