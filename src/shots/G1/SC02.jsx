import React from "react";
import {SemanticShot} from "../SemanticShots.jsx";

export const SHOT_RECIPE = {
  variant:"split",
  hero_size:190,
  labels:["content","representation"],
  layout:"split",
  seed:1002,
  mirror:true,
  accent_index:1,
  hero_role:"explain",
};

export function SC02({scene}) {
  return <SemanticShot scene={scene} recipe={SHOT_RECIPE} />;
}
