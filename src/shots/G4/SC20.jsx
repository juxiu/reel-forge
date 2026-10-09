import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC20",
  variant:"code",
  hero_size:200,
  camera:"parallax",
  settle_frames:30,
  mirror:true,
  accent_index:2,
  hero_role:"code",
  labels:["content","hash","field"],
};

export function SC20({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
