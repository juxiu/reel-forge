import React from "react";
import {SemanticShot} from "../SemanticShots.jsx";

export const SHOT_RECIPE = {
  variant:"preference",
  hero_size:185,
  labels:["candidate","constraint","selected"],
  layout:"preference",
  seed:1003,
  mirror:false,
  accent_index:2,
  hero_role:"hook",
};

export function SC03({scene}) {
  return <SemanticShot scene={scene} recipe={SHOT_RECIPE} />;
}
