import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC08",
  variant:"causal",
  hero_size:190,
  camera:"parallax",
  settle_frames:30,
  layout:"causal",
  seed:1013,
  mirror:true,
  accent_index:2,
  hero_role:"mechanism",
  labels:["message","digest","integrity"],
};

export function SC08({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
