import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, ChapterCard, EndingCredit, Hud, ProgressBar, Rail, Subtitle} from './Primitives.jsx';
import {Design, Fonts} from './Design.jsx';
import {FootageTrack} from './Footage.jsx';
import {SHOT_REGISTRY} from '../shots/registry.jsx';
import {ReelContext} from '../shots/context.mjs';
import {SWEEP_WHITELIST_MAX} from '../visual/style.mjs';
import {captionBlocks, chaptersOf, chapterCardAt, hudEntries, railEntries} from '../visual/timeline.mjs';

// 装配取数是纯函数层，QC 与 node 测试直接 import src/visual/timeline.mjs；这里再导出一次只为兼容旧引用。
export {captionBlocks, chaptersOf, chapterCardAt, hudEntries, railEntries};

/**
 * 成片装配：幕底 → 实拍底 → 镜头 → 常驻覆盖层（HUD / 进度条 / 章节卡 / 字幕 / 片尾）。
 *
 * ⚠ 帧号约定：这里统一换算成 1-based 的 N（Remotion 的 frame 从 0 起）。
 *    覆盖层用**全片绝对帧**，镜头内部用**镜头相对帧**（引擎里 N = frame + 1），
 *    两边都从 timeline / 字幕块取同一份数据，不各写一套。
 *
 * ⚠ 顺序即层级：字幕与进度条永远在最上；运镜只作用在内容层（CameraRig 在镜头内），
 *    HUD / 字幕 / 进度条不随相机移动 —— 这是样片的硬规律。
 *
 * ⚠ 所有画面层都在 <Design> 的逻辑画布里（16:9 时 1 逻辑像素 = 1 实际像素，与样片逐像素对齐）；
 *    实拍底留在设备像素层，因为它按全屏 cover 铺，不需要跟着设计空间缩放。
 *
 * ⚠ 片级效果预算在这里收口，不下放到镜头：紫光横扫全片 ≤ SWEEP_WHITELIST_MAX 处，
 *    多出来的白名单条目直接截断，镜头只认「我是否在名单里」。
 */

const toFrames = (v, fps) => Math.round(Number(v) * fps);

/**
 * @param {object} props
 * @param {object} props.renderIR   画面侧真源（scenes / fps / duration / width / height）
 * @param {Array}  props.captions   解说字幕块（与 renderIR 同源生成，缺失即无字幕）
 * @param {object} props.timeline   叙事侧真源（章节 / 片名 / 背景 / 署名 / 效果白名单）
 * @param {object} props.filmFx     覆盖 timeline.fx 的片级效果（装配测试用）
 */
export function ReelForgeComposition({renderIR, captions = [], timeline = null, includeScenes = true, includeAudio = true, audioFile = 'audio.mp3', showEndingCredit = true, filmFx = null}) {
  const frame = useCurrentFrame();
  const N = frame + 1;
  const fps = Number(renderIR.fps) || 30;
  const totalFrames = Math.max(1, Math.ceil(Number(renderIR.duration) * fps));
  const blocks = captionBlocks(captions, fps);
  const chapters = chaptersOf(timeline, totalFrames, fps);
  const hud = hudEntries(timeline, chapters, totalFrames);
  const rails = railEntries(timeline, totalFrames);
  const scenes = renderIR.scenes || [];
  const lastSceneFrame = scenes.length ? Math.max(...scenes.map((s) => toFrames(s.start + s.duration, fps))) : 0;
  const footage = Array.isArray(renderIR.footage) ? renderIR.footage : [];
  const sweepWhitelist = filmFx?.sweepScenes || timeline?.fx?.sweep_scenes || [];
  const sweepScenes = sweepWhitelist.slice(0, SWEEP_WHITELIST_MAX).map(String);
  const card = chapterCardAt(chapters, N);

  const ctx = {fps, captions: blocks, timeline, fx: {sweepScenes}, chapters};

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Fonts />
      {includeAudio ? <Audio src={staticFile(audioFile)} volume={1} /> : null}
      {footage.length ? <FootageTrack specs={footage} /> : null}
      <ReelContext.Provider value={ctx}>
        <Design>
          <Backdrop N={N} bg={timeline?.bg || renderIR.bg || 'dots'} />
          {includeScenes
            ? scenes.map((scene) => {
                const Shot = SHOT_REGISTRY[scene.id];
                if (!Shot) throw new Error(`shot registry missing for ${scene.id}; run npm run materialize-shots`);
                return (
                  <Sequence key={scene.id} from={toFrames(scene.start, fps)} durationInFrames={Math.max(1, toFrames(scene.duration, fps))}>
                    <Shot scene={scene} variant={scene.variant || 'generic'} />
                  </Sequence>
                );
              })
            : null}
          <Hud entries={hud} N={N} />
          {rails.map((r) => <Rail key={r.id} spec={r} N={N} />)}
          <ProgressBar chapters={chapters} totalFrames={totalFrames} N={N} />
          {card ? <ChapterCard N={N} chapter={card.chapter} prevTo={chapters[card.index - 1].to} from={card.start} to={card.end} tech={card.chapter.tech} /> : null}
          {blocks.map((b) => (b.text ? <Subtitle key={b.id} text={b.text} N={N} from={b.from} to={b.to} /> : null))}
          {showEndingCredit && lastSceneFrame > 0 ? <EndingCredit N={N} from={lastSceneFrame + 12} to={totalFrames} credit={timeline?.credit || renderIR?.credit} /> : null}
        </Design>
      </ReelContext.Provider>
    </AbsoluteFill>
  );
}

export default ReelForgeComposition;
