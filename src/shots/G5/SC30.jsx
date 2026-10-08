import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC30",
  variant:"code",
  hero_size:200,
  camera:"push",
  settle_frames:30,
  layout:"code",
  seed:1030,
  mirror:true,
  accent_index:0,
  hero_role:"code",
  labels:["message","representation","integrity"],
};

export function SC30({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
