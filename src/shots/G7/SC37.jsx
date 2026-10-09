import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC37",
  variant:"sequence",
  hero_size:190,
  camera:"pan",
  settle_frames:30,
  mirror:false,
  accent_index:1,
  hero_role:"sequence",
  labels:["request","digest","verified"],
};

export function SC37({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
