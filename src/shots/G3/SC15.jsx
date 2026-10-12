// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-015","script_sha256":"edd641669f5faca68dbbf811b0aa1751bc569491aad2bbc7e0173607bb5b9a7b"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC15 · reshape —— 越强大越需要领域专长。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC15",
  variant: "transformation",
  hero_size: 200,
  camera: "push",
  settle_frames: 30,
  narrative_job: "越强大越需要领域专长",
  stage: {
    kind: "reshape",
    focus: [0, 38],
    from_icon: "person",
    to_icon: "shield",
    from_sub: "越强大的通用能力",
    to_sub: "越要可组合的专长",
    items: [
      {id: "f", icon: "person", text: "通用能力"},
      {id: "t", icon: "shield", text: "领域专长"},
    ],
  },
};

export function SC15({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
