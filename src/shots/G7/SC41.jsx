import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC41",
  variant:"network",
  hero_size:210,
  camera:"parallax",
  settle_frames:30,
  layout:"network",
  seed:1041,
  mirror:false,
  accent_index:2,
  hero_role:"flow",
  labels:["sender","receiver","integrity"],
};

export function SC41({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
