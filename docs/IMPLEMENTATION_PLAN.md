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
| P4 | Remotion Renderer | render output MP4 + metadata | npm run verify:p4 | DONE |
| P5 | HyperFrames Adapter | RenderIR + adapter contract | npm run verify:p5 | DONE |
| P6 | QC Pyramid / 局部重跑 | qc-report.json + rerun plan | npm run verify:p6 | DONE |
| P7 | 批量生产 | artifact graph + cache + delivery | npm run verify:p7 | DONE |

## 可并行执行的工作流

- core：P0 → P1 → P2 → P3
- renderer：P4 Remotion
- backend：P5 HyperFrames
- quality：P6 QC / scoped rerun
- scale：P7 batch / cache

只有对应阶段验收门通过，阶段才标记 DONE。

## 阶段依赖

```
P0
 ├── P1
 ├── P2
 └── P3
      ├── P4
      ├── P5
      └── P6
            ↓
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

### P4 — DONE
已完成：
- Remotion 4.0.534 依赖锁定。
- Scene DSL → Remotion composition。
- 1280×720 / 30fps render fixture。
- MP4 + ffprobe 验收脚本。
- CI 自动安装 ffmpeg 并执行真实 render。

验证：
- 最新 workflow run 37739025568 SUCCESS。
- core、Remotion、HyperFrames 均通过。
- Remotion 真实输出 `artifacts/render/demo.mp4`，180 frames、约 25.4 KB。
- 原 entrypoint 缺少 `registerRoot()` 的问题已修复。

### P5 — DONE
已完成：
- Scene DSL → RenderIR。
- RenderIR → HyperFrames HTML adapter。
- 对缺少 `visual.objects` 的 scene 做默认归一化。

验证：
- verify:p5 PASS。
- 最新主流水线中的 HyperFrames job PASS。

### P6 — DONE
已完成：
- content / scene / timeline QC。
- downstream affected-node 计算。
- qc-report / rerun-plan 输出。

验证：
- verify:p6 PASS。
- scoped rerun 负向验证 PASS。

### P7 — DONE
已完成：
- Artifact cache key。
- 多变体 delivery manifest。
- shared research/script cache reuse 验证。

验证：
- verify:p7 PASS。
- batch/cache job PASS。

## 最终状态

P0–P7 全部通过验收，仓库已经形成可重复验证的 MVP 闭环：

Research → Script → QA → Director → Storyboard → Scene DSL → Visual/Audio/Timeline → Remotion/RenderIR → QC → Batch/Cache

## 后续生产化范围

后续不再是本次 MVP 的验收阻塞项，主要包括：
- 真实 LLM Agent/provider 接入。
- 真实 TTS provider 和 word-level timestamps。
- 真实视觉素材/stock/image provider。
- 真正的并行 artifact scheduler、retry、持久化缓存与对象存储。
- 完整 editorial QC 与人机协作流程。
