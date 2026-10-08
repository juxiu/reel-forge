# Reel Forge 实施计划

## 目标

把 Reel Forge 落地为可批量运行的 AI 视频生产系统：

Research → Script → Content QA → Director → Storyboard → Visual → TTS → Animation → Render → Multi-layer QC

核心约束：
1. LLM 不直接生成最终视频代码。
2. Scene DSL 是 AI 与 Renderer 的稳定接口。
3. 所有阶段必须产出结构化 Artifact。
4. 所有阶段必须有验证命令；验证失败不得进入下一阶段。
5. 只重跑受影响的 downstream 节点。

## 阶段与验收门

| 阶段 | 目标 | 主要产物 | 验收命令 | 状态 |
|---|---|---|---|---|
| P0 | 基线/契约/CI | README, contracts, CI, plan | npm run verify:p0 | DONE |
| P1 | Research→Script→Content QA | research.json, script.json, content-qa.json | npm run verify:p1 | DONE |
| P2 | Director→Storyboard→Scene DSL | director.json, storyboard.json, scene.json | npm run verify:p2 | IN PROGRESS |
| P3 | Visual/TTS/Timeline | visual.json, audio.json, timeline.json | npm run verify:p3 | TODO |
| P4 | Remotion Renderer | render output MP4 + metadata | npm run verify:p4 | TODO |
| P5 | HyperFrames Adapter | RenderIR + adapter contract | npm run verify:p5 | TODO |
| P6 | QC Pyramid / 局部重跑 | qc-report.json + rerun plan | npm run verify:p6 | TODO |
| P7 | 批量生产 | artifact graph + cache + delivery | npm run verify:p7 | TODO |

## 可并行执行的工作流

P1、P2、P3 的部分 Contract/Schema 可以并行设计，但只有通过上游 Artifact 验收后才允许接入生产链。

推荐并行轨道：
- Content：Research / Script / Content QA
- Direction：Director / Storyboard / Scene DSL
- Media：Visual / TTS / Timeline
- Rendering：Remotion / HyperFrames
- QA：Schema / Timeline / Visual / Render / Editorial

依赖关系：

```
P0
 ├── P1 ──┐
 ├── P2 ──┼──> P4/P5
 └── P3 ──┘      │
                 ▼
                P6
                 │
                 ▼
                P7
```

## 每阶段的完成定义

阶段只有同时满足下面条件才可标记 DONE：
- 代码/契约已提交到仓库。
- 有最小 fixture。
- 有自动化 verify 命令。
- CI 在该 commit 上通过。
- 明确记录实际产出路径。
- 失败场景至少有一个回归测试。

## 当前执行日志

### P0
- 建立仓库基线、架构约束、Artifact 目录和 CI。
- Gate：verify:p0。

### P1
- 建立 ResearchSpec / ClaimGraph / ScriptSpec。
- 建立 deterministic demo pipeline，暂不依赖外部模型 API。
- Gate：verify:p1。

### P2
- 正在建立 Director / Storyboard / Scene DSL。
- Gate：verify:p2。
