# 执行记录

本阶段直接按 anything2explainer 的完整生产过程推进，目标不是继续堆 MVP 包装，而是让每个阶段都留下真实可消费 artifact。

已实现：
- Research：全 source fetch、multi-source claim graph、claim/evidence trace。
- Narration：逐句真实 TTS、WordBoundary、章节/段落 gap。
- Timeline：真实绝对帧、逐块字幕时间、timeline-source。
- Storyboard：token -> 分镜表，和 timeline 做覆盖 self-check。
- Overlay/Primitives：背景、HUD、章节卡、进度条、字幕安全区、公共动效。
- Shots：逐镜头 JSX、G1...Gn 动态物化、BUILD_NOTES。
- Pilot：preview、approval artifact、pilot-preview checkpoint。
- Parallel Build：构建组并行 worker + group manifest。
- Render：Remotion 16:9 / 9:16，Pilot 审批门禁。
- QC：media/frame/motion 三层报告，JSON + Markdown。
- Repair：按 node 修改 RenderIR，生成 repair plan，可重复 render + QC。
- Delivery：成片与过程 artifact checksum manifest。
- Runtime：执行状态持久化、项目锁、外部 agent JSON provider。
- HyperFrames：保持为可选后端 contract，不阻塞主生产链。

相对 anything2explainer 的完成状态：
- 生产阶段与 checkpoint：已闭环。
- artifact 纸面链路：已闭环。
- 逐镜头源码/构建组：已闭环。
- 量化 QC + 修复重检：已闭环。
- 真实媒体生产：已闭环。
- 尚属增强项：独立 ASR 交叉校验、更多本地 TTS provider、对象存储、分布式 worker 和更复杂的 Motion Grammar。

当前原则：先保证功能链真实可运行，再提升画面表现和生产效率。
