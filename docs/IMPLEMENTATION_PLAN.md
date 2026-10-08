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
| P2 | Director→Storyboard→Scene DSL | director.json, storyboard.json, scene.json | npm run verify:p2 | DONE |
| P3 | Visual/TTS/Timeline | visual.json, audio.json, timeline.json | npm run verify:p3 | DONE |
| P4 | Remotion Renderer | render output MP4 + metadata | npm run verify:p4 | IN PROGRESS |
| P5 | HyperFrames Adapter | RenderIR + adapter contract | npm run verify:p5 | DONE |
| P6 | QC Pyramid / 局部重跑 | qc-report.json + rerun plan | npm run verify:p6 | DONE |
| P7 | 批量生产 | artifact graph + cache + delivery | npm run verify:p7 | DONE |

## 可并行执行的工作流

P1、P2、P3 的 Contract/Schema 可以并行设计；Render、HyperFrames、QC、Batch 采用独立 CI job 并行验证。只有对应阶段验收门通过，阶段才可标记 DONE。

并行轨道：
- core：P0 → P1 → P2 → P3
- renderer：P4 Remotion
- backend：P5 HyperFrames
- quality：P6 QC / scoped rerun
- scale：P7 batch / cache

依赖关系：

```
P0
 ├── P1 ──┐
 ├── P2 ──┼──> P3
 └────────┘      │
          ┌──────┼──────┐
          ▼      ▼      ▼
         P4     P5     P6
                  \      /
                   \    /
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

## 执行记录

### P0 — DONE
- 基线、架构、contracts、fixture、CI 已建立。
- Actions run 37738234477 成功。

### P1 — DONE
产物：
- `artifacts/demo-semantic-search/research.json`
- `artifacts/demo-semantic-search/script.json`
- `artifacts/demo-semantic-search/content-qa.json`

验证：
- Claim coverage PASS。
- 缺失 claim 的负向回归 PASS。
- CI 的 `verify:p1` PASS。

### P2 — DONE
产物：
- `artifacts/demo-semantic-search/director.json`
- `artifacts/demo-semantic-search/storyboard.json`
- `artifacts/demo-semantic-search/scene.json`

验证：
- 2 个 scene 生成成功。
- timeline overlap 负向回归 PASS。
- CI 的 `verify:p2` PASS。

### P3 — DONE
产物：
- `artifacts/demo-semantic-search/visual.json`
- `artifacts/demo-semantic-search/audio.json`
- `artifacts/demo-semantic-search/timeline.json`

验证：
- VisualSpec、AudioSpec、统一时间轴均可生成。
- 非法 audio timing 负向回归 PASS。
- CI 的 `verify:p3` PASS。

### P4 — IN PROGRESS
已完成：
- Remotion 4.0.534 依赖锁定。
- Scene DSL → Remotion composition。
- 最小 1280×720 / 30fps render fixture。
- MP4 + ffprobe 验收脚本。

已发现并修复：
- entrypoint 缺少 `registerRoot()`。

当前状态：
- 修复后的 CI 正在验证真实 MP4 输出；尚未标记 DONE。

### P5 — DONE
已完成：
- Scene DSL → RenderIR。
- RenderIR → HyperFrames HTML adapter。
- 对缺少 `visual.objects` 的 scene 做默认归一化。

已发现并修复：
- RenderIR scene graph 误套一层的嵌套问题。

验证：
- verify:p5 PASS（run 37738852451）。

### P6 — DONE
已完成：
- content / scene / timeline QC。
- downstream affected-node 计算。
- qc-report / rerun-plan 输出。

已发现并修复：
- CI 在干净环境没有先生成 P2 Scene Artifact。

验证：
- verify:p6 PASS（run 37738856901）。

### P7 — DONE
已完成：
- Artifact cache key。
- 多变体 delivery manifest。
- shared research/script cache reuse 验证。

验证：
- verify:p7 PASS（run 37738856901）。

## 当前最近提交

- P4 修复：`098c2f0515f215fc26022bfaadb1c52fe7af7950`
- P5 修复：`395fdca518b04c10c39c8e12ab07ea4a544993d5`
- P6 修复：`2a4bb16ef1f91ffb9d569cb559f037c8c63d4e08`

## 下一执行门

P5/P6/P7 对应 CI 已 PASS。P4 必须通过最新 ffmpeg 验收门后，才进入统一生产链整合；之后再实现真实 Agent provider、真实 TTS、视觉素材 provider 和批量 render scheduler。
