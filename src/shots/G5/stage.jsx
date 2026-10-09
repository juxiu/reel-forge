import React from "react";
import {CauseChain, CiteSide, CompareTable, Ladder, Reshape, Terminal} from "../stage-kit.jsx";

/**
 * G5 组舞台（第 5 章 · 重放与时钟）。
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
export const G5_STAGE = {
  group: "G5",
  chapter: "第 5 章 · 重放与时钟",
  topologies: ["comparetable","reshape","ladder","causechain","citeside","terminal"],
  components: {
    SC25: CompareTable,
    SC26: Reshape,
    SC27: Ladder,
    SC28: CauseChain,
    SC29: CiteSide,
    SC30: Terminal,
  },
};

export default G5_STAGE;
