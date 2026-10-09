import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC25",
  variant:"comparison",
  hero_size:200,
  camera:"pan",
  settle_frames:30,
  mirror:false,
  accent_index:1,
  hero_role:"compare",
  labels:["content","representation","message"],
};

export function SC25({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
