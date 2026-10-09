import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC21",
  variant:"network",
  hero_size:210,
  camera:"push",
  settle_frames:30,
  mirror:false,
  accent_index:0,
  hero_role:"flow",
  labels:["sender","hop","receiver"],
};

export function SC21({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
