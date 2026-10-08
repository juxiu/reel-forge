# Reel Forge 生产化实施计划

## 目标

把 Reel Forge 做成真正可用的 Agent-native 视频生产系统：

```
自然语言需求
  ↓
Production Director / Agent Runtime
  ↓
Research → Script → Claim QA
  ↓
Beat Graph → Storyboard → Visual Plan
  ↓
真实 TTS → Word Alignment → Captions
  ↓
Parallel Scene / Asset Build
  ↓
Scene DSL → RenderIR
  ↓
Remotion / HyperFrames
  ↓
Pixel / Motion / Editorial QC
  ↓
Scoped Repair → Re-render
  ↓
Multi-ratio Delivery → Artifact Archive
```

目标不是保留现有 MVP，而是**以最终产出质量为唯一主线重建**。现有代码只在符合新目标时复用；违背目标的 fixture、伪实现、重复契约和过渡层直接删除。

## 设计边界

1. Agent/Skill 负责理解、研究、规划、判断和修复；不直接输出最终 renderer code。
2. Typed Artifact Contract 是所有 Agent、Provider、Renderer 之间的唯一稳定边界。
3. 所有真实媒体时间必须来自真实音频/ASR；禁止按字数、字符数或场景时长伪造 word timing。
4. Provider 可替换；上层不绑定具体 TTS、ASR、图片、数字人或 renderer。
5. 每个阶段必须产生真实可检查的 Artifact，并有自动化验收和负向回归。
6. 高成本或不可逆步骤必须有 approval gate。
7. QC 必须能够定位问题并驱动 scoped repair，而不是只生成报告。
8. 任何“mock/fixture simulation”只能用于单元测试，不能冒充阶段完成。
9. 不复制参考项目的受许可证约束代码、资产或私有配置，只吸收公开方法和质量标准。

## 生产阶段

### P1 — Agent Runtime + Production Director

**结果：** 输入一句项目需求，可以启动一个有状态、可恢复、可观察的生产任务。

实现：
- Agent/Skill registry
- Project / Execution Context
- Typed input/output contract
- Production Director
- Provider registry
- approval gate
- structured event log
- failure / retry / cancellation
- artifact handoff

验收：
- 自然语言请求可以启动 Director。
- Director 至少调用两个真实能力。
- 每次调用都有输入、输出、状态和 Artifact。
- 失败不会产生伪成功 Artifact。
- approval 可以暂停/恢复。

---

### P2 — Real Research + Script + Claim Graph

**结果：** 输入主题得到可追溯、可审计的研究和脚本，而不是 fixture。

实现：
- source provider
- source fetch / metadata
- claim extraction / dedupe
- claim → source evidence
- research cache
- script generation
- content QA
- source coverage gate

验收：
- 每个事实 claim 都有 source。
- 无证据 claim 不得进入脚本。
- source failure 可观察。
- 相同输入可复用 research cache。

---

### P3 — Real TTS + Word Alignment + Captions

**结果：** 得到真实音频、词级时间戳和可交付字幕。

实现：
- TTS provider adapter
- voice manifest
- audio normalization / probe
- word-level timing
- ASR verification
- phrase segmentation
- SRT / VTT / JSON
- caption QC

硬规则：
- 禁止按字数估算时间。
- TTS 失败不得静默 fallback 到未授权 provider。
- 字幕只允许消费真实音频时间轴。

验收：
- WAV/MP3 等真实音频存在且可 probe。
- duration 与媒体一致。
- word timing 可追溯到真实 provider/ASR。
- caption QC 能发现阅读速度、孤立词、跨屏、术语异常。

---

### P4 — Director / Beat Graph / Visual & Motion System

**结果：** Agent 能描述“如何讲”和“如何动”，而不是生成一堆静态 Scene。

实现：
- Beat Graph
- Rich Storyboard
- visual metaphor
- hero/supporting elements
- state change
- camera motion
- text role
- asset requirements
- lighting / composition
- chapter transitions
- visual primitives
- motion vocabulary
- Anti-PPT lint
- 至少一套知识解释视频 style preset

验收：
- 每个 beat 有 narrative job、主运动对象、状态变化、时间区间、视觉层级、运动、文字角色、素材需求。
- Scene DSL 不包含 renderer-specific code。
- 同一 Scene DSL 可切换 style preset。
- motion lint 能识别静态/模板化幻灯片风险。

---

### P5 — Preview Gate + Parallel Build + Real Render

**结果：** 先低成本确认视觉方向，再并行生产全片。

实现：
- 30 秒 preview
- human approval
- build groups
- task queue
- dependency resolver
- worker concurrency
- artifact lock
- shared cache
- retry / failure isolation
- Remotion renderer
- HyperFrames renderer adapter/backend

验收：
- Preview 使用真实 TTS 和最终 renderer。
- reject 只影响相关节点。
- 至少 3 个独立 build group 真正并行。
- 单 group 失败不污染其他 group。
- 同一 RenderIR 至少支持 Remotion 和 HyperFrames 两条执行路径。
- 16:9 / 9:16 都能真实 render，而不是只生成 manifest。

---

### P6 — Pixel / Motion / Editorial QC + Repair Loop

**结果：** 成片不只是“文件存在”，而是机器能判断是否合格并自动修复。

QC 层：
1. Contract
2. Claim / Content
3. Scene / Timeline
4. Audio / Caption
5. Pixel
6. Motion
7. Editorial
8. Delivery

至少检测：
- black/freeze frame
- text overflow
- safe area
- subtitle collision
- hero/object size
- visual density
- excessive glow / transition
- motionless beat
- flicker / render artifact
- audio/video stream integrity
- duration / fps / resolution

Repair loop：

```
Render v1
  ↓
QC / Issue Graph
  ↓
Repair Agent
  ↓
Scoped Rerun
  ↓
Render v2
  ↓
QC
  ├─ PASS → Delivery
  └─ FAIL → bounded retry / human gate
```

验收：
- 每个 FAIL 都关联 Artifact/node。
- Repair 只修改受影响节点。
- 未受影响 Artifact 保持 cache hit。
- pixel 和 motion 都有 negative regression。
- retry budget 超限自动暂停。

---

### P7 — Persistent Production + Delivery

**结果：** 从一次性 CI demo 变成可以长期运行、恢复和交付的生产系统。

实现：
- persistent job state
- artifact/object store
- cache index
- resumable execution
- distributed locks
- job history
- cleanup policy
- checksum
- delivery manifest
- archive

验收：
- 进程中断后可恢复。
- 已完成 Artifact 不重复生产。
- 多 worker 不重复执行同一节点。
- 16:9、9:16 交付物均通过媒体 probe 和 QC。
- 最终包至少包含 MP4、metadata、QC report、manifest、checksums。

## 依赖

```
P1 Agent Runtime
 ├── P2 Research / Script
 ├── P3 TTS / Captions
 └── P4 Director / Visual
        ↓
       P5 Preview / Parallel Build / Render
        ↓
       P6 QC / Repair
        ↓
       P7 Persistent Production / Delivery
```

P2、P3、P4 可以并行开发；P5 需要三者的最小可用能力。

## 统一完成定义

阶段只有同时满足以下条件才能标记 DONE：

- 真实能力已运行，不以 fixture 冒充。
- Artifact contract 已验证。
- 有成功路径和至少一个负向回归。
- 有失败状态与可观察日志。
- 真实媒体产物存在时必须经过 probe。
- CI 在该阶段 commit 上通过。
- 文档记录产物、验证结果和已知限制。

## 参考资料

详细来源见 `docs/REFERENCES.md`：

- anything2explainer：Research → Narration → Storyboard → parallel build → render → quantitative QC → repair，以及 30 秒 preview gate。
- Pluvio/rnskill：Skill contract、Production Director、Skill chaining、IndexTTS2、真实音频词级时间戳、字幕 QC、HyperFrames、生产状态和归档。

## 结果导向

最终验收标准不是“所有模块都有”，而是：

> 给定一个主题或脚本，系统能够完成研究/脚本、真实配音、词级字幕、视觉导演、并行镜头生产、真实渲染、像素/运动/编辑 QC、局部自动修复，并稳定交付 16:9 与 9:16 成片。

任何不能服务这个结果的抽象、兼容层、demo artifact 或重复实现都应删除，而不是继续维护。
