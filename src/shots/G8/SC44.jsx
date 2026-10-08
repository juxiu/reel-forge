import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC44",
  variant:"structured",
  hero_size:200,
  camera:"parallax",
  settle_frames:30,
  layout:"structured",
  seed:1044,
  mirror:true,
  accent_index:0,
  hero_role:"final-schema",
  labels:["algorithm","structured","digest","integrity"],
};

export function SC44({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
