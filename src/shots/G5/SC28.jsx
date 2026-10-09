import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC28",
  variant:"causal",
  hero_size:190,
  camera:"pan",
  settle_frames:30,
  mirror:true,
  accent_index:1,
  hero_role:"mechanism",
  labels:["content","hash","integrity"],
};

export function SC28({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
