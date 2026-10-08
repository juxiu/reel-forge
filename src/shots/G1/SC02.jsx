import React from "react";
import {ExplainerShot} from "../Shot.jsx";

export const SHOT_RECIPE = {
  shot_id:"SC02",
  variant:"split",
  hero_size:190,
  camera:"parallax",
  settle_frames:30,
  labels:["content","representation"],
  layout:"split",
  seed:1002,
  mirror:true,
  accent_index:1,
  hero_role:"mechanism",
};

export function SC02({scene}) {
  return <ExplainerShot scene={{...scene, variant:SHOT_RECIPE.variant}} recipe={SHOT_RECIPE} />;
}
