import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC02 · 机制 —— 报文原文如何变成可校验的字段。
 *
 * 拓扑 split2col：左栏「原始报文」是灰的等宽文本行，右栏「解析字段」是紫框白字，
 * 中间一道 draw-on 箭头。这是**有方向的转换**，与 SC05 的并置对比在拓扑上相反。
 *
 * ⚠ 奇偶分栏：items 按下标奇偶分左右，所以 items 的**顺序**就是版式，改顺序会换布局（有意的耦合）。
 * ⚠ 右栏整体带紫框与 glow —— 但紫色只给这一栏（当前重点），左栏一律灰。
 * ⚠ 左栏第三行原本写 `nc=00000001`：verify:text-provenance 判它「数字无出处」且白名单豁免不了。
 *   报文结构可以讲，但具体计数值属于「调研没核实就不上画面」，所以这里只留字段名 `nc`。
 */
export const SHOT_RECIPE = {
  shot_id: "SC02",
  variant: "split",
  hero_size: 190,
  camera: "parallax",
  settle_frames: 30,
  hero_role: "mechanism",
  mirror: true,
  support_count: 6,
  accent_index: 1,
  stage: {
    kind: "split2col",
    left_label: "原始报文",
    right_label: "解析字段",
    items: [
      {id: "l1", icon: "doc", text: "GET /orders"},
      {id: "r1", icon: "key", text: "username"},
      {id: "l2", icon: "doc", text: "Authorization:"},
      {id: "r2", icon: "chunk", text: "realm"},
      {id: "l3", icon: "doc", text: "nc"},
      {id: "r3", icon: "lock", text: "cnonce"},
    ],
  },
};

export function SC02({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}