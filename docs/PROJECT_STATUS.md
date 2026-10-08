# 项目当前状态

更新日期：2026-10-08

## 总体状态

**状态：功能链基本完成，生产验收尚未最终通过。**

当前实现已经覆盖参考项目 anything2explainer 的基础生产顺序：

Research → Narration / Timeline → Storyboard → Overlay / Primitives → G1 Pilot → Parallel Build → Render → Quantitative QC → Repair / Recheck → Delivery。

但当前主干最近一次 GitHub Actions 验收仍未全绿，因此项目状态不能标记为“最终完成”。

## 已完成

### 生产链

- Research：真实 source fetch。
- 多来源 claim graph。
- claim → source → evidence 追踪。
- script claim_id 证据校验。
- 逐句真实 TTS。
- WordBoundary 词级时间。
- 逐句音频拼接与最终音轨。
- 中英文字幕分块与时间对齐。
- timeline JSON / Markdown / timeline-source。
- Storyboard token → 分镜表。
- Storyboard / Timeline 覆盖自检入口。
- Overlay / Primitives：背景、HUD、章节卡、进度条、字幕安全区、片尾。
- 独立镜头 JSX。
- G1…Gn 构建组 manifest。
- 构建组动态物化。
- 并行 worker。
- 16:9 与 9:16 RenderIR。
- Remotion 双比例渲染入口。
- G1 Pilot / preview / approval artifact。
- pilot-preview 渲染门禁。
- runtime 执行状态持久化。
- execution state 恢复入口。
- 项目级文件锁。
- 外部 Agent JSON provider。
- HyperFrames project contract。
- frame metrics。
- motion check。
- media QC。
- scoped repair engine。
- repair plan / recheck 流程入口。
- delivery checksum manifest。
- Research / Timeline / QC / Runtime 等过程证据归档。
- Overlay 独立预览。
- G1…Gn 独立预览合成。
- 指定帧静帧质检入口。
- 与 anything2explainer 的生产阶段对齐矩阵。

### 当前 CI 已确认通过的阶段

最近一次完整 CI 在 selfcheck 之前已经确认：

- plan
- contracts
- runtime
- approval
- build
- scheduler
- store
- research
- visual
- repair
- hyperframes
- production
- TTS / Timeline
- storyboard

## 未完成

### 当前阻塞项

**1. selfcheck 尚未通过**

最近一次主干验收运行：

- Workflow：verify
- Run：37747763804
- Commit：effe73e6b1bce993707b481f5f400a28ac8d96a9
- 失败步骤：npm run selfcheck

失败原因是 scripts/selfcheck.py 对正则提取出的帧号仍存在字符串/整数比较问题，导致 TypeError。

因此后续的 materialize IR、build groups、shot verification、preview、render、QC、delivery 在该轮 CI 中都没有执行到。

**2. 全链路最终绿色验收尚未取得**

需要修复 selfcheck 后重新跑完整 CI，并确认 preview、pilot、render 16:9 / 9:16、frame metrics、motion check、media QC、repair/recheck、delivery、delivery verification 全部通过。

### 非阻塞增强项

- 独立 ASR 交叉校验。
- 更多本地 TTS provider。
- 对象存储。
- 真正的分布式 worker / 分布式锁。
- 更复杂的 Motion Grammar。
- 更丰富的视觉图元与逐镜头专属动效。
- 性能与缓存优化。
- HyperFrames 真正 runtime render 后端。
- 更智能的 Repair Agent 自动修改源码并循环重渲染。

## 计划

### P0：先恢复 CI 全绿

1. 修复 scripts/selfcheck.py 的帧号类型转换。
2. 重新运行完整 verify。
3. 继续处理 CI 暴露的第一个真实失败点，不跳过后续阶段。
4. 直到 render、QC、repair/recheck、delivery 全部通过。

### P1：完成最终生产验收

- 检查 16:9 / 9:16 实际视频尺寸、时长、音频存在性。
- 检查 Pilot preview 与最终时间轴一致。
- 检查镜头注册与构建组一致。
- 检查 frame/motion/media QC 全通过。
- 检查 delivery manifest 包含完整过程证据和 SHA-256。
- 将最后一次绿色 CI run 记录在本文件。

### P2：质量优化

基础链路稳定后，再做：

- 更细粒度 Motion Grammar。
- 更高质量的镜头专属动画。
- 独立 ASR 对配音做二次校验。
- 更强的 Repair Agent。
- 对象存储 / 分布式生产。
- 性能与缓存优化。

## 完成定义

只有同时满足以下条件，项目才标记为“完成”：

1. 生产链所有阶段可以独立运行。
2. Pilot 审批门禁有效。
3. 16:9 / 9:16 实际成片生成成功。
4. Quantitative QC 全部通过。
5. QC 失败可以执行 scoped repair 并重新验证。
6. Delivery manifest 完整且 checksum 有效。
7. GitHub Actions 完整生产验收为绿色。

在第 7 项完成前，项目保持“功能基本完成、验收未完成”状态。