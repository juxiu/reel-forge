# Reel Forge 实施计划

## 目标

将 Reel Forge 从“可重复验证的视频生产管线 MVP”升级为真正可生产视频的 Agent-native Video Production Engine。

最终目标：

~~~text
User Intent
  ↓
Production Director / Agent Runtime
  ↓
Research → Script → Content QA
  ↓
Beat Graph → Storyboard → Visual Planning
  ↓
Real TTS → Word Alignment → Captions
  ↓
Parallel Scene / Asset Agents
  ↓
Scene DSL → RenderIR
  ↓
Remotion / HyperFrames
  ↓
Pixel / Motion / Editorial QC
  ↓
Scoped Repair → Re-render
  ↓
Multi-ratio Delivery / Artifact Archive
~~~

核心原则：

1. Agent 负责意图理解、研究、规划、判断和修复建议；不直接生成最终渲染代码。
2. Skill/Agent 必须有明确输入、输出、质量门和 Artifact。
3. Scene DSL / RenderIR 是 AI 与 Renderer 的稳定边界。
4. 真实媒体时间必须来自真实音频/ASR，不允许用字数或场景时长伪造词级时间戳。
5. 所有生产阶段都必须有自动化验证；验证失败不得进入下一阶段。
6. QC 不只是报告问题，还必须能生成受影响节点的 scoped repair/rerun。
7. 高成本或不可逆步骤必须有明确的人机确认 Gate。
8. Provider 必须可替换：TTS、ASR、图片、素材、数字人、Renderer 不得污染上层 Artifact Contract。
9. 参考项目只吸收公开的工程方法和质量标准，不复制受许可证限制的代码、资产或私有配置。

## 既有基础里程碑：P0–P7

P0–P7 已完成并保留为历史基线，不重新执行为新的生产目标。

| 阶段 | 已完成内容 | 状态 |
|---|---|---|
| P0 | 基线、契约、CI、fixture、计划 | DONE |
| P1 | Research → Script → Content QA | DONE |
| P2 | Director → Storyboard → Scene DSL | DONE |
| P3 | Visual / Audio / Timeline | DONE |
| P4 | Remotion 真实 render + ffprobe | DONE |
| P5 | RenderIR + HyperFrames adapter | DONE |
| P6 | QC + affected downstream / rerun plan | DONE |
| P7 | Batch manifest + artifact cache model | DONE |

历史验收：
- verify run 37739025568：SUCCESS
- verify-advanced run 37739025480：SUCCESS

注意：P0–P7 的 DONE 代表 MVP 架构闭环已验证，并不代表真实 Agent、真实 TTS、Pixel QC、生产调度等能力已经完成。

# 新生产化计划

## P8 — Agent Runtime / Skill Contract

### 目标

把当前 deterministic demo workflow 升级为真实 Agent/Skill 可调用的生产运行时。

### 主要内容

- Agent Runtime
- Production Director
- Skill registry
- Skill input/output contract
- provider registry
- execution context
- approval gate
- artifact handoff
- structured logs
- failure / retry contract

### 主要产物

- contracts/agent.schema.json
- contracts/skill.schema.json
- contracts/project.schema.json
- src/agents/
- src/providers/
- src/runtime/
- src/director/

### 验收门

- 一个自然语言项目请求可以启动 Director。
- Director 能按 Artifact 依赖调用至少两个真实下游能力。
- Skill 输入输出均通过 schema。
- 失败节点可以被定位，不会产生伪成功 Artifact。
- approval gate 可以暂停和恢复执行。

## P9 — Real Research / Claim Graph

### 目标

把 fixture research 替换为真实可追溯的 Research pipeline。

### 主要内容

- web/source provider
- source fetch
- source metadata
- claim extraction
- claim/source attribution
- deduplication
- confidence / evidence
- research cache

### 主要产物

- src/research/
- contracts/source.schema.json
- contracts/claim.schema.json
- artifacts/*/research.json

### 验收门

- 给定主题能够产生真实 sources 和 claims。
- 每个事实 claim 都可追溯到 source。
- 无 source 的事实不得进入最终 Script。
- source 失败时有明确失败状态。
- 相同 research 输入能够命中 cache。

## P10 — Real TTS / Word Alignment

### 目标

建立真实音频生产能力，彻底移除 P3 中的估算式 AudioSpec。

### 主要内容

- TTS provider adapter
- voice manifest
- audio artifact
- duration probe
- word-level timestamps
- ASR fallback/verification policy
- audio normalization
- voice reproducibility metadata

### 主要产物

- src/audio/
- src/providers/tts/
- contracts/voice-manifest.schema.json
- contracts/word-timing.schema.json
- audio.wav
- voice_manifest.json
- word-timestamps.json

### 验收门

- 输出真实音频。
- 总 duration 与媒体 probe 一致。
- word timestamps 来自真实音频/真实 provider 或 ASR。
- 禁止按字数估算时间。
- voice/provider 参数可追溯。
- TTS provider 失败时不能静默换成未授权 fallback。

## P11 — Caption Pipeline

### 目标

建立从最终音频到词级/句级字幕和字幕 QC 的完整链路。

### 主要内容

- word timestamps → phrase segmentation
- SRT / VTT / JSON
- reading-speed QC
- orphan word QC
- terminology QC
- safe-area validation
- caption rendering preview

### 主要产物

- captions_words.json
- captions.json
- captions.srt
- caption-qc.json

### 验收门

- 字幕必须由最终音频时间戳驱动。
- 阅读速度、跨屏、孤立词等异常能被发现。
- 字幕安全区不能越界。
- 代表帧 preview 与全量渲染规则一致。

## P12 — Director / Beat Graph / Rich Storyboard

### 目标

将当前简单 SceneSpec 升级为真正的视觉导演系统。

### 主要内容

- narrative beat graph
- visual metaphor
- hero / supporting elements
- state change
- camera motion
- text role
- asset requirement
- lighting / composition
- chapter transition
- Anti-PPT constraints

### 主要产物

- contracts/beat.schema.json
- contracts/storyboard-v2.schema.json
- artifacts/*/beats.json
- artifacts/*/storyboard-v2.json

### 验收门

每个 beat 至少明确：
- narrative job
- 主运动对象
- 状态变化
- 时间区间
- 视觉层级
- 镜头/运动
- 文本角色
- 素材需求

并能自动检测静态幻灯片式镜头风险。

## P13 — Visual Primitive / Motion System

### 目标

建立真正可复用的视觉和动效基础设施，而不是让 Agent 每次从零生成视觉代码。

### 主要内容

- typography primitives
- card / diagram / chart
- icon / illustration slot
- camera system
- parallax
- lighting / glow
- transitions
- background system
- subtitle primitives
- chapter system
- motion vocabulary
- Anti-PPT lint

### 主要产物

- src/visual/
- src/motion/
- contracts/motion.schema.json
- primitive catalog
- visual style presets

### 验收门

- 同一 Scene DSL 可以通过不同 primitive/style preset 得到一致但可替换的视觉结果。
- 不允许直接把最终 renderer code 暴露给 LLM。
- motion lint 能发现过度静态镜头。
- 至少完成一个可用于知识解释视频的完整 visual preset。

## P14 — 30 秒 Preview Gate

### 目标

在完整生产前建立低成本视觉方向确认机制。

### 流程

~~~text
Script
 ↓
TTS
 ↓
Beat Graph
 ↓
首组 Scenes
 ↓
30s Preview
 ↓
Human Approval
 ├─ reject → 修正 Director / Visual Plan
 └─ approve → P15 Full Build
~~~

### 验收门

- preview 使用真实 TTS。
- preview 使用最终 renderer。
- preview 的 style/config 可以锁定为 project contract。
- reject 后只重跑受影响节点。
- 未通过 approval 不允许进入全片 production。

## P15 — Parallel Agent Build

### 目标

把 P7 的 batch/cache model 升级为真正的并行 Agent 生产。

### 主要内容

- build groups
- task queue
- dependency resolver
- worker concurrency
- artifact lock
- retry
- failure isolation
- result aggregation
- shared Artifact cache

### 主要产物

- src/scheduler/
- src/workers/
- contracts/build-group.schema.json

### 验收门

- 至少 3 个独立 scene/build group 可以并行执行。
- shared research/script/artifact 只生产一次。
- 单个 group 失败不会污染其他 group。
- retry 只重试失败节点。
- worker 完成后由 Director/aggregator 统一收组。

## P16 — Pixel / Motion / Editorial QC

### 目标

从当前结构 QC 升级为真正针对成片的多层质量体系。

### QC 层

1. Contract QC
2. Content / Claim QC
3. Scene / Timeline QC
4. Audio / Caption QC
5. Pixel QC
6. Motion QC
7. Editorial QC
8. Delivery QC

### 检测范围

- black frame
- freeze frame
- text overflow
- safe-area violation
- subtitle collision
- hero/object size
- visual density
- excessive glow
- motionless beat
- excessive transition
- flicker / rendering artifact
- audio/video stream integrity
- duration / fps / resolution

### 验收门

- 每个 QC 都有机器可执行结果。
- FAIL 必须关联具体 Artifact/node。
- 至少有一个 pixel-level negative regression。
- 至少有一个 motion-level negative regression。

## P17 — QC Repair / Scoped Re-render Loop

### 目标

把 P6 的 rerun-plan 从“计划文件”升级成真正执行闭环。

### 流程

~~~text
Render v1
 ↓
QC
 ↓
Issue Graph
 ↓
Repair Agent
 ↓
Scoped Rerun
 ↓
Render v2
 ↓
QC
 ↓
PASS → Delivery
FAIL → bounded retry / human gate
~~~

### 验收门

- QC 问题可以自动定位到 node。
- Repair Agent 只修改受影响 Artifact。
- 上游未受影响 Artifact 保持 cache hit。
- 最大 retry 次数可配置。
- 超过 retry budget 必须暂停并进入人工确认。

## P18 — Real HyperFrames Backend

### 目标

将 P5 的 adapter evaluation 升级为真正可执行的 HyperFrames backend。

### 主要内容

- RenderIR → HyperFrames project
- HyperFrames runtime invocation
- project validation
- render
- media probe
- error mapping
- backend parity tests

### 验收门

- 同一 RenderIR 可通过 Remotion 和 HyperFrames 输出有效视频。
- 两个 backend 的核心 timeline contract 一致。
- backend failure 可以映射回 Artifact/node。
- HyperFrames 输出通过 ffprobe + QC。

## P19 — Persistent Scheduler / Artifact Store

### 目标

从 CI 中的脚本式调度升级为可恢复的长期生产系统。

### 主要内容

- persistent job state
- object storage
- artifact manifest
- cache index
- resumable execution
- distributed locks
- retry budget
- job history
- cleanup policy

### 验收门

- 进程中断后可以恢复。
- 已完成 Artifact 不重复生产。
- 多 worker 不重复执行同一 Artifact。
- 任意项目可以通过 manifest 重建生产状态。

## P20 — Multi-ratio Delivery / Production Packaging

### 目标

真正完成生产交付，而不是只生成 delivery manifest。

### 支持

- 16:9
- 9:16
- 1:1（如适用）

### 主要内容

- ratio-aware layout
- responsive Scene DSL
- captions per ratio
- final encode
- media probe
- delivery manifest
- checksum
- archive

### 验收门

- 16:9 与 9:16 都是真实渲染，而非 manifest-only。
- 关键视觉主体在不同画幅下不越界。
- 字幕安全区正确。
- 最终 MP4、metadata、QC report、manifest 一起交付。

# 生产化阶段的依赖关系

~~~text
P8 Agent Runtime
 ├── P9 Research
 ├── P10 TTS
 │    └── P11 Caption
 └── P12 Director
      └── P13 Visual / Motion
           └── P14 Preview Gate
                └── P15 Parallel Build
                     └── P16 Pixel / Motion / Editorial QC
                          └── P17 Repair Loop
                               ├── P18 HyperFrames
                               └── P19 Persistent Scheduler
                                    └── P20 Delivery
~~~

可以并行推进：
- P9 Research
- P10 TTS
- P13 Visual primitives
- P18 HyperFrames

但 P14 之前必须同时具备 P10 + P12 + P13 的最小可用能力。

# 每阶段统一完成定义

一个新阶段只有同时满足以下条件才能标记 DONE：

1. 代码/契约已提交。
2. 有最小可运行 fixture。
3. 有真实能力验证，不以 mock/fixture simulation 冒充真实 provider 能力。
4. 有自动化 verify 命令。
5. 有至少一个 negative regression。
6. CI 在对应 commit 上通过。
7. 产物路径明确。
8. 失败状态可观察。
9. 不破坏前一阶段的 Artifact Contract。
10. 阶段结果记录到 docs/EXECUTION_LOG.md。

# 与参考资料的对应关系

| Reel Forge | anything2explainer | Pluvio/rnskill |
|---|---|---|
| P8 Agent Runtime | Agent workflow | Production Director / Skill chaining |
| P9 Research | Research | 选题/内容上游能力 |
| P10 TTS | TTS / narration | IndexTTS2 |
| P11 Caption | word-level timing | audio-to-subtitles |
| P12 Director | Storyboard / visual planning | rn-motion-director |
| P13 Motion | motion grammar / primitives | HyperFrames motion Skills |
| P14 Preview | 30s preview gate | 人机确认 gate |
| P15 Parallel Build | G1…Gn parallel build | Skill orchestration |
| P16 QC | frame/motion/selfcheck | 多层生产 QC |
| P17 Repair | QC → repair → rerender | Director 路由修复 |
| P18 HyperFrames | renderer workflow | HyperFrames |
| P19 Scheduler | artifact/cache model | queue / project state |
| P20 Delivery | final render | production director / archive |

# 当前真实状态

**已完成：P0–P7 MVP 架构闭环。**

**下一目标：P8–P20 生产化闭环。**

当前最关键的三个未完成能力：

1. **真实 Agent / Production Director**
2. **真实 TTS + word-level alignment**
3. **真实 Visual/Motion + Pixel/Motion QC**

完成 P8–P17 后，Reel Forge 才达到“给一个主题/脚本，可以自主生产、质检、局部修复并交付视频”的核心目标。

P18–P20 则负责把它从单机/实验性生产能力提升到可长期运行的生产基础设施。
