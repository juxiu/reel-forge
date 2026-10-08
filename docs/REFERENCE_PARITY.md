# anything2explainer 对齐矩阵

| 参考阶段 | reel-forge 实现 | 状态 |
|---|---|---|
| Scaffold | package.json + Remotion Composition | 完成 |
| Research | src/providers/research + src/research/claim-graph | 完成 |
| Narration | script/narration.txt + script.json contract | 完成 |
| TTS / Timeline | scripts/tts_build.mjs + WordBoundary | 完成 |
| Storyboard | storyboard_src.md -> 分镜表.md + selfcheck | 完成 |
| Overlay / Primitives | src/remotion/Primitives.jsx + src/visual/style.mjs | 完成 |
| G1 Pilot | preview + pilot approval + checkpoint | 完成 |
| Parallel Build | build-groups + materialize-shots + scheduler/pool | 完成 |
| Render | Remotion 16:9 / 9:16 + audio | 完成 |
| Quantitative QC | media probe + frame metrics + motion check | 完成 |
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
- QC 失败进入有限次数的 scoped repair，再重新验证。
- Delivery 必须包含 checksum manifest。

## 与参考仓库的差异

reel-forge 保留了更偏工程化的 Typed Artifact Contract、项目锁、外部 Agent provider 和 HyperFrames contract。这些属于扩展能力，不会改变 anything2explainer 的基础生产顺序。
