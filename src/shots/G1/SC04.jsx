import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC04",
  variant:"structured",
  hero_size:200,
  camera:"pan",
  settle_frames:30,
  labels:["header","payload","metadata","policy"],
  layout:"schema",
  seed:1004,
  mirror:true,
  accent_index:3,
  hero_role:"unification",
};

export function SC04({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant}} recipe={SHOT_RECIPE} />;
}
