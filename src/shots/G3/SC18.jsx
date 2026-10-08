import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC18",
  variant:"causal",
  hero_size:190,
  camera:"push",
  settle_frames:30,
  layout:"causal",
  seed:1018,
  mirror:true,
  accent_index:0,
  hero_role:"mechanism",
  labels:["input","representation","digest"],
};

export function SC18({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
