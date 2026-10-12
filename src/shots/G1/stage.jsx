import React from "react";
import {CauseChain, CompareTable, LayerStack, Orbit, Pipeline3, SplitRows} from "../stage-kit.jsx";

/**
 * G1 组舞台（第 1 章 · 什么是 Agent）。
 *
 * 本组只声明**镜头 → 拓扑**的映射与用了哪几种拓扑；拓扑骨架实现在 src/shots/stage-kit.jsx，
 * 几何与文案在各自镜头的 recipe.stage 里。组内拓扑互不重复（verify:authored-shots 按 kind 去重）。
 * ⚠ 离场 / 运镜 / 扫光白名单不在这里 —— 那些由 SemanticShot 在外层统一施加。
 */
export const G1_STAGE = {
  group: "G1",
  chapter: "第 1 章 · 什么是 Agent",
  topologies: ["pipeline3","causechain","comparetable","layerstack","splitrows","orbit"],
  components: {
    SC01: Pipeline3,
    SC02: CauseChain,
    SC03: CompareTable,
    SC04: LayerStack,
    SC05: SplitRows,
    SC06: Orbit,
  },
};

export default G1_STAGE;
