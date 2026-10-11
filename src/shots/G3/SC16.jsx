// reel-forge-source: {"project_id":"skill-explainer","script_id":"seg-016","script_sha256":"7b6fbde19dffa079b0f626822c4d56913800d312ed5c7ae1901690d8dc9efaff"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G3_STAGE} from "./stage.jsx";

/**
 * SC16 · terminal —— 真正干活的是脚本。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC16",
  variant: "code",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "真正干活的是脚本",
  stage: {
    kind: "terminal",
    focus: [0, 38, 76],
    title: "run.sh",
    items: [
      {id: "t1", icon: undefined, text: "$ skill run scripts/collect.py"},
      {id: "t2", icon: undefined, text: "-> 读取本地文件系统"},
      {id: "t3", icon: undefined, text: "-> 写回结构化结论"},
    ],
  },
};

export function SC16({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G3_STAGE} />;
}
