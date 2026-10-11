// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-022","script_sha256":"852e3d160b89a41bf06cce44650bc952ad146ffecb257ef55398aadf8f33ffe7"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G4_STAGE} from "./stage.jsx";

/**
 * SC22 · reshape —— 把专长打包成能力。
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
  narrative_job: "把专长打包成能力",
  stage: {
    kind: "reshape",
    focus: [0, 38],
    // to_icon grid→shield：网格线塞进圆形 = 审计问题 3「方格纸被圈住」；shield=能力/专长，
    // 与「把专长打包成能力」的语义对位，圆形内只留一枚居中图标。
    from_icon: "person",
    to_icon: "shield",
    from_sub: "每个场景各造一个",
    to_sub: "长出专才分支",
    items: [
      {id: "f", icon: "person", text: "碎片技能"},
      {id: "t", icon: "shield", text: "通用能力"},
    ],
  },
};

export function SC22({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G4_STAGE} />;
}
