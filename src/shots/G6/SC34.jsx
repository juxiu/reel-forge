import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC34",
  variant:"structured",
  hero_size:200,
  camera:"pan",
  settle_frames:30,
  mirror:true,
  accent_index:2,
  hero_role:"unification",
  labels:["structured-field","item","parameter","value"],
};

export function SC34({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
