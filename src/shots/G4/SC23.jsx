import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC23",
  variant:"preference",
  hero_size:185,
  camera:"parallax",
  settle_frames:30,
  mirror:false,
  accent_index:2,
  hero_role:"negotiation",
  labels:["request","want-content","want-repr"],
};

export function SC23({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
