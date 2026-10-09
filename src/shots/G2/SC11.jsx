import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC11",
  variant:"network",
  hero_size:210,
  camera:"parallax",
  settle_frames:30,
  mirror:false,
  accent_index:2,
  hero_role:"flow",
  labels:["sender","intermediary","receiver"],
};

export function SC11({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
