import React from "react";
import {Composition, registerRoot} from "remotion";
import fixtureWide from "../../fixtures/render-ir-16x9.json";
import fixtureTall from "../../fixtures/render-ir-9x16.json";
import captions from "../../fixtures/captions.json";
import timeline from "../../script/timeline.json";
import {ReelForgeComposition} from "./Root.jsx";

export const RemotionRoot = () => <>
  <Composition id="ReelForge16x9" component={ReelForgeComposition} durationInFrames={Math.ceil(fixtureWide.duration * fixtureWide.fps)} fps={fixtureWide.fps} width={fixtureWide.width} height={fixtureWide.height} defaultProps={{renderIR: fixtureWide, captions, timeline}} />
  <Composition id="ReelForge9x16" component={ReelForgeComposition} durationInFrames={Math.ceil(fixtureTall.duration * fixtureTall.fps)} fps={fixtureTall.fps} width={fixtureTall.width} height={fixtureTall.height} defaultProps={{renderIR: fixtureTall, captions, timeline}} />
</>;

registerRoot(RemotionRoot);
