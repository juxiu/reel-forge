# 项目当前状态

更新日期：2026-10-08

## 总体状态

**状态：基础生产链、双比例质量门禁、语义导演、TTS 词边界时间轴、ASR 契约与镜头评分已接入；当前继续补齐真实 ASR、真实参考资产与源级可回写修复。**

当前主干已经覆盖：

Research → Narration / Timeline → Storyboard → Overlay / Primitives → G1 Pilot → Parallel Build → Render → Quantitative QC → Repair / Recheck → Delivery。

当前提交尚无可确认的 GitHub Actions run；代码层面已接入完整生产链与新增质量门禁。

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
- anything2explainer 对齐矩阵与本生产流程规范已记录在仓库。

### 本轮主要修复提交

- d961b8b6 fix: 修复 selfcheck 帧号类型比较
- 03d6793d fix: 正确生成镜头源码换行
- c75d0202 test: 强化镜头源码物化校验
- 44852cec test: 校验交付包实际 checksum 与文件
- 8f0f3d0a feat: 完善分镜与动效规则自检
- 16b15baf feat: 完善 Pilot 预览与清单归档
- 53844d5d feat: 增加逐镜头帧级质量指标
- 862d4053 feat: 增加逐镜头动作质量检查
- 8b6b87c5 fix: 将 QC 问题映射到具体镜头
- 93aac258 ci: 为 QC 输出接入逐镜头范围
- bccd8efd fix: 实现按比例和镜头的局部修复
- dcb5602e fix: 强化修复变更校验与归档
- 6b36ed01 fix: 固化时间轴源码标准归档路径
- 7823f6f2 test: 校验完整时间轴证据链
- 725b1b31 test: 完善双比例 QC 最终验收
- 550cbb5c fix: 限制修复只作用于匹配比例
- bde7a2d5 fix: 允许时间轴段落间的设计留白
- 70c60ef0 test: 完成双比例媒体 QC 验收

## 未完成

### 当前阻塞项

**当前没有 P0 阻塞。**

此前曾存在绿色验证记录，但不能将其视为当前提交的验证结果；当前最新提交需要新的 Actions run 确认。

此前失败记录：

已知上一轮失败为：
- Workflow：verify
- Run：37747763804
- Commit：effe73e6b1bce993707b481f5f400a28ac8d96a9
- 失败步骤：npm run selfcheck
- 原因：帧号从正则提取后仍为字符串，和整数 prev 比较触发 TypeError。

该根因已经修复；当前通过 GitHub 连接器可确认代码提交，但无法直接读取这些新 push 所对应的 Actions run 列表，因此不能把新提交声明为 CI 全绿。

**2. 最终媒体验收已完成。**

CI 已真实走完：materialize IR → build groups → shots → e2e → preview → pilot → render 双比例 → frame metrics → motion check → qc → repair/recheck fallback → delivery → delivery verification。

### 仍属增强项

- 视觉表现继续向 anything2explainer 样片靠拢：更多语义图元、镜头级专属动画、更加严格的反 PPT 构图。
- CI 已默认自动批准四个 checkpoint；交互生产模式仍可保持暂停/恢复。
- [x] TTS WordBoundary 主时间轴与独立词边界验收；无真实 ASR API 时，二次验收使用明确标记的 `tts-word-boundary`。
- [~] 真实 ASR 二次验收：已有 Provider 接口与 Production Gate，待获得真实 ASR API 后启用。
- 更多本地 TTS provider。
- [x] Repair 输出 scene → source_ref 修复映射；[ ] 继续实现真正的源代码节点回写。
- [x] 建立第一版逐镜头质量评分标尺；[ ] 继续接入真实参考样片/反例资产。
- 对象存储、分布式 worker / lock。
- HyperFrames 真正 runtime render backend。
- 四个确认点现在记录对应产物 SHA-256，并在后续阶段校验产物未被静默替换。
- 第一版视觉语法 lint：主角、视觉意图、状态变化、运镜、最小镜头时长、稳定期、特效白名单与 PPT-like motion。
- 双比例 RenderIR 场景契约验收：canvas、duration、scene overlap、variant、hero、camera motion。
- checkpoint 已形成 length-language → narration-signoff → voiceover → pilot-preview 的强依赖链。
- 性能与缓存优化。

## 计划

### P0：已完成

1. 修复 selfcheck 白名单解析异常。
2. 补齐 frame/motion QC 的 Python 依赖。
3. 修正 npm → motion_check 参数传递。
4. 修正 FFmpeg scene filter 的 JavaScript 转义。
5. 取得完整绿色 CI Run #172，并记录到本文件。

### P1：把四个确认点产品化

- [x] 将 length-language、narration-signoff、voiceover、pilot-preview 纳入渲染前门禁。
- [x] 支持非交互 CI 的显式批准模式，以及交互生产模式的暂停/恢复。
- [x] 每个 checkpoint 绑定对应 artifact hash，防止批准后输入被静默替换。
- [x] 将 checkpoint 接入阶段依赖链；[ ] 继续接入导演状态机回滚与失效传播。

### P2：质量提升

- [~] Motion Grammar 已进一步覆盖稳定期、特效白名单、空闲窗口与反 PPT motion，继续补齐 Composition/Light、Narration 与章界规则。
- [x] 增加第一版 semantic shot variants，并在 RenderIR → Remotion 链路启用。
- [x] 增加语义导演决策层，按叙事语义选择镜头变体，并避免连续重复同一变体。
- [x] 扩充 comparison / transformation / sequence / causal / evidence / code 等 semantic shot variants，并加入语义导演验收。
- [ ] 继续减少 generic fallback，并引入更强的多句上下文导演。
- Repair 已具备 source_ref 追踪与修复审计映射，下一步把修复实际回写 BeatGraph/脚本源节点。
- 增加 ASR、更多 TTS 和对象存储 provider。


## 2026-10-08 继续推进

- 已完成：视觉构图契约进入 BeatGraph / Scene / RenderIR，强制单焦点、Hero 权重、安全边距、Hero Key 光、紫色强调色。
- 已完成：叙事时间线自动验收，校验 Script → Sentence → 字幕词级时间 → 双比例 RenderIR 的覆盖与时长一致性。
- 已完成：双比例 Scene Contract 样例补齐，并接入 CI 质量门禁。
- 已完成：CI 现在在生产链中执行 visual-grammar、semantic-director、scene-contract、shot-score、narrative、ASR 多层验收。
- 已完成：ASR 二次对齐契约、第一版逐镜头评分、source_ref 修复追踪。
- 已完成：参考 anything2explainer 的 TTS WordBoundary 主时间轴方案：逐句 TTS 产出词级时间边界，字幕/分镜读取同一时间轴，新增独立词边界覆盖与漂移验收；未配置真实 ASR 时不伪装成 provider-backed 结果。
- 已完成：真实 ASR provider 接口（通过 `ASR_REQUIRED=1` + `ASR_COMMAND` 接入真实 provider）；Strict Production 仍强制 external ASR。
- 未完成：真实参考样片/反例资产、更多语义视觉变体、HyperFrames/分布式渲染、对象存储与缓存。
- 已完成：QC → repair → re-render → QC 限次自动闭环入口，CI 默认最多执行 2 次修复循环。
- 下一步：接入真实参考样片/反例资产评分，并把 repair patch 与具体源节点建立可回写映射；交付包已强制纳入 ASR 二次校验结果与双比例 RenderIR。

## CI 验证策略

为避免每次提交都等待完整渲染链，验证已拆成两级：

- **快速验证**：push / PR 默认触发 `.github/workflows/verify-fast.yml`，只运行本地契约、导演、视觉语法、Repair、HyperFrames、Scene Contract 等静态/轻量验收，不执行联网 Research、TTS、Preview、Remotion 双比例渲染、QC 与交付打包。
- **完整验收**：`.github/workflows/verify.yml` 改为手动 `workflow_dispatch` + 每日定时运行，完整执行 Research → TTS → ASR → Preview → Render → QC → Repair → Delivery → Production Gate。
- 两级均采用并发取消旧 run，避免连续提交堆积。
