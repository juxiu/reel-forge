# 项目当前状态

更新日期：2026-10-08

## 总体状态

**状态：基础生产链、双比例质量门禁、语义导演、TTS WordBoundary 主时间轴、镜头评分、画面文字出处门禁与 Skill CLI 已接入；2026-10-08 完成首次真实端到端production run（`verify:production` PASS）。当前主要差距是画面信息密度与排版控制，尚未引入字体资产、仍为变体引擎而非逐镜头 authored 组件。**

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

视觉 embedding 采用仓库内置的确定性 visual-pixel-v1，不是 CLIP/SigLIP 语义模型。经真实 production run 实测确认：其参考资产（<code>fixtures/visual-references/</code>，64×36 合成图）与画面质量**反向相关**——画面更密更实则分数更低。因此它已降级为**非阻断回归信号**（<code>gate: "advisory"</code>），不再参与交付判定；后续若要恢复阻断能力，需要先用 reel-forge 自己的真实成片帧重建正例/反例基准。

### 首次真实 production run（2026-10-08）

主题 HTTP Digest Fields（源 RFC 9530），37.33s，双比例成片。全部阻断项通过：

~~~text
verify:fast            16 项 PASS
frame-metrics          PASS  最长静默段 58 / 64 帧（阈值 90）
motion-check           PASS  mean_change 0.406
verify:text-provenance PASS  溯源元素 8 / 登记字面量 34
verify:qc              PASS
repair-cycle           PASS  repair_audit: not-needed
deliver                PASS  29 个文件checksum 校验
verify:production      PASS
~~~

过程中修复的真实缺陷：

1. <code>contracts/footage.schema.json</code> 与 <code>fixtures/reference-shot-blueprint.json</code> 末尾混入字面 <code>\n</code>，导致 <code>verify:fast</code> 崩溃。
2. 镜头离场只有 12 帧纯淡出，变化量在阈值 0.35 上下抖动，产生 97 帧（3.2s）静默段；改为 18 帧「淡出 + 上移 + 微缩」后降至 58 帧。
3. 渲染器完全不消费 RenderIR（真实文案、<code>hero_scale</code>、运镜、持续动作），画面显示占位符文本且主角回退成衬线字体；修复后 Repair 写入的 <code>hero_scale</code> 才真正生效（此前复渲产物字节级完全相同）。
4. <code>audio/asr-second-pass.json</code> 无任何流程生成，而 <code>deliver</code> / <code>verify:production</code> 硬性要求它——照文档执行永远无法交付。
5. <code>visual_regression</code> 与 <code>shot-score</code> 用合成占位图做阻断门；已改为非阻断，并新增 <code>verify:text-provenance</code> 作为可阻断的画面文字出处门（对应 a2e 硬性原则 2）。

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
