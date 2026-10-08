import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC31",
  variant:"network",
  hero_size:210,
  camera:"pan",
  settle_frames:30,
  layout:"network",
  seed:1031,
  mirror:false,
  accent_index:1,
  hero_role:"flow",
  labels:["origin","intermediary","destination"],
};

export function SC31({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
