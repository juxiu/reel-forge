import React from "react";
import {Ballot, CompareTable, LayerStack, Orbit, Reshape, SplitRows} from "../stage-kit.jsx";

/**
 * G6 组舞台（第 6 章 · 代理链上的麻烦）。
 *
 * 本组只声明**镜头 → 拓扑**的映射与用了哪几种拓扑；拓扑的骨架实现在 src/shots/stage-kit.jsx，
 * 几何与文案在各自镜头的 recipe.stage 里。三者分工固定，于是：
 *   · 镜头文件看得出「这一镜摆成什么样、谁是焦点、焦点何时交接」；
 *   · 套件里只有一份 focusWalk / 槽位 / 轨道，「紫只给当前重点」不会在第 5 组悄悄失效；
 *   · 组内拓扑互不重复（verify:authored-shots 按 kind 去重）。
 *
 * ⚠ 离场 / 运镜 / 扫光白名单不在这里 —— 那些由 SemanticShot 在外层统一施加，
 *    舞台只负责画面内容，所以组里无法私开扫光。
 */
export const G6_STAGE = {
  group: "G6",
  chapter: "第 6 章 · 代理链上的麻烦",
  topologies: ["orbit","splitrows","ballot","layerstack","comparetable","reshape"],
  components: {
    SC31: Orbit,
    SC32: SplitRows,
    SC33: Ballot,
    SC34: LayerStack,
    SC35: CompareTable,
    SC36: Reshape,
  },
};

export default G6_STAGE;
