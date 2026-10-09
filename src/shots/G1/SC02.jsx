import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC02",
  variant:"split",
  hero_size:190,
  camera:"parallax",
  settle_frames:30,
  labels:["content","representation"],
  mirror:true,
  accent_index:1,
  hero_role:"mechanism",
};

export function SC02({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
