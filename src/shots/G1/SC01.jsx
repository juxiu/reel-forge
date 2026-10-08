import React from "react";
import {SemanticShot} from "../SemanticShots.jsx";

export const SHOT_RECIPE = {
  variant:"network",
  hero_size:210,
  support_count:6,
  layout:"orbit",
  seed:1001,
  mirror:false,
  accent_index:0,
  hero_role:"hook",
};

export function SC01({scene}) {
  return <SemanticShot scene={scene} recipe={SHOT_RECIPE} />;
}
