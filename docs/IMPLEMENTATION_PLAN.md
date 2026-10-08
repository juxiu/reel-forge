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
| P3 | Visual/TTS/Timeline | visual.json, audio.json, timeline.json | npm run verify:p3 | TODO |
| P4 | Remotion Renderer | render output MP4 + metadata | npm run verify:p4 | TODO |
| P5 | HyperFrames Adapter | RenderIR + adapter contract | npm run verify:p5 | TODO |
| P6 | QC Pyramid / 局部重跑 | qc-report.json + rerun plan | npm run verify:p6 | TODO |
| P7 | 批量生产 | artifact graph + cache + delivery | npm run verify:p7 | TODO |

## 可并行执行的工作流

P1、P2、P3 的 Contract/Schema 可以并行设计，但只有通过上游 Artifact 验收后才允许接入生产链。

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

## 执行记录

### P0 — DONE
产物：
- `README.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/ARCHITECTURE.md`
- `contracts/research.schema.json`
- `contracts/script.schema.json`
- `fixtures/demo-input.json`
- `.github/workflows/verify.yml`
- `scripts/verify-p0.mjs`

验证：
- GitHub Actions workflow `verify` 成功。
- commit：`0970888c2e53417dbb3feee541d2fc3a14d15b2d`
- run：`37738234477`

### P1 — DONE
产物：
- `artifacts/demo-semantic-search/research.json`
- `artifacts/demo-semantic-search/script.json`
- `artifacts/demo-semantic-search/content-qa.json`
- `scripts/run-p1.mjs`
- `scripts/verify-p1.mjs`

验证：
- Research → Script → Content QA 成功。
- Claim coverage PASS。
- Content QA 负向回归通过。
- CI 的 `npm run verify:p1` 成功。

### P2 — DONE
产物：
- `artifacts/demo-semantic-search/director.json`
- `artifacts/demo-semantic-search/storyboard.json`
- `artifacts/demo-semantic-search/scene.json`
- `contracts/scene.schema.json`
- `scripts/run-p2.mjs`
- `scripts/verify-p2.mjs`

验证：
- Director → Storyboard → Scene DSL 成功。
- 产生 2 个 scene。
- timeline overlap 负向回归通过。
- CI 的 `npm run verify:p2` 成功。

### 下一执行单元
P3：VisualSpec + AudioSpec + TTS alignment + unified timeline。
完成后必须新增 `verify:p3` 并确认可生成对应 Artifact，才能进入 P4/P5。
