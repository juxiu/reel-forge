import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC35",
  variant:"comparison",
  hero_size:200,
  camera:"parallax",
  settle_frames:30,
  layout:"comparison",
  seed:1035,
  mirror:false,
  accent_index:2,
  hero_role:"compare",
  labels:["legacy","new-field","coverage"],
};

export function SC35({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
