import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC17",
  variant:"sequence",
  hero_size:190,
  camera:"parallax",
  settle_frames:30,
  mirror:false,
  accent_index:2,
  hero_role:"process",
  labels:["parse","encode","validate"],
};

export function SC17({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
