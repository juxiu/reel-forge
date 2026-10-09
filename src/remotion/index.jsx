import React from 'react';
import {Composition, registerRoot} from 'remotion';
import fixtureWide from '../../fixtures/render-ir-16x9.json';
import fixtureTall from '../../fixtures/render-ir-9x16.json';
import captions from '../../fixtures/captions.json';
import buildGroups from '../../fixtures/build-groups.json';
import {ReelForgeComposition} from './Root.jsx';
// 时间轴走生成占位模块，不直接 import script/timeline.json（那是 gitignore 的运行产物）。
import {timeline} from './timeline.gen.mjs';

/**
 * 合成注册表。
 *
 * ⚠ 时长以**时间轴**为准（跑过配音后 total_frames 来自真实词边界），没有配音时退回 renderIR.duration。
 *    两条都要写：进度条按 totalFrames 铺满，画面按 scenes 的 start/duration 排，
 *    两个真源不一致时末章进度条会提前走完或永远差一截。
 *
 * ⚠ includeAudio 跟着 timeline 走：public/audio.mp3 与 timeline.gen.mjs 由同一个脚本（npm run tts）写出，
 *    所以「有真实时间轴」是「有配音」的可靠代理。写死 true 会让 fresh clone 的第一次预览直接抛
 *    "Asset not found: audio.mp3"，而那跟画面质量无关。
 */

const FPS = Number(fixtureWide.fps) || 30;

const framesOf = (ir) => Math.max(1, Math.ceil(Number(ir.duration) * (Number(ir.fps) || FPS)));
const totalFramesOf = (ir) => Math.max(framesOf(ir), Number(timeline?.total_frames) || 0);
const audio = Boolean(timeline);

/** 构建组预览：只渲染本组镜头 + 覆盖层，无音频无片尾（逐组验收用，与主合成同一套装配代码）。 */
function groupIR(group) {
  return {...fixtureWide, scenes: fixtureWide.scenes.filter((scene) => group.scene_ids.includes(scene.id))};
}

const baseProps = (renderIR, extra = {}) => ({renderIR, captions, timeline, includeAudio: audio, ...extra});

export const RemotionRoot = () => (
  <>
    <Composition
      id="ReelForge16x9"
      component={ReelForgeComposition}
      durationInFrames={totalFramesOf(fixtureWide)}
      fps={FPS}
      width={fixtureWide.width}
      height={fixtureWide.height}
      defaultProps={baseProps(fixtureWide)}
    />
    <Composition
      id="ReelForge9x16"
      component={ReelForgeComposition}
      durationInFrames={totalFramesOf(fixtureTall)}
      fps={Number(fixtureTall.fps) || FPS}
      width={fixtureTall.width}
      height={fixtureTall.height}
      defaultProps={baseProps(fixtureTall)}
    />
    <Composition
      id="Overlay"
      component={ReelForgeComposition}
      durationInFrames={totalFramesOf(fixtureWide)}
      fps={FPS}
      width={fixtureWide.width}
      height={fixtureWide.height}
      defaultProps={baseProps({...fixtureWide, scenes: []}, {includeScenes: false, includeAudio: false, showEndingCredit: false})}
    />
    {buildGroups.groups.map((group) => {
      const ir = groupIR(group);
      return (
        <Composition
          key={group.id}
          id={group.id}
          component={ReelForgeComposition}
          durationInFrames={totalFramesOf(ir)}
          fps={FPS}
          width={fixtureWide.width}
          height={fixtureWide.height}
          defaultProps={baseProps(ir, {includeScenes: true, includeAudio: false, showEndingCredit: false})}
        />
      );
    })}
  </>
);

registerRoot(RemotionRoot);
