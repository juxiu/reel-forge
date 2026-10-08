# reel-forge

AI 自动化视频生产系统。

目标流水线：

Research → Script → Content QA → Director → Storyboard → Visual → TTS → Animation → Render → Multi-layer QC

设计原则：

- LLM 负责理解、决策与规划，不直接生成最终视频。
- Scene DSL 是 AI 与渲染器之间的稳定契约。
- Renderer 与上层业务解耦，首个实现为 Remotion，并评估 HyperFrames。
- 每个阶段都有可验证的 Artifact 输出和质量门。
- 任何中间产物都可版本化、缓存、局部重跑。

## 当前状态

项目从空仓库开始，按 `docs/IMPLEMENTATION_PLAN.md` 的阶段门推进。
