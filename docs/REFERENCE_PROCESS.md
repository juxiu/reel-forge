# anything2explainer 对齐生产流程

## 目标

reel-forge 以 anything2explainer 的公开生产顺序作为基础流程基线，同时保留工程化扩展：Typed Artifact Contract、持久化 Runtime、项目锁、外部 Agent Provider、HyperFrames contract。

核心顺序：

Research → Narration → TTS/Timeline → Storyboard → Overlay/Primitives → G1 Pilot → Parallel Build → Render → Quantitative QC → Repair/Recheck → Delivery

## 阶段与产物

| 阶段 | 入口 | 必须产物 | 验收 |
|---|---|---|---|
| Scaffold | fixtures/project.json | contracts、Remotion composition | verify:plan / contracts |
| Research | source_urls | research.json / research.md | source 可抓取，claim 有 evidence |
| Narration | script/narration.txt / script.json | script contract | claim_id 全部可追溯 |
| TTS/Timeline | npm run tts | public/audio.mp3、timeline JSON/MD/source、captions | WordBoundary 为真实时间源 |
| Storyboard | npm run storyboard | 分镜表.md | token 解析、句段覆盖、镜头节奏约束 |
| Overlay/Primitives | src/remotion | HUD、章节卡、进度条、字幕、安全区 | verify:visual |
| G1 Pilot | npm run preview / pilot | preview.mp4、preview manifest、approval/checkpoint | pilot-preview 必须 approved 才能完整渲染 |
| Parallel Build | build-groups / materialize-shots | G1…Gn、独立镜头源码、BUILD_NOTES | verify:shots |
| Render | npm run render | 16:9 / 9:16 MP4 + frames | 双比例实际输出 |
| Quantitative QC | frame-metrics / motion-check / qc | 每比例 QC JSON/MD | media + frame + motion 全通过 |
| Repair/Recheck | npm run repair | repair-plan、status、局部 RenderIR 修改 | 只修改命中的 node/ratio，随后重渲染复验 |
| Delivery | npm run deliver | delivery package + SHA-256 manifest | verify:delivery 重算 checksum |

## 四个确认点

1. length-language：项目时长与语言。
2. narration-signoff：解说词、章节划分与节奏。
3. voiceover：TTS / 自有配音来源。
4. pilot-preview：前 30 秒 Pilot 的风格、字号、语速和节奏。

Runtime 会持久化四个 checkpoint。当前自动化 CI 为了可重复验收，会在验证流程中显式批准 Pilot；生产环境可以通过 scripts/checkpoint.mjs 单独推进任意 checkpoint。

## 视觉质量基线

- 30fps；主画布 1280×720；竖版 720×1280。
- 黑底 + 点阵/幕底、顶部 HUD、底部章节进度条、字幕安全区。
- 字幕由共用层渲染，镜头源码不重复画字幕。
- 镜头按画面单元组织；目标镜头时长至少 120 帧。
- 每个镜头必须声明持续动作和末拍稳定期；稳定期至少 30 帧。
- QC 按镜头检查 motion / freeze，修复按 node + ratio 限定范围。
- 事实来自 research claim/evidence，不能脱离研究文档添加数字、术语和断言。

## 验收顺序

1. npm run verify:* 基础 contract。
2. npm run run-production
3. npm run tts
4. npm run storyboard
5. npm run selfcheck
6. npm run materialize-ir
7. npm run build-groups
8. npm run materialize-shots
9. npm run verify:shots
10. npm run verify:e2e
11. npm run preview
12. npm run pilot
13. npm run checkpoint -- pilot-preview approved
14. npm run render
15. 双比例 frame metrics / motion check
16. npm run qc
17. 失败时 npm run repair → 重新 render → npm run qc
18. npm run verify:qc
19. npm run deliver
20. npm run verify:delivery

## 完成定义

只有以下条件同时成立才把项目标记为最终完成：

- 全部 production stages 有可运行入口。
- Pilot gate 无法被默认 render 绕过。
- 16:9 / 9:16 实际成片生成。
- 双比例 Quantitative QC 全通过。
- QC failure 可以生成可审计的 scoped repair。
- Delivery manifest 可独立重算并验证 checksum。
- GitHub Actions 完整生产验收全绿。
