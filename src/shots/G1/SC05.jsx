import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC05",
  variant:"comparison",
  hero_size:200,
  camera:"parallax",
  settle_frames:30,
  mirror:false,
  accent_index:2,
  hero_role:"compare",
  labels:["scope","hop","end-to-end"],
};

export function SC05({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
