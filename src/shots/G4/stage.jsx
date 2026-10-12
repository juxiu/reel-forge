import React from "react";
import {Ballot, CauseChain, CiteSide, Ladder, Reshape, SplitRows} from "../stage-kit.jsx";

/**
 * G4 组舞台（第 4 章 · 技能的形状）。
 *
 * 本组只声明**镜头 → 拓扑**的映射与用了哪几种拓扑；拓扑骨架实现在 src/shots/stage-kit.jsx，
 * 几何与文案在各自镜头的 recipe.stage 里。组内拓扑互不重复（verify:authored-shots 按 kind 去重）。
 * ⚠ 离场 / 运镜 / 扫光白名单不在这里 —— 那些由 SemanticShot 在外层统一施加。
 */
export const G4_STAGE = {
  group: "G4",
  chapter: "第 4 章 · 技能的形状",
  topologies: ["citeside","ladder","ballot","reshape","splitrows","causechain"],
  components: {
    SC19: CiteSide,
    SC20: Ladder,
    SC21: Ballot,
    SC22: Reshape,
    SC23: SplitRows,
    SC24: CauseChain,
  },
};

export default G4_STAGE;
