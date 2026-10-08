import React from "react";
import {Composition, registerRoot} from "remotion";
import fixtureWide from "../../fixtures/render-ir-16x9.json";
import fixtureTall from "../../fixtures/render-ir-9x16.json";
import captions from "../../fixtures/captions.json";
import timeline from "../../script/timeline.json";
import buildGroups from "../../fixtures/build-groups.json";
import {ReelForgeComposition} from "./Root.jsx";

function groupIR(group) {
  return {
    ...fixtureWide,
    scenes: fixtureWide.scenes.filter((scene) => group.scene_ids.includes(scene.id)),
  };
}

export const RemotionRoot = () => <>
  <Composition id="ReelForge16x9" component={ReelForgeComposition} durationInFrames={Math.ceil(fixtureWide.duration * fixtureWide.fps)} fps={fixtureWide.fps} width={fixtureWide.width} height={fixtureWide.height} defaultProps={{renderIR: fixtureWide, captions, timeline}} />
  <Composition id="ReelForge9x16" component={ReelForgeComposition} durationInFrames={Math.ceil(fixtureTall.duration * fixtureTall.fps)} fps={fixtureTall.fps} width={fixtureTall.width} height={fixtureTall.height} defaultProps={{renderIR: fixtureTall, captions, timeline}} />
  <Composition id="Overlay" component={ReelForgeComposition} durationInFrames={Math.ceil(fixtureWide.duration * fixtureWide.fps)} fps={fixtureWide.fps} width={fixtureWide.width} height={fixtureWide.height} defaultProps={{renderIR: {...fixtureWide, scenes: []}, captions, timeline, includeScenes: false, includeAudio: false, showEndingCredit: false}} />
  {buildGroups.groups.map((group) => {
    const ir = groupIR(group);
    return <Composition
      key={group.id}
      id={group.id}
      component={ReelForgeComposition}
      durationInFrames={Math.ceil(fixtureWide.duration * fixtureWide.fps)}
      fps={fixtureWide.fps}
      width={fixtureWide.width}
      height={fixtureWide.height}
      defaultProps={{renderIR: ir, captions, timeline, includeAudio: false, showEndingCredit: false}}
    />;
  })}
</>;

registerRoot(RemotionRoot);
