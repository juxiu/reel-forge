// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-022","script_sha256":"d457549f4c7f2241a8c09b1b7d92b5095c41a79c4d47b20567647e4a9fd54853"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC22 · reshape —— 开放标准跨平台。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC22",
  variant: "transformation",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "开放标准跨平台",
  stage: {
    kind: "reshape",
    focus: [0, 38],
    from_icon: "lock",
    to_icon: "link",
    from_sub: "绑定一家平台",
    to_sub: "标准跨平台移植",
    items: [
      {id: "f", icon: "lock", text: "私有绑定"},
      {id: "t", icon: "link", text: "开放标准"},
    ],
  },
};

export function SC22({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
