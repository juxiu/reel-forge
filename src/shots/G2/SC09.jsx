import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC09",
  variant:"evidence",
  hero_size:195,
  camera:"push",
  settle_frames:30,
  layout:"evidence",
  seed:1014,
  mirror:false,
  accent_index:0,
  hero_role:"evidence",
  labels:["RFC 9530","field","evidence"],
};

export function SC09({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
