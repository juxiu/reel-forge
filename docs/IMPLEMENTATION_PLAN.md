# Reel Forge 生产化实施计划

执行顺序固定为：

Research -> Narration/Timeline -> Storyboard -> Overlay/Primitives -> G1 Pilot -> Parallel Build -> Render -> Frame/Motion -> Visual Regression -> Quantitative QC -> Repair/Recheck -> Delivery。

## P1 Agent Runtime

- 持久化执行状态：src/core/runtime.mjs。
- 项目级跨进程文件锁：src/runtime/lock.mjs。
- 外部智能体 JSON provider：src/providers/agent/command.mjs + index.mjs。
- 失败与暂停事件写入 runtime state，避免生产链丢失上下文。

## P2 Research

- 所有 source URL 真实抓取。
- 多来源统一 claim graph。
- claim -> source -> evidence 可追溯。
- narration/script 的 claim_id 在导演入口强制校验。

## P3 Narration / Timeline

- 按句真实 TTS。
- WordBoundary 为真实时间源。
- 逐句音频带 gap 混音成最终音轨。
- 中英文字幕分预算，支持 | 精细切块。
- 生成 timeline JSON/Markdown 和 timeline-source。

## P4 Storyboard / Primitives

- storyboard token 根据真实时间轴解析。
- 统一背景、HUD、章节卡、进度条、字幕安全区。
- 每个镜头有独立源码入口，公共视觉图元保持单一实现。

## P5 Pilot Gate

- 自动生成 30 秒以内可用 preview。
- Pilot 写入 approval artifact。
- pilot-preview 是完整渲染的硬门禁。

## P6 Parallel Build

- G1...Gn manifest。
- 并行 worker 按构建组执行。
- 构建组会物化为 src/shots/Gn/SCxx.jsx 独立镜头文件和 BUILD_NOTES。

## P7 Persistent Production

- run-flow 将全链串联并在 Pilot 停止。
- checkpoint 文件持久化四个人工确认点：长度语言、文案、配音、Pilot。
- render 不允许绕过 Pilot 审批；CI 可用显式 AUTO_APPROVE=1。

## P8 Render

- Remotion 真实渲染。
- 16:9 / 9:16 双比例。
- H.264 输出。
- 渲染前强制检查 Pilot checkpoint。

## P9 Quantitative QC

- media probe：duration / video / audio / dimensions / motion / black frame。
- frame metrics：亮度占比、黑场占比、帧差、最长低变化区间。
- motion check：连续低变化区间和均值。
- visual regression：每个 scene/ratio 采样 20% / 50% / 80% 位置帧，与 positive / anti-reference benchmark 做 visual-pixel-v1 cosine similarity。
- 视觉回归输出 reference_similarity、anti_similarity、visual_complexity、text_density、hero_consistency、layout_stability。
- Shot Score 将以上五个视觉维度与 semantic / hero / motion / composition / light / safety 统一加权。
- QC 结果 JSON + Markdown 落盘。

## Scoped Repair

- src/repair/engine.mjs 按 node 局部修改 RenderIR。
- 支持 hero_too_small / motion_too_low / freeze / caption_overlap / visual_regression_fail 的确定性修复。
- visual_regression_fail 首轮提升 Hero 权重/尺度与 camera motion，并写入 BeatGraph source-repair。
- Repair 后禁止重新 materialize 覆盖修复后的 RenderIR；直接重新渲染，并重新跑 frame metrics / motion / visual regression。
- 修复计划与状态归档。
- 修复后重新 render + 全质量层 QC，限制重试次数。

## P10 Delivery

- 归档成片、时间轴、分镜、研究、脚本、QC、Visual Regression。
- 每个交付文件生成 SHA-256 checksum。
- delivery-manifest 可机器校验。
- Production Gate 强制 visual regression PASS。

## P11 Visual Benchmark / Skill CLI

- fixtures/visual-benchmark.json：positive / anti reference manifest 与阈值。
- fixtures/visual-references/：仓库内置原创 PPM golden frames。
- scripts/visual_regression.py：确定性 visual embedding + cosine similarity + scene-level visual metrics。
- scripts/verify-visual-regression.mjs：双比例 visual regression contract。
- scripts/skill.mjs：npm run skill -- "TOPIC" --source URL [--auto-approve]。
- Skill CLI 在 Pilot 前后沿用现有 artifact / checkpoint contract，不创建第二套生产流程。

## 完成标准

功能完整度以 anything2explainer 的公开生产链为基线：完整 artifact 链、30 秒 Pilot gate、逐镜头源码、双比例渲染、量化 QC、视觉 benchmark、修复重检和 checksum delivery 均必须可以独立运行。

后续优化包括：CLIP/SigLIP provider、真实人工 golden-frame 数据集、对象存储、分布式调度、更多视觉原语、历史版本回归、自动最佳修复方案。
