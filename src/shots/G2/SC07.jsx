import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC07",
  variant:"sequence",
  hero_size:190,
  camera:"pan",
  settle_frames:30,
  layout:"sequence",
  seed:1012,
  mirror:false,
  accent_index:1,
  hero_role:"sequence",
  labels:["request","content","digest"],
};

export function SC07({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
