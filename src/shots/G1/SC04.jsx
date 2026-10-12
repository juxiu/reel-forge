// reel-forge-source: {"project_id":"skill-agent-c6ecb8f0e11e","script_id":"seg-004","script_sha256":"b14a814512c40aec3546a88656f4faac9709e8c92163866811cfea3fa0cef26b"}
import React from "react";
import {ExplainerShot} from "../Shot.jsx";
import {G1_STAGE} from "./stage.jsx";

/**
 * SC04 · layerstack —— 统一归类，划一条分界线。
 *
 * 拓扑骨架在 ../stage-kit.jsx，本镜的摆法（几何 / 文案 / 焦点拍）全在下面这个 stage 里。
 * ⚠ 不声明入场帧：入场帧由 buildPlan 从字幕块推出（-6…+3 窗口），节拍与语义镜头同源。
 * ⚠ focus 存的是**相对入场帧的偏移**，换字幕块时焦点交接自动跟着首句走。
 * ⚠ hero_size / camera / variant / settle_frames 必须与 fixtures/reference-shot-blueprint.json 逐字段一致。
 */
export const SHOT_RECIPE = {
  shot_id: "SC04",
  variant: "structured",
  hero_size: 200,
  camera: "pan",
  settle_frames: 30,
  narrative_job: "统一归类，划一条分界线",
  stage: {
    kind: "layerstack",
    focus: [0, 38, 76],
    items: [
      {id: "a1", icon: "doc", text: "统称 agentic systems"},
      {id: "a2", icon: "branch", text: "架构分界线"},
      {id: "a3", icon: "key", text: "两种走法"},
    ],
  },
};

export function SC04({scene}) {
  return <ExplainerShot scene={{...scene, variant: SHOT_RECIPE.variant, narrative_job: scene.narrative_job || SHOT_RECIPE.narrative_job}} recipe={SHOT_RECIPE} stage={G1_STAGE} />;
}
