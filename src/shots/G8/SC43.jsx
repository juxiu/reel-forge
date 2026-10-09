import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC43",
  variant:"preference",
  hero_size:185,
  camera:"pan",
  settle_frames:30,
  mirror:false,
  accent_index:1,
  hero_role:"negotiation",
  labels:["want-content","want-repr","preference"],
};

export function SC43({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
