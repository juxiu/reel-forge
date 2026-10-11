import React from "react";
import {Ballot, CompareTable, Orbit, Pipeline3, Reshape, Terminal} from "../stage-kit.jsx";

/**
 * G3 组舞台（第 3 章 · 运行）。
 *
 * 本组只声明**镜头 → 拓扑**的映射与用了哪几种拓扑；拓扑骨架实现在 src/shots/stage-kit.jsx，
 * 几何与文案在各自镜头的 recipe.stage 里。组内拓扑互不重复（verify:authored-shots 按 kind 去重）。
 * ⚠ 离场 / 运镜 / 扫光白名单不在这里 —— 那些由 SemanticShot 在外层统一施加。
 */
export const G3_STAGE = {
  group: "G3",
  chapter: "第 3 章 · 运行",
  topologies: ["pipeline3","ballot","reshape","terminal","comparetable","orbit"],
  components: {
    SC13: Pipeline3,
    SC14: Ballot,
    SC15: Reshape,
    SC16: Terminal,
    SC17: CompareTable,
    SC18: Orbit,
  },
};

export default G3_STAGE;
