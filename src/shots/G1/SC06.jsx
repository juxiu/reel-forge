import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC06",
  variant:"transformation",
  hero_size:200,
  camera:"push",
  settle_frames:30,
  layout:"transformation",
  seed:1011,
  mirror:true,
  accent_index:0,
  hero_role:"transform",
  labels:["message","digest","verified"],
};

export function SC06({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
