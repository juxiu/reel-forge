import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC32",
  variant:"split",
  hero_size:190,
  camera:"parallax",
  settle_frames:30,
  mirror:true,
  accent_index:2,
  hero_role:"scope",
  labels:["transport","message","digest"],
};

export function SC32({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
