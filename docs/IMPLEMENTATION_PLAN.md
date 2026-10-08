# Reel Forge 生产化实施计划

执行顺序固定为：

Research -> Narration/Timeline -> Storyboard -> Overlay/Primitives -> G1 Pilot -> Parallel Build -> Render -> Quantitative QC -> Repair/Recheck -> Delivery。

## P1 Agent Runtime

- 持久化执行状态：`src/core/runtime.mjs`。
- 项目级跨进程文件锁：`src/runtime/lock.mjs`。
- 外部智能体 JSON provider：`src/providers/agent/command.mjs` + `index.mjs`。
- 失败与暂停事件写入 runtime state，避免生产链丢失上下文。

## P2 Research

- 所有 source URL 真实抓取。
- 多来源统一 claim graph。
- claim -> source -> evidence 可追溯。
- narration/script 的 `claim_id` 在导演入口强制校验。

## P3 Narration / Timeline

- 按句真实 TTS。
- WordBoundary 为真实时间源。
- 逐句音频带 gap 混音成最终音轨。
- 中英文字幕分预算，支持 `|` 精细切块。
- 生成 timeline JSON/Markdown 和 timeline-source。

## P4 Storyboard / Primitives

- storyboard token 根据真实时间轴解析。
- 统一背景、HUD、章节卡、进度条、字幕安全区。
- 每个镜头有独立源码入口，公共视觉图元保持单一实现。

## P5 Pilot Gate

- 自动生成 30 秒以内可用 preview。
- Pilot 写入 approval artifact。
- `pilot-preview` 是完整渲染的硬门禁。

## P6 Parallel Build

- G1...Gn manifest。
- 并行 worker 按构建组执行。
- 构建组会物化为 `src/shots/Gn/SCxx.jsx` 独立镜头文件和 BUILD_NOTES。

## P7 Persistent Production

- `run-flow` 将全链串联并在 Pilot 停止。
- checkpoint 文件持久化四个人工确认点：长度语言、文案、配音、Pilot。
- render 不允许绕过 Pilot 审批；CI 可用显式 `AUTO_APPROVE=1`。

## P8 Render

- Remotion 真实渲染。
- 16:9 / 9:16 双比例。
- H.264 输出。
- 渲染前强制检查 Pilot checkpoint。

## P9 Quantitative QC

- media probe：duration / video / audio / dimensions / motion / black frame。
- frame metrics：亮度占比、黑场占比、帧差、最长低变化区间。
- motion check：连续低变化区间和均值。
- QC 结果 JSON + Markdown 落盘。

## Scoped Repair

- `src/repair/engine.mjs` 按 node 局部修改 RenderIR。
- 支持 hero_too_small / motion_too_low / freeze / caption_overlap 的确定性修复。
- 修复计划与状态归档。
- 修复后重新 render + QC，限制重试次数。

## P10 Delivery

- 归档成片、时间轴、分镜、研究、脚本、QC。
- 每个交付文件生成 SHA-256 checksum。
- delivery-manifest 可机器校验。

## 完成标准

功能完整度以 anything2explainer 的公开生产链为基线：完整 artifact 链、30 秒 Pilot gate、逐镜头源码、双比例渲染、量化 QC、修复重检和 checksum delivery 均必须可以独立运行。

后续优化仅包括：更丰富的外部 LLM/TTS provider、独立 ASR、对象存储、分布式调度、更多视觉原语和性能优化；这些不再阻塞基础生产链。
