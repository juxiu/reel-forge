# 项目当前状态

更新日期：2026-10-08

## 总体状态

**状态：基础生产链已通过完整 GitHub Actions 验收，可实际产出双比例 MP4；确认点产物哈希门禁与第一版视觉语法 lint 已落地，进入语义镜头与闭环修复增强阶段。**

当前主干已经覆盖：

Research → Narration / Timeline → Storyboard → Overlay / Primitives → G1 Pilot → Parallel Build → Render → Quantitative QC → Repair / Recheck → Delivery。

本轮 CI 已真实跑通 Research → TTS → Storyboard → Selfcheck → Render → Frame/Motion QC → QC → Delivery，全链路通过。

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

本轮 GitHub Actions 已取得绿色结果：Workflow `verify`，Run `37752344623`（Run #172），目标 PR #9；Render、双比例量化 QC、Delivery Verification 全部通过。

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
- 独立 ASR 二次校验。
- 更多本地 TTS provider。
- 更强 Repair Agent：从 QC issue 自动修改源码并闭环重渲染。
- [ ] 建立完整参考样片/反例资产与逐镜头质量标尺。
- 对象存储、分布式 worker / lock。
- HyperFrames 真正 runtime render backend。
- 四个确认点现在记录对应产物 SHA-256，并在后续阶段校验产物未被静默替换。
- 第一版视觉语法 lint：主角、视觉意图、状态变化、运镜、最小镜头时长、稳定期、特效白名单与 PPT-like motion。\n- 双比例 RenderIR 场景契约验收：canvas、duration、scene overlap、variant、hero、camera motion。\n- checkpoint 已形成 length-language → narration-signoff → voiceover → pilot-preview 的强依赖链。
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
- [x] 增加第一版 semantic shot variants，并在 RenderIR → Remotion 链路启用。\n- [ ] 扩充更多 semantic shot variants，继续减少 generic fallback。
- Repair 从 RenderIR patch 升级为源码级 scoped repair。
- 增加 ASR、更多 TTS 和对象存储 provider。


## 2026-10-08 继续推进

- 已完成：视觉构图契约进入 BeatGraph / Scene / RenderIR，强制单焦点、Hero 权重、安全边距、Hero Key 光、紫色强调色。
- 已完成：叙事时间线自动验收，校验 Script → Sentence → 字幕词级时间 → 双比例 RenderIR 的覆盖与时长一致性。
- 已完成：双比例 Scene Contract 样例补齐，并接入 CI 质量门禁。
- 已完成：CI 现在在生产链中执行 visual-grammar、scene-contract、narrative 三层验收。
- 未完成：真实 ASR 二次校验、TTS provider 抽象、逐镜头参考样片评分、更多语义视觉变体、HyperFrames/分布式渲染、对象存储与缓存。
- 已完成：QC → repair → re-render → QC 限次自动闭环入口，CI 默认最多执行 2 次修复循环。\n- 下一步：补 ASR 二次校验与镜头级参考样片评分，并把 repair patch 与具体源节点建立更细粒度映射。
