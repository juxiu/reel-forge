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
| Visual Regression | scene/ratio frame sampling + visual-pixel-v1 cosine + anti-reference | 完成，但降级为非阻断回归信号（参考资产为 64×36 合成图，与画面质量反向相关） |
| Text Provenance | elements[].text 溯源到解说词/调研 + 硬编码字面量白名单 + 双比例一致 | 完成（阻断门，对应 a2e 硬性原则 2） |
| Shot Score | semantic/hero/motion/composition/light/safety + five visual dimensions | 完成（reference_similarity 仅为维度，不作硬门） |
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

2026-10-08 已在本地完成一次真实端到端production run（HTTP Digest Fields /源 RFC 9530，37.33s，双比例），全部阻断项通过：<code>frame-metrics</code>、<code>motion-check</code>、<code>verify:text-provenance</code>、<code>verify:qc</code>、<code>repair-cycle</code>、<code>deliver</code>、<code>verify:production</code>。明细见 <code>docs/PROJECT_STATUS.md</code>。

需要注意：<code>verify:production</code> PASS 证明的是**链路完整、指标达标、画面文字有出处、可复现**，不证明画面已达到 a2e 样片的审美水准——后者仍依赖真实帧基准与人工／QC agent 复核。
