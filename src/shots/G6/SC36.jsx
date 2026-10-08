import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC36",
  variant:"transformation",
  hero_size:200,
  camera:"push",
  settle_frames:30,
  layout:"transformation",
  seed:1036,
  mirror:true,
  accent_index:0,
  hero_role:"verification",
  labels:["bytes","digest","match"],
};

export function SC36({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
