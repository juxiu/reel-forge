# 参考资料与设计来源

## anything2explainer
仓库：https://github.com/Vincentwei1021/anything2explainer

吸收：Research/Narration/Storyboard/Build/Render/QC；30 秒 preview gate；G1...Gn 并行 build groups；Motion Grammar/Anti-PPT；frame/motion/self-check；QC -> Repair -> Re-render；参考成片作为质量标尺。

方法文档对应关系（上游 `reference/` 下的 10 个文件不在本仓库，下列路径相对于上游仓库根；本仓库的知识文档**只吸收其判据与事故，不复制其正文**，且以本仓库代码为准重新核对每条规则的执行者）：

| 上游文件 | 本仓库对应文档 | 吸收的是哪一面 |
|---|---|---|
| `reference/research-brief.md` | `docs/knowledge/research-brief.md` | §0–§8 结构、数字清单条数、可信度星级、【待核】、术语对照、比喻清单——作为「上游要求 ↔ 本仓库执行者」对照表的左列 |
| `reference/lessons.md` | `docs/knowledge/lessons.md` | 五部片 125 条真实返工，逐条问「同样的事故在本仓库由谁拦」；事故原文不在本仓库，只留归属、状态与执行者 |
| `reference/composition-and-light.md` | `docs/knowledge/composition-and-light.md` | 同名异源：设计空间/band、主角尺寸、光模型、`frame_metrics` 判据在本文按本仓库 `src/visual/*` 与 `src/remotion/*` 重新落地 |
| `reference/motion-vocabulary.md` | `docs/knowledge/motion-vocabulary.md` | 同名异源：运镜词表、节拍窗口、效果配额按本仓库 `src/visual/style.mjs` 与 `src/shots/plan.mjs` 重新落地 |
| `reference/style-guide.md` | `docs/knowledge/style-guide.md` | 同名异源：调色板、字号阶梯、字体角色按本仓库 `src/visual/style.mjs` 与 `fonts/` 实际装载状态重新落地 |
| `reference/narration-storyboard.md` + `reference/narration-guidance.md` | `docs/knowledge/narration-and-storyboard.md`（两份合成一份） | 分镜令牌与表格格式、写作原则；本仓库把「格式」与 `selfcheck.py` 的九判据对齐后再写 |
| `reference/agent-build-rules.md` + `reference/agent-qc-rules.md` + `reference/prompts.md` | `docs/knowledge/agent-protocol.md` | 三个 agent 角色的规则原文与 QC 维度，转成本仓库的「payload ↔ 谁在执行」表；规则原文仍在 `SKILL.md` |

## Pluvio / rnskill
仓库：https://github.com/Pluviobyte/rnskill
X：https://x.com/Pluvio9yte/status/2081648099680743554
公开技术选型：Codex + HyperFrames + HeyGen + IndexTTS2。

吸收：Skill contract、Skill chaining、Production Director、真实 TTS -> 词级时间戳 -> 字幕、人机 approval、HyperFrames renderer、生产状态/QC/归档、Provider 与 Artifact Contract 解耦。

不作为核心硬依赖：选题、平台下载、洗稿、数字人业务、封面、图文、发布复盘及特定作者资产。

原则：吸收公开方法和质量标准，不复制受许可证约束的代码、资产或私有配置。
