import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC33",
  variant:"preference",
  hero_size:185,
  camera:"push",
  settle_frames:30,
  mirror:false,
  accent_index:0,
  hero_role:"negotiation",
  labels:["sender","want-content","want-repr"],
};

export function SC33({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
