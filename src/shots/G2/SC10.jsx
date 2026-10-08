import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC10",
  variant:"code",
  hero_size:200,
  camera:"pan",
  settle_frames:30,
  layout:"code",
  seed:1015,
  mirror:true,
  accent_index:1,
  hero_role:"code",
  labels:["bytes","digest","compare"],
};

export function SC10({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
