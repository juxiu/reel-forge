import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC22",
  variant:"split",
  hero_size:190,
  camera:"pan",
  settle_frames:30,
  mirror:true,
  accent_index:1,
  hero_role:"scope",
  labels:["message","content-digest","repr-digest"],
};

export function SC22({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
