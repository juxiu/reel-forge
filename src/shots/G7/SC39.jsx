import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC39",
  variant:"evidence",
  hero_size:195,
  camera:"push",
  settle_frames:30,
  mirror:false,
  accent_index:0,
  hero_role:"evidence",
  labels:["standard","field","evidence"],
};

export function SC39({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
