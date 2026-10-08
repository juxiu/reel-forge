import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC15",
  variant:"comparison",
  hero_size:200,
  camera:"push",
  settle_frames:30,
  layout:"comparison",
  seed:1015,
  mirror:false,
  accent_index:0,
  hero_role:"compare",
  labels:["old-digest","digest-fields","migration"],
};

export function SC15({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
