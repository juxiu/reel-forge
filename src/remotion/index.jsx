import React from "react";
import {Composition} from "remotion";
import {DemoComposition} from "./Root.jsx";
import sceneDoc from "../../fixtures/remotion-scenes.json";

export const RemotionRoot=()=>(
  <Composition id="Demo" component={DemoComposition} durationInFrames={Math.max(1,Math.round(sceneDoc.duration*30))} fps={30} width={1280} height={720} defaultProps={{scenes:sceneDoc.scenes}} />
);
