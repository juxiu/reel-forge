import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC24",
  variant:"structured",
  hero_size:200,
  camera:"push",
  settle_frames:30,
  mirror:true,
  accent_index:0,
  hero_role:"encoding",
  labels:["sf-item","sf-list","sf-dictionary","digest"],
};

export function SC24({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
