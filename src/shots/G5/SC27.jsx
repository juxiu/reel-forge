import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC27",
  variant:"sequence",
  hero_size:190,
  camera:"push",
  settle_frames:30,
  layout:"sequence",
  seed:1027,
  mirror:false,
  accent_index:0,
  hero_role:"sequence",
  labels:["receive","parse","check"],
};

export function SC27({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
