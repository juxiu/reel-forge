import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC14",
  variant:"structured",
  hero_size:200,
  camera:"parallax",
  settle_frames:30,
  mirror:true,
  accent_index:2,
  hero_role:"unification",
  labels:["algorithm","encoding","integrity","field"],
};

export function SC14({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
