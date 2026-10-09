import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig} from 'remotion';
import {design, FONTS} from '../visual/style.mjs';

/**
 * 设计空间：所有覆盖层与镜头都在「1280 宽 × logicalH 高」的逻辑画布里写绝对像素，
 * 由 <Design> 统一缩放到实际画幅。
 *
 * 为什么要这一层：样片的硬规则全是像素量（字幕带 y637–690、进度条 y687–720、主角 ≥170px、
 * 文字 ≥22px、慢推安全区 x89–1191）。之前 reel-forge 用 width*0.08 这类分数布局，
 * 结果两种比例各写一套数、字号与位移都不受控，画面密度上不去。
 * 16:9 时缩放系数为 1，逻辑像素 = 实际像素，可与样片逐像素对齐；
 * 9:16（720×1280）系数 0.5625，逻辑画布 1280×2276，字号比例不变、纵向空间更多。
 */
export function useDesign() {
  const {width, height} = useVideoConfig();
  return design(width, height);
}

export const Design = ({children, style}) => {
  const d = useDesign();
  return (
    <AbsoluteFill style={{background: 'transparent'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: d.width, height: d.height, transform: `scale(${d.s})`, transformOrigin: '0 0', ...style}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** 逻辑像素 → 设备像素（少数需要绕开 Design 直接算的场合用）。 */
export const toDevice = (d, v) => v * d.s;

/**
 * 字体装载：在顶层挂一次即可，镜头里不要重复 delayRender。
 * ⚠ 字体缺失时 headless Chromium 会静默回退成衬线体，主角大字与样片的超粗黑体语言完全不符，
 * 而画面看起来「只是有点怪」——所以这里把失败显式打到 console，而不是悄悄继续。
 */
export const Fonts = () => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    const faces = FONTS.map(
      (f) => new FontFace(f.family, `url(${staticFile(f.file)})`, {
        weight: f.weight,
        style: f.style,
      }).load(),
    );
    Promise.all(faces)
      .then((loaded) => {
        for (const f of loaded) document.fonts.add(f);
        continueRender(handle);
      })
      .catch((err) => {
        console.error('[reel-forge] 字体装载失败，画面将回退到系统字体（质量不达标）:', err && err.message);
        continueRender(handle);
      });
  }, [handle]);
  return null;
};

/** 全画幅绝对定位块（等价于 ui.tsx 的 abs()），镜头与图元都用它写绝对坐标。 */
export const abs = (x, y, w, h) => ({position: 'absolute', left: x, top: y, width: w, height: h});
