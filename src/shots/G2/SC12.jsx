// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-012","script_sha256":"cecbb131fc1816220d755822ee62ed2ff5f81911985837caf1ccd0657fe0ecd2"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G2_STAGE} from "./stage.jsx";

/**
 * SC12 · reshape —— 常驻的只有一小段描述。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC12",
  variant: "transformation",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "常驻的只有一小段描述",
  stage: {
    kind: "reshape",
    focus: [0, 38],
    from_icon: "doc",
    to_icon: "grid",
    from_sub: "所有资料都挂着",
    to_sub: "窗口不再塞满",
    items: [
      {id: "f", icon: "doc", text: "全量常驻"},
      {id: "t", icon: "grid", text: "小段描述"},
    ],
  },
};

export function SC12({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G2_STAGE} />;
}
