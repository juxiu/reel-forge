import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC04",
  variant:"structured",
  hero_size:200,
  camera:"pan",
  settle_frames:30,
  labels:["header","payload","metadata","policy"],
  mirror:true,
  accent_index:3,
  hero_role:"unification",
};

export function SC04({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
