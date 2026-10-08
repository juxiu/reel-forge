import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC13",
  variant:"preference",
  hero_size:185,
  camera:"pan",
  settle_frames:30,
  layout:"preference",
  seed:1013,
  mirror:false,
  accent_index:1,
  hero_role:"negotiation",
  labels:["want","accept","prefer"],
};

export function SC13({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
