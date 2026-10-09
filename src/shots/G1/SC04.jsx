import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC04 · 归一 —— 四层字段挂在一条纵轨上。
 *
 * 拓扑 rail4：右侧一条竖轨（draw-on 虚线）串起四个节点，四层字段块挂在节点左侧，
 * 视线沿轨道下行。这是本组唯一有「贯穿性纵向结构」的构图。
 *
 * ⚠ 轨道与节点先于字段出现（trackProgress 由入场帧推），字段逐个挂上去；
 *   轨道进度与字段 f0 用同一套 plan 节拍，不会出现「轨道画完了字段还没到」。
 */
export const SHOT_RECIPE = {
  shot_id: "SC04",
  variant: "structured",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  hero_role: "unification",
  mirror: true,
  support_count: 4,
  accent_index: 3,
  stage: {
    kind: "rail4",
    caption: "四层字段共用一条校验链",
    focus: [0, 34, 68, 102],
    items: [
      {id: "f1", icon: "doc", text: "method + uri"},
      {id: "f2", icon: "clock", text: "nonce + nc"},
      {id: "f3", icon: "key", text: "cnonce + qop"},
      {id: "f4", icon: "lock", text: "response hash"},
    ],
  },
};

export function SC04({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}