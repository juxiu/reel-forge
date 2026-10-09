import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC19",
  variant:"evidence",
  hero_size:195,
  camera:"pan",
  settle_frames:30,
  mirror:false,
  accent_index:1,
  hero_role:"evidence",
  labels:["Content-Digest","RFC 9530","claim"],
};

export function SC19({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
