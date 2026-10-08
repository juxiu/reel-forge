import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {Backdrop, Hud, ProgressBar, Captions, ChapterCard, EndingCredit} from "./Primitives.jsx";
import {SHOT_REGISTRY} from "../shots/registry.jsx";
import {ExplainerShot} from "../shots/Shot.jsx";

function activeChapter(timeline, frame) {
  const chapters = timeline?.chapters || [];
  return chapters.slice().reverse().find((chapter) => frame >= chapter.from - 1);
}

export function ReelForgeComposition({renderIR, captions = [], timeline = null, includeScenes = true, includeAudio = true, showEndingCredit = true}) {
  const frame = useCurrentFrame();
  const lastSceneFrame = renderIR.scenes.length
    ? Math.max(...renderIR.scenes.map((scene) => Math.round((scene.start + scene.duration) * renderIR.fps)))
    : 0;
  const endShow = frame > lastSceneFrame + 12;
  const chapter = activeChapter(timeline, frame);

  return <AbsoluteFill style={{background: "#000"}}>
    {includeAudio ? <Audio src={staticFile("audio.mp3")} volume={1} /> : null}
    <Backdrop />
    <Hud chapter={chapter?.title || ""} />
    {includeScenes ? renderIR.scenes.map((scene) => {
      const Shot = SHOT_REGISTRY[scene.id] || function FallbackShot(props) { return <ExplainerShot {...props} />; };
      return <Sequence key={scene.id} from={Math.round(scene.start * renderIR.fps)} durationInFrames={Math.max(1, Math.round(scene.duration * renderIR.fps))}>
        <Shot scene={scene} />
      </Sequence>;
    })}
    <ProgressBar chapters={timeline?.chapters || []} totalFrames={Math.ceil(renderIR.duration * renderIR.fps)} />
    <ChapterCard timeline={timeline} />
    <Captions captions={captions} />
    <EndingCredit show={showEndingCredit && endShow} startFrame={lastSceneFrame + 12} />
  </AbsoluteFill>;
}
