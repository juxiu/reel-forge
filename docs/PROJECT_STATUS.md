# 项目当前状态

更新日期：2026-10-08

## 总体状态

**状态：基础生产链、双比例质量门禁、语义导演、TTS WordBoundary 主时间轴、镜头评分、视觉 benchmark / regression 与 Skill CLI 已接入；当前继续提升视觉质量与源级修复能力。**

当前主干已经覆盖：

Research → Narration / Timeline → Storyboard → Overlay / Primitives → G1 Pilot → Parallel Build → Render → Quantitative QC → Visual Regression → Repair / Recheck → Delivery。

## 已完成

### 生产链

- Research：真实 source fetch。
- 多来源 claim graph 与 claim → source → evidence 追踪。
- script claim_id 证据校验。
- 逐句真实 TTS、WordBoundary、最终音轨。
- 中英文字幕分块与真实时间对齐。
- script/timeline.json、script/timeline.md、script/timeline-source.json 标准归档。
- Storyboard token → 分镜表。
- selfcheck：帧号、时间轴覆盖、镜头时长、持续动作、末拍稳定期、Glitch/扫光白名单。
- Overlay / Primitives：背景、HUD、章节卡、进度条、字幕安全区、片尾。
- 独立镜头 JSX 与 G1…Gn 动态物化。
- 镜头源码物化的换行问题已修复，verify:shots 会检查源码真实可执行结构。
- 构建组 manifest 与并行 worker。
- 16:9 / 9:16 RenderIR 与 Remotion 双比例渲染入口。
- Pilot preview、approval artifact、pilot-preview 硬门禁。
- Runtime 执行状态持久化、恢复、项目锁、外部 Agent JSON provider。
- HyperFrames project contract。
- frame metrics / motion check 已支持逐镜头质量范围。
- QC 会把问题映射到具体镜头和 ratio。
- Repair 只作用于匹配 ratio 与命中的 node，并要求实际产生变更后才算成功。
- Repair plan / status 审计文件。
- Delivery checksum manifest；verify:delivery 会重新计算交付目录中的实际 SHA-256 与 size。
- Pilot preview manifest。
- Visual Benchmark：正向 / anti-reference PPM 资产、benchmark manifest、结构化阈值。
- Visual Regression：按 scene/ratio 采样 3 帧，计算 visual-pixel-v1 embedding similarity 与 anti-reference similarity。
- Shot Score 已扩展 reference_similarity、visual_complexity、text_density、hero_consistency、layout_stability。
- npm run skill -- "TOPIC" --source URL --auto-approve 一键执行入口已接入，Pilot 默认仍可停住等待人工批准。

### 当前阻塞项

**当前没有 P0 阻塞。**

视觉 embedding 当前采用仓库内置的确定性 visual-pixel-v1，不是 CLIP/SigLIP 语义模型。其目标是先建立可复现的视觉回归基准；后续可以在相同 provider contract 下替换为真正的语义视觉 embedding provider。

## 后续增强

- 用 CLIP / SigLIP 类模型替换或增强 visual-pixel-v1。
- 更多真实人工精选 reference / anti-reference 帧。
- 更多语义视觉变体，并继续减少 generic fallback。
- Repair patch 与 BeatGraph / 源节点的真实回写。
- 更多 TTS provider、对象存储、分布式 worker / lock。
- HyperFrames runtime render backend。
- 多主题模板与 primitive registry。
- 历史版本视觉回归与自动挑选最佳修复方案。

## 时间轴口径

当前唯一生产时间轴仍为 TTS WordBoundary。二次校验结果必须标记为 tts-word-boundary；仓库不再设置 external ASR 作为第二套生产时间轴或额外 Production Gate。

## CI 验证策略

- **快速验证**：push / PR 默认触发 .github/workflows/verify-fast.yml，运行本地契约、导演、视觉语法、Visual Benchmark、Repair、HyperFrames 等轻量验收，不执行联网 Research、TTS、Preview、Remotion 双比例渲染、QC 与交付打包。
- **完整验收**：.github/workflows/verify.yml 手动或每日运行，完整执行 Research → TTS → ASR → Preview → Render → Frame Metrics → Motion → Visual Regression → Shot Score → QC → Repair → Delivery → Production Gate。
- 两级均采用并发取消旧 run，避免连续提交堆积。
