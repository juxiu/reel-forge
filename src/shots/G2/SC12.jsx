import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC12",
  variant:"split",
  hero_size:190,
  camera:"push",
  settle_frames:30,
  mirror:true,
  accent_index:0,
  hero_role:"split",
  labels:["content-digest","repr-digest"],
};

export function SC12({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
