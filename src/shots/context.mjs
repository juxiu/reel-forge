import React from 'react';

/**
 * 片级上下文：镜头文件是自动生成的薄壳（`({scene}) => <ExplainerShot scene={scene} recipe={SHOT_RECIPE} />`），
 * 中间层加参数就会丢数据，所以字幕、帧率、片级效果预算这些**跨层信息**走 context，不走 props。
 *
 * value = {
 *   fps,                 // 渲染帧率
 *   captions,            // 全片字幕块 [{text, from, to}]（1-based 绝对帧）
 *   timeline,            // 章节时间轴（HUD / 进度条 / 章节卡的唯一真源）
 *   fx: {sweepScenes},   // 全片效果白名单：允许出现三轮紫光横扫的 scene id（≤2 个）
 * }
 */
export const ReelContext = React.createContext(null);

export const useReel = () => React.useContext(ReelContext) || {};
