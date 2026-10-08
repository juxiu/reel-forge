import React from "react";
import {SemanticShot} from "../SemanticShots.jsx";

export const SHOT_RECIPE = {
  variant:"structured",
  hero_size:200,
  labels:["header","payload","metadata","policy"],
  layout:"schema",
  seed:1004,
  mirror:true,
  accent_index:3,
  hero_role:"explain",
};

export function SC04({scene}) {
  return <SemanticShot scene={scene} recipe={SHOT_RECIPE} />;
}
