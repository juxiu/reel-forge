/**
 * 时间轴装载点（占位）。
 *
 * ⚠ 这个文件被 `npm run tts`（scripts/tts_build.mjs）覆盖写入，仓库里保留的是「没跑过配音时也能 bundle」的占位。
 *    为什么要有这一层：`script/timeline.json` 是运行产物（.gitignore 掉了），
 *    以前 src/remotion/index.jsx 直接 `import timeline from "../../script/timeline.json"`，
 *    于是 fresh clone 在跑 TTS 之前连打包都过不去，报的还是 webpack 的模块找不到，
 *    看不出真正的原因只是「还没配音」。这里把依赖收成一个必定存在的源码模块（参照 anything2explainer
 *    的 src/common/timeline.ts 同一手法：生成物有提交进仓库的占位版本）。
 *
 * 为 null 时装配层按 renderIR 自己推：整片算一章、HUD 用章名、时长取 renderIR.duration。
 * 所以「没配音」只影响预览音频与章界精度，不影响能不能跑起来看画面。
 */
export const timeline = null;

export default timeline;
