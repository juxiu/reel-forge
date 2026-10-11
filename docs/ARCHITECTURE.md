# 系统架构

> 本文只描述**现在真实存在**的模块、调用关系与数据流。每条结论都指向文件；任何「制度上应该有、代码里没有」的东西不写在这里，而写在 [VISUAL_GRAMMAR.md](VISUAL_GRAMMAR.md) 的「⚠ 只有 lint / 无执行者」列与 [knowledge/agent-protocol.md](knowledge/agent-protocol.md) §5。
>
> **临时运行模式（2026-10-11）**：GitHub Actions 工作流已移除；Remotion 当前只注册并输出 16:9。`fixtures/render-ir-9x16.json` 保留但不属于活动渲染、QC 或交付链。
>
> 一句话定位：**reel-forge = 一个 Agent Skill（判断）+ 一条确定性流水线（执行）**。Agent 负责语义判断（调研取舍、导演意图、QC 语义判定），脚本负责可复现的一切（时间轴、装配、渲染、测量、修复、交付）。二者的边界就是「同一输入是否必须得到同一输出」。

---

## 1. 分层总览

| 层 | 目录 / 文件 | 职责 | 确定性 |
|---|---|---|---|
| 入口层 | [SKILL.md](../SKILL.md)、[scripts/skill.mjs](../scripts/skill.mjs)、[scripts/checkpoint.mjs](../scripts/checkpoint.mjs) | Skill 定义、一键执行、人工确认点 | 半（Agent 驱动） |
| 编排层 | [src/director/pipeline.mjs](../src/director/pipeline.mjs)、[src/pipeline/stages.mjs](../src/pipeline/stages.mjs)、[src/runtime/checkpoints.mjs](../src/runtime/checkpoints.mjs)、[src/runtime/lock.mjs](../src/runtime/lock.mjs) | 阶段推进、checkpoint、项目锁 | 是 |
| Agent 层 | [src/agents/orchestrator.mjs](../src/agents/orchestrator.mjs)、[src/agents/task-brief.mjs](../src/agents/task-brief.mjs)、[src/providers/agent/](../src/providers/agent/) | 四个角色派单、任务书注入、provider 适配 | 部分 |
| 内容生产层 | [src/research/](../src/research/)、[src/director/](../src/director/)、[src/captions/](../src/captions/)、[scripts/tts_build.mjs](../scripts/tts_build.mjs)、[scripts/sync-script.mjs](../scripts/sync-script.mjs) | 调研、解说词、配音、时间轴、分镜 | 是 |
| 装配层 | [src/backends/render-ir.mjs](../src/backends/render-ir.mjs)、[src/shots/plan.mjs](../src/shots/plan.mjs)、[src/shots/stage-kit.jsx](../src/shots/stage-kit.jsx)、[src/shots/registry.jsx](../src/shots/registry.jsx) | RenderIR、镜头计划、舞台拓扑、镜头注册 | 是 |
| 渲染层 | [src/remotion/](../src/remotion/)、[scripts/render.sh](../scripts/render.sh)、[scripts/render-preview.mjs](../scripts/render-preview.mjs) | Composition、覆盖层、临时单比例（16:9）渲染 | 是 |
| 质量层 | [scripts/frame_metrics.py](../scripts/frame_metrics.py)、[scripts/motion_check.py](../scripts/motion_check.py)、[scripts/qc.mjs](../scripts/qc.mjs)、[scripts/plan-audit.mjs](../scripts/plan-audit.mjs)、[scripts/verify-*.mjs](../scripts/) | 测量、审计、门禁 | 是 |
| 修复层 | [src/repair/engine.mjs](../src/repair/engine.mjs)、[src/qc/flags.mjs](../src/qc/flags.mjs)、[scripts/repair.mjs](../scripts/repair.mjs)、[scripts/repair-cycle.mjs](../scripts/repair-cycle.mjs) | 缺陷分级、路由、定向修复 | 是 |
| 交付层 | [scripts/deliver.mjs](../scripts/deliver.mjs)、[src/delivery/package.mjs](../src/delivery/package.mjs)、[src/release/fingerprint.mjs](../src/release/fingerprint.mjs)、[scripts/verify-production.mjs](../scripts/verify-production.mjs) | checksum manifest、输入指纹、生产门 | 是 |

---

## 2. Agent 与脚本的边界

四个 Agent 角色（[src/agents/task-brief.mjs](../src/agents/task-brief.mjs)）：
`research-agent` / `director-agent` / `build-agent` / `qc-agent`。派单走
[orchestrator.mjs](../src/agents/orchestrator.mjs)，任务书由 `buildTaskBrief(role, …)` 在**唯一一处**注入，
调用点不再各拼一份（否则会出现第四份硬编码）。

- **Agent 判定**：调研取舍、导演意图（每镜叙事任务与视觉机制）、QC 的语义维度（遮挡、审美、标签该不该出现）。
- **脚本判定**：时间轴解算、帧号、装配、渲染、像素测量、checksum、指纹比对。这些不交给 Agent，因为「同一输入必须得到同一输出」。
- **provider 形态**：`src/providers/agent/` 提供 `command`（外部 CLI）与默认实现；开关是四个 `AGENT_*` 环境变量。
- **降级**：provider 未配置时，`runNamedAgents` 返回 `status: "skipped"` 的三态信封（completed / skipped / failed），
  deterministic builder 仍能产出，但产物必须标 `agent_mode=deterministic` —— 不把「没跑 Agent」伪装成「Agent 通过了」。

三态信封定义见 [agent-protocol.md](knowledge/agent-protocol.md)；`AGENT_STRICT=1` 时 `skipped` 会升级为抛错。

---

## 3. 关键数据流

```text
fixtures/project.json            ← 作者源（含 hud / credit / chapterTech / rails 声明）
        │
        ├─ research ──→ artifacts/<pid>/research.json + research.md
        │
        ├─ narration ─→ script/narration.txt
        │                    │  tts_build.mjs（edge/kokoro/piper/kokoro_onnx/user-wav）
        │                    ▼
        │              public/audio.wav + script/timeline.json + fixtures/captions.json
        │                    │  sync-script.mjs（把自动分组字幕重写成句内对齐）
        │                    ▼
        │              fixtures/script.json   ← segments（句/段，1:1 于镜头）
        │                    │  materialize-ir.mjs（buildBeatGraph + beatToScene + toRenderIR）
        │                    ▼
        │              fixtures/render-ir-16x9.json / render-ir-9x16.json
        │                    │  每 scene 声明 variant / topology / composition / light / motion
        │                    ▼
        │              src/shots/registry.jsx ← scene-001…scene-044 → SCxx.jsx
        │                    │
        │                    ▼
        │              render.sh → artifacts/render/reel-forge-16x9.mp4
        │                    │  frame 导出 → artifacts/frames/<ratio>/f_*.png
        │                    ▼
        │              qc.mjs → frame_metrics / motion_check / visual_regression / text_provenance
        │                    │  plan-audit.mjs 必须先落盘（否则 qc 报 plan_audit_missing）
        │                    ▼
        │              repair.mjs / repair-cycle.mjs → repair/{status,plan,source-repair}.json
        │                    │
        │                    ▼
        └───────────── deliver.mjs → artifacts/delivery/<pid>/delivery-manifest.json（sha256+size）
                             │
                             ▼
                       verify-production.mjs：核对指纹 + 媒体属性 + 全部阻断门
```

**唯一时间基准**：`script/timeline.json`（由真实音频的 WordBoundary 解出）。字幕、HUD、流程轨、章节卡、
镜头区间全部由**句 id → 帧号**解出（`rails` 的 `fromS/switchS/toS`、`chapterTech` 的章序、`hud` 的 `fromS/toS`），
所以换配音/改词时整条链跟着走；没跑 TTS 时没有帧可解，这些层是休眠的（不报错、不静默写死帧号）。

---

## 4. 重要 artifact 清单

| artifact | 生产者 | 消费者 |
|---|---|---|
| `artifacts/<pid>/research.json` / `research.md` | `run-production.mjs` / `research-md.mjs` | 溯源门、QC、交付 |
| `script/timeline.json` | `tts_build.mjs` | `sync-script`、`materialize-ir`、`verify-timeline*`、Root 装配 |
| `fixtures/script.json` | `sync-script.mjs` | `materialize-ir`、beat graph、语义导演 |
| `fixtures/render-ir-*.json` | `materialize-ir.mjs` | 渲染层、`plan-audit`、`verify-*` |
| `artifacts/<pid>/beats.json` / `scenes.json` | `materialize-ir.mjs` | QC、分镜生成、审计 |
| `artifacts/<pid>/qc/plan_audit.json` | `plan-audit.mjs` | `qc.mjs`（缺失即阻断） |
| `artifacts/<pid>/qc/{frame_metrics,motion,visual_regression,text_provenance}_*.json` | python 测量层 | `qc.mjs`、`verify-production` |
| `artifacts/<pid>/qc/report.json`（含 `input_fingerprint`） | `qc.mjs` | `deliver`、`verify-production` |
| `artifacts/<pid>/repair/{status,repair-plan,source-repair}.json` | `repair.mjs` | `verify-production`、审计 |
| `artifacts/render/reel-forge-16x9.mp4`（9:16 暂停） | `render.sh` | QC、交付 |
| `artifacts/delivery/<pid>/delivery-manifest.json` | `deliver.mjs` | `verify-production`（逐文件 sha256+size） |
| `artifacts/<pid>/storyboard.md` | `storyboard-gen.mjs` | 人工审阅（导演意图文档） |
| `artifacts/deliver/sheet-16x9.html` | `sheet-gen.mjs` | QC 通读全片（接在 `render.sh` 尾部） |

---

## 5. 门禁与失败恢复

### 5.1 三道门，三种强度

1. **`verify:fast`（36 项，~7 s）** —— 不需要任何运行产物。判契约、源码自洽、分组公式、镜头拓扑、
   字幕预算、TTS dispatch、溯源字面量登记、画面语法。绿色只代表「链路完整、结构自洽」，**不代表成片达标**。
2. **`verify:production`（生产门）** —— 需要真实 mp4 + 全套 QC 产物。除媒体属性与阻断门之外，还比
   **输入指纹**：`qc/in/report.json` 里的 `input_fingerprint` 必须等于当前 `releaseFingerprint()`。
   这条是 2026-10-08 事故的直接产物（4 镜旧产物配 44 镜新 IR 仍报 PASS）。
3. **`perf:probe`** —— 30 帧测渲 ≥3 fps（对齐 a2e BUILD_RULES §4/§6），防止重口味效果把全片渲染拖慢 10–50 倍。

### 5.2 恢复机制

- **checkpoint**：[src/runtime/checkpoints.mjs](../src/runtime/checkpoints.mjs) 记四个确认点的状态；
  `npm run checkpoint -- <name> approved`，`--resume` 从中断处继续，workspace 保留到结束。
- **项目锁**：`FileLock.forProject()` 阻止同一 project 并发写（`run-production` 全程持锁）。
- **指纹**：[src/release/fingerprint.mjs](../src/release/fingerprint.mjs) 覆盖 IR、44 个镜头源、stage、
  narration、storyboard、captions、visual-literals —— 任何输入改动都会让旧产物失效并被生产门拦下。
- **修复闭环**：`repair.mjs` 按 `flags.mjs` 的 token 分级路由；`source-repair.json` 记录**改了什么源码**，
  杜绝「只改报告状态、不改画面」的假通过路径。

---

## 6. 为什么这样分层（可检验的设计理由）

- **Agent 与确定性脚本分离**：视频生产的可复现性要求「同一输入 → 同一输出」。语义判断（这句话该配什么画面）
  无法确定性化，就交给 Agent；一旦判断落成 artifact（IR / recipe / beats），后续全部可复算。
- **每镜独立源码 + 单一 `stage-kit`**：8 组各自手写私有图元模块会**漂移**（八份 `focusWalk` 各自演进，
  「紫只给当前重点」在第 5 组悄悄失效没人发现）。本仓库把共用拓扑抽成一份
  [stage-kit.jsx](../src/shots/stage-kit.jsx)（17 种拓扑），各组只留拓扑清单与镜头映射 ——
  这是与 a2e 的**有意差异**，理由是「重复的代价是漂移」。详见 [ANYTHING2EXPLAINER_PARITY 的差异节](ANYTHING2EXPLAINER_PARITY.md)。
- **`plan-audit` 必须先于 QC**：分镜层的自相矛盾（空洞/重叠/帧区间对不上）用不着先花 40 分钟渲染就能判出来。
  顺序由 `verify-skill.mjs` 第 4 节断言。
- **Visual Regression 是 advisory**：它的参考资产是 64×36 合成图、描述子是确定性像素特征而非语义模型，
  实测与画面质量**反向相关**（画面更密更实则分数更低），因此只作 run-to-run 漂移记录，不进完成定义。

---

## 7. 完整执行图（文本）

```text
[人工] length-language ─ narration-signoff ─ voiceover ─ pilot-preview
   │
   ├─ scaffold ──────────── package.json / Remotion Composition（仅 16:9，临时模式）
   ├─ research ──────────── research.json/.md（claims 带 source）
   ├─ narration ─────────── script/narration.txt（4 章 44 段，段落=画面单元）
   ├─ tts/timeline ──────── audio.wav + timeline.json + captions.json（真实 WordBoundary）
   ├─ storyboard ────────── script/storyboard_src.md → 分镜表.md（selfcheck 判 ≥120 帧 / hold ≥30）
   ├─ primitives ────────── Primitives / Fx / Icons / style.mjs
   ├─ pilot ─────────────── preview 30s + pilot approval（硬门禁）
   ├─ parallel-build ────── build-groups(8) → materialize-shots → registry.jsx
   ├─ render ────────────── render.sh → 16:9 mp4 → frames → sheet-gen（9:16 暂停）
   ├─ qc ────────────────── plan-audit → frame_metrics / motion / visual_regression / text_provenance → report.json
   ├─ repair ────────────── status / repair-plan / source-repair（含 rerender hook + 二轮 QC）
   └─ delivery ──────────── checksum manifest → verify:production
```

每一步的输入、输出、判断标准与失败路径写在 [PRODUCTION_METHOD.md](PRODUCTION_METHOD.md)。