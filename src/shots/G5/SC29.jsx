import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC29",
  variant:"evidence",
  hero_size:195,
  camera:"parallax",
  settle_frames:30,
  mirror:false,
  accent_index:2,
  hero_role:"evidence",
  labels:["RFC 9530","Content-Digest","Repr-Digest"],
};

export function SC29({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant, narrative_job:scene.narrative_job||SHOT_RECIPE.hero_role}} recipe={SHOT_RECIPE} />;
}
