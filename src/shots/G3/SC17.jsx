// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-017","script_sha256":"30f5997c91c2cf2aa69129899f495fdd98b6b684271ade55b98ef42c4590b2bf"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC17 · comparetable —— 专长从散落提示词到资源包。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC17",
  variant: "comparison",
  hero_size: 200,
  camera: "parallax",
  settle_frames: 30,
  narrative_job: "专长从散落提示词到资源包",
  stage: {
    kind: "comparetable",
    focus: [0, 38, 76],
    left_label: "散落提示词",
    right_label: "打包资源",
    winner: 1,
    items: [
      {id: "l1", icon: "doc", text: "用完就散"},
      {id: "r1", icon: "grid", text: "可组合资源"},
      {id: "l2", icon: "clock", text: "重复粘贴"},
      {id: "r2", icon: "link", text: "随取随用"},
    ],
  },
};

export function SC17({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
