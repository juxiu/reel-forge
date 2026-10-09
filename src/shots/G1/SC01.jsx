import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC01",
  variant:"network",
  hero_size:210,
  camera:"pan",
  settle_frames:30,
  support_count:6,
  mirror:false,
  accent_index:0,
  hero_role:"hook",
};

export function SC01({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
