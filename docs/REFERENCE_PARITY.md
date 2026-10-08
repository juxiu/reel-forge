# anything2explainer 对齐矩阵

| 参考阶段 | reel-forge 实现 | 状态 |
|---|---|---|
| Scaffold | package.json + Remotion Composition | 完成 |
| Research | src/providers/research + src/research/claim-graph | 完成 |
| Narration | script/narration.txt + script.json contract | 完成 |
| TTS / Timeline | scripts/tts_build.mjs + WordBoundary | 完成 |
| Storyboard | storyboard_src.md -> 分镜表.md + selfcheck | 完成 |
| Overlay / Primitives | src/remotion/Primitives.jsx + src/visual/style.mjs | 完成 |
| Visual Benchmark | fixtures/visual-benchmark.json + positive/anti reference assets | 完成 |
| G1 Pilot | preview + pilot approval + checkpoint | 完成 |
| Parallel Build | build-groups + materialize-shots + scheduler/pool | 完成 |
| Render | Remotion 16:9 / 9:16 + audio | 完成 |
| Quantitative QC | media probe + frame metrics + motion check | 完成 |
| Visual Regression | scene/ratio frame sampling + visual-pixel-v1 cosine + anti-reference | 完成 |
| Shot Score | semantic/hero/motion/composition/light/safety + five visual dimensions | 完成 |
| Repair / Recheck | repair engine + repair plan + rerender hook | 完成 |
| Delivery | checksum delivery manifest | 完成 |
| Paper trail | artifacts/<project>/{research,script,beats,scene,render-ir,qc,repair,runtime} | 完成 |

## 质量基线

- 帧率：30fps。
- 主画布：1280×720；竖版：720×1280。
- 真实媒体时间优先于按字数估算。
- 字幕与主体使用独立安全区。
- 镜头组件独立，公共图元统一。
- Pilot 审批后才能进入完整渲染。
- Visual Regression 与结构化 Shot Score 同时作为 scene-level QC。
- QC 失败进入有限次数的 scoped repair，再重新验证。
- Delivery 必须包含 checksum manifest。

## 与参考仓库的差异

reel-forge 保留了更偏工程化的 Typed Artifact Contract、项目锁、外部 Agent provider 和 HyperFrames contract。这些属于扩展能力，不会改变 anything2explainer 的基础生产顺序。

当前差异主要在视觉 embedding：仓库内置的 visual-pixel-v1 是确定性的视觉特征 embedding，不冒充 CLIP/SigLIP；provider contract 后续可替换为真正的语义视觉模型。

## 当前验收说明

当前代码主干已具备视觉 benchmark、anti-reference 和 scene-level visual regression 的完整入口；完整 render/QC/delivery 的最新 GitHub Actions run 仍应以实际 Actions 记录为准。
