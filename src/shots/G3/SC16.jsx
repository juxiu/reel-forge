import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC16",
  variant:"transformation",
  hero_size:200,
  camera:"pan",
  settle_frames:30,
  mirror:true,
  accent_index:1,
  hero_role:"migration",
  labels:["legacy","structured","current"],
};

export function SC16({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
