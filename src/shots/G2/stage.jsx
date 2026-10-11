import React from "react";
import {CiteSide, CompareTable, Ladder, LayerStack, Orbit, Reshape} from "../stage-kit.jsx";

/**
 * G2 组舞台（第 2 章 · 结构）。
 *
 * 本组只声明**镜头 → 拓扑**的映射与用了哪几种拓扑；拓扑骨架实现在 src/shots/stage-kit.jsx，
 * 几何与文案在各自镜头的 recipe.stage 里。组内拓扑互不重复（verify:authored-shots 按 kind 去重）。
 * ⚠ 离场 / 运镜 / 扫光白名单不在这里 —— 那些由 SemanticShot 在外层统一施加。
 */
export const G2_STAGE = {
  group: "G2",
  chapter: "第 2 章 · 结构",
  topologies: ["layerstack","orbit","comparetable","citeside","ladder","reshape"],
  components: {
    SC07: LayerStack,
    SC08: Orbit,
    SC09: CompareTable,
    SC10: CiteSide,
    SC11: Ladder,
    SC12: Reshape,
  },
};

export default G2_STAGE;
