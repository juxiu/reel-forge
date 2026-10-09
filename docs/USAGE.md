# reel-forge Agent Skill 使用说明

## 1. 项目定位

reel-forge 是一个 **Agent-native 视频生产 Skill**，而不是单纯的视频编辑器、Remotion 模板或渲染脚本集合。

它的核心任务是：把一个知识主题、技术问题、标准、RFC、文章或网页资料，经过 Research、Narration、TTS/Timeline、Storyboard、镜头构建、双比例渲染、视觉/媒体质量检查、局部 Repair 和最终 Delivery，生产成可追溯的解释型视频。

~~~text
用户需求
  ↓
SKILL.md
  ↓
Agent
  ↓
Research
  ↓
Narration / Timeline
  ↓
G1…Gn Build Agent
  ↓
Authored Shots
  ↓
Render 16:9 + 9:16
  ↓
Frame Metrics / Motion / Visual Regression
  ↓
QC
  ↓
Repair / Recheck
  ↓
Delivery
~~~

项目最重要的入口是根目录的 <code>SKILL.md</code>。Agent 应先读取这个文件，再按照其中的生产协议执行。

## 2. Skill 与工程代码的分工

| 层 | 职责 |
| --- | --- |
| <code>SKILL.md</code> | Skill 行为、生产步骤、checkpoint、完成定义 |
| Agent | 需求理解、Research、Narration、导演、质量判断、Repair 决策 |
| Typed Artifact Contract | 阶段之间的稳定数据接口 |
| <code>scripts/</code> | 确定性物化、校验、渲染、QC、Repair、Delivery |
| <code>src/agents/</code> | Agent 编排、provider、运行状态 |
| <code>src/director/</code> | beat、scene、RenderIR |
| <code>src/shots/</code> | Authored Shot 与视觉渲染组件 |
| Remotion | 最终视频帧渲染 |

原则是：

> Agent 决定做什么、为什么做、哪里有问题；确定性脚本按照契约执行、验证和归档。

## 3. 环境要求

完整生产环境建议：

- Node.js 22
- npm
- Python 3.11
- FFmpeg
- <code>requirements.txt</code> 中的 Python 依赖

检查：

~~~bash
node --version
npm --version
python3 --version
ffmpeg -version
~~~

## 4. 获取与安装

~~~bash
git clone https://github.com/juxiu/reel-forge.git
cd reel-forge
git checkout feat/visual-benchmark-skill

npm install
pip install -r requirements.txt
~~~

首次安装后：

~~~bash
npm run verify:fast
npm run verify:authored-shots
~~~

这两项不需要运行产物。

**渲染、<code>verify:e2e</code> 与后续所有质量门需要 TTS 产物**（<code>public/audio.mp3</code>、<code>script/timeline.json</code>、<code>script/timeline.md</code>、<code>script/timeline-source.json</code>、<code>分镜表.md</code>）。这些由 <code>npm run tts</code> 与 <code>scripts/render_storyboard.py</code> 生成，已在 <code>.gitignore</code> 中排除——因为 <code>src/remotion/index.jsx</code> 会 import 时间轴、<code>&lt;Audio&gt;</code> 依赖配音文件，入库会造成"仓库里的样片产物与真实运行产物不同步"。

全新 clone 的正确顺序：

~~~bash
npm install
pip install -r requirements.txt
npm run verify:fast          # 无需 TTS
npm run tts# 生成配音与词边界时间轴
npm run run-production       # 生成调研 / claims / beats
npm run verify:e2e           # 端到端契约校验（需要以上产物）
~~~

## 5. 作为 Skill 使用

最重要的入口：

~~~bash
npm run skill -- "TOPIC" --source URL --auto-approve
~~~

示例：

~~~bash
npm run skill -- \
  "Explain HTTP Digest Fields" \
  --source https://www.rfc-editor.org/rfc/rfc9530.html \
  --auto-approve
~~~

其中：

- 主题字符串是本次生产任务；
- <code>--source</code> 指定 Research 来源；
- <code>--auto-approve</code> 用于 CI 或无人值守环境；
- 非 auto 模式会在人工 checkpoint 停止。

## 6. 输入项目配置

默认示例：

<code>fixtures/project.json</code>

典型配置：

~~~json
{
  "project_id": "digest-explainer",
  "request": "Explain how HTTP Digest Fields protect message integrity.",
  "language": "en",
  "target_ratios": ["16:9", "9:16"],
  "source_urls": [
    "https://www.rfc-editor.org/rfc/rfc9530.html"
  ],
  "duration_target_s": 40
}
~~~

生产输入应至少明确：

- 主题；
- 来源；
- 语言；
- 目标比例；
- 目标时长；
- 事实边界或额外要求。

## 7. Research

Research 建立：

~~~text
Claim
  ↓
Source
  ↓
Evidence
~~~

重点保留：

- 核心 claim；
- 权威来源；
- 对应证据；
- 专有名词；
- 数字和边界条件；
- 适合画面表达的机制。

目标是让 Narration、Storyboard 和 QC 都可以回溯到事实来源。

## 8. Narration

Research 完成后，Agent 将事实压缩成最终口播稿。

推荐关系：

~~~text
Research Claim
  ↓
Narration Segment
  ↓
Timeline
  ↓
Storyboard
  ↓
Scene
~~~

每个 narration segment 应有稳定 ID，并尽量关联 claim。

## 9. TTS 与真实时间轴

TTS 不只是生成音频。

生产时间轴统一以：

<code>tts-word-boundary</code>

为唯一生产口径。

禁止：

- 按字数估算时长；
- 按字符数制作假时间轴；
- 用伪造 ASR 数据冒充真实词边界。

当前支持的 TTS 能力：

~~~text
edge
kokoro
piper
kokoro_onnx
wav
~~~

Edge TTS 已加入缓存复用。

标准关系：

~~~text
TTS
  ↓
Audio
  ↓
Word Boundary
  ↓
Timeline
  ↓
Subtitle / Storyboard
~~~

## 10. Storyboard

Storyboard 不应简单地“一句话一个镜头”。

镜头围绕：

- 画面单元；
- 叙事任务；
- 视觉机制；
- 动作；
- settle；
- camera

进行组织。

当前示例：

<code>script/storyboard_src.md</code>

## 11. 四个人工 checkpoint

当前 Skill 保留：

1. <code>length-language</code>
2. <code>narration-signoff</code>
3. <code>voiceover</code>
4. <code>pilot-preview</code>

非交互环境必须显式批准或使用 <code>--auto-approve</code>。

例如：

~~~bash
npm run checkpoint -- length-language approved
npm run checkpoint -- narration-signoff approved
npm run checkpoint -- voiceover approved
npm run checkpoint -- pilot-preview approved
~~~

之后可以使用 <code>--resume</code> 继续 Skill。

## 12. Pilot

Pilot 是正式大规模渲染前的质量门。

~~~bash
npm run preview
npm run pilot
npm run checkpoint -- pilot-preview approved
~~~

Pilot 重点确认：

- 视觉风格；
- 字号；
- 主体大小；
- 节奏；
- 画面密度；
- 双比例适配风险；
- 前 30 秒整体观感。

## 13. Parallel Build

当前 Build Group：

~~~text
G1
G2
G3
G4
G5
G6
G7
G8
~~~

44-shot blueprint：

~~~text
G1 = SC01–SC06
G2 = SC07–SC12
G3 = SC13–SC18
G4 = SC19–SC24
G5 = SC25–SC30
G6 = SC31–SC36
G7 = SC37–SC42
G8 = SC43–SC44
~~~

因此：

- G1–G7 各 6 镜；
- G8 为 2 镜。

Build Agent 必须限制写入：

~~~text
G1 → src/shots/G1/**
G2 → src/shots/G2/**
…
Gn → src/shots/Gn/**
~~~

不得越权修改其它组。

## 14. Authored Shot

每个镜头都有独立源文件：

~~~text
src/shots/G1/SC01.jsx
src/shots/G1/SC02.jsx
…
src/shots/G8/SC44.jsx
~~~

每个 authored scene 应包含：

- shot ID；
- <code>SHOT_RECIPE</code>；
- variant；
- hero size；
- camera；
- settle frames；
- 导出函数。

当前硬规则：

~~~text
hero_size >= 170px
settle_frames >= 30
~~~

验证：

~~~bash
npm run verify:authored-shots
~~~

## 15. Visual Variant

当前主要变体：

~~~text
network
split
preference
structured
comparison
transformation
sequence
causal
evidence
code
~~~

典型用途：

| Variant | 适合表达 |
| --- | --- |
| network | 关系、传播、连接、数据流 |
| split | 两个概念、两种表示 |
| preference | 候选、偏好、协商 |
| structured | 字段、Schema、结构化机制 |
| comparison | 旧方案 / 新方案 |
| transformation | 输入 → 输出、状态变化 |
| sequence | 步骤链、处理流程 |
| causal | 原因 → 机制 → 结果 |
| evidence | Claim → Source → Evidence |
| code | 代码、算法、处理链 |

公共 primitive 可以复用，但镜头不应退化为所有场景都一样的 generic card。

## 16. Still Benchmark

每镜固定 6 个基础采样点：

~~~text
enter+1
enter-mid
entered
key
exit-mid
tail
~~~

用于检查进入、形成、关键帧、退出和尾帧稳定。

严格模式：

~~~bash
STRICT_STILLS=1
~~~

严格模式要求实际执行 still 渲染，而不只是检查 manifest。

## 17. 30 帧测渲

每组至少提供一个 30-frame test-render contract。

它检查的不是单张图片能否输出，而是：

~~~text
进场
  ↓
运动
  ↓
主体形成
  ↓
settle
~~~

因此 30 帧是镜头可渲染性与基本运动/稳定性的生产检查单元。

## 18. RenderIR

RenderIR 是导演层与 Remotion 层之间的稳定接口。

主要产物：

~~~text
fixtures/render-ir-16x9.json
fixtures/render-ir-9x16.json
~~~

负责表达：

- scene；
- duration；
- composition；
- hero；
- light；
- elements；
- motion；
- layout；
- footage。

生产目标是同时支持 16:9 和 9:16。

## 19. Render

通过 Pilot 和必要审批后：

~~~bash
npm run render
~~~

目标：

~~~text
16:9 master
9:16 master
~~~

不能把单比例成片直接当成完整双比例交付。

## 20. Frame Metrics / Motion

渲染后进行 frame-level 和 motion-level 检查：

~~~bash
npm run frame-metrics
npm run motion-check
~~~

重点包括：

- 主体位置；
- 亮度；
- 对比；
- 安全区；
- 字幕占位；
- 视觉密度；
- 动作是否与叙事任务相关；
- 动作速度与 settle。

## 21. Visual Benchmark / Regression

基准：

<code>fixtures/visual-benchmark.json</code>

Positive references：

~~~text
network-flow
structured-mechanism
transformation
~~~

Anti references：

~~~text
static-card
clutter
decorative-motion
~~~

当前视觉 embedding：

<code>visual-pixel-v2</code>

它主要用于确定性的视觉回归，不应描述成真正的语义视觉模型。

> 版本号不是装饰：v1 用 PIL 缩放并把像素量化成 uint8，v2 是纯标准库的双线性 + 面积平均、全程浮点。
> 两者的 cosine 读数不可比，所以 <code>fixtures/visual-benchmark.json</code> 的 <code>embedding</code> 必须等于
> <code>scripts/visual_regression.py</code> 的 <code>DESCRIPTOR</code>——不等时脚本直接拒绝运行，
> <code>npm run verify:visual-benchmark</code> 也会把这两处读出来对撞。

> **口径说明（重要）**：<code>fixtures/visual-references/</code> 里的正例/反例是 <strong>64×36 的 P3 PPM 合成图</strong>（3–30 种纯色），不是真实样片帧。实测显示：把画面做得更密、更实、更有真实文案后，<code>reference_similarity</code> 会<strong>下降</strong>（0.597 → 0.50），即该指标与画面质量反向相关。因此自 v2.0 起它标记为 <code>gate: "advisory"</code> / <code>blocking: false</code>，<strong>不再阻断交付</strong>，只作为 run-to-run 回归记录（报告含 <code>reference_similarity_delta</code>）。它的 PASS 不代表质量达标，只代表没有异常漂移。

典型调用：

~~~bash
npm run visual-regression -- \
  --frames artifacts/frames/16x9 \
  --render-ir fixtures/render-ir-16x9.json \
  --out artifacts/<project>/qc/visual_regression_16x9.json
~~~

9:16 同样执行。

## 22. Shot Score

Shot Score 汇总：

~~~text
semantic
hero
motion
composition
light
safety
reference_similarity
visual_complexity
text_density
hero_consistency
layout_stability
~~~

当前权重：

| 指标 | 权重 |
| --- | ---: |
| semantic | 0.16 |
| hero | 0.12 |
| motion | 0.14 |
| composition | 0.12 |
| light | 0.06 |
| safety | 0.10 |
| reference_similarity | 0.14 |
| visual_complexity | 0.05 |
| text_density | 0.03 |
| hero_consistency | 0.04 |
| layout_stability | 0.04 |

阈值：

~~~text
pass       = 0.72
reference  = 0.82
excellent  = 0.90
~~~

reference similarity 不替代结构化视觉规则。

<code>reference_similarity</code> 只作为加权分的一个维度参与，**不作为硬门**——原因见第21 节的基准口径说明。硬门是 <code>shot-score-too-low</code>（总分低于 0.72）。

当没有视觉回归报告时，该维度使用默认值 <code>0.72</code>；此时的总分**偏乐观**，不能当作已测量的质量分。

## 23. QC

完整质量链：

~~~text
Render
  ↓
Frame Metrics
  ↓
Motion
  ↓
画面文字出处（阻断）
  ↓
Agent QC
  ↓
QC
~~~

QC 应尽量定位到：

~~~text
scene
+
ratio
+
node
~~~

以便 Repair 做局部处理。

## 24. Repair / Recheck

失败时：

~~~text
QC FAIL
  ↓
Repair Plan
  ↓
Scoped Repair
  ↓
Rerender
  ↓
Recompute QC
  ↓
Recheck
~~~

必须保留：

~~~text
repair-plan.json
status.json
source-repair.json
~~~

Repair 的目标是局部修复，而不是无条件重新生成整个项目。

真改动只写 `fixtures/render-ir-16x9.json` / `fixtures/render-ir-9x16.json`（渲染层确实读这两个文件），
所以 `status.json` 的 `changed_nodes` 等于「下一帧真的会不一样」的镜头。

`source-repair.json` 是**源层待办清单**，不是写回记录，`writeback_count` 恒为 0：
`artifacts/<project_id>/beats.json` 每轮由 `buildBeatGraph(script, timeline)` 重新生成，
而且 `beatToScene` 不读 `beat.camera` / `beat.hero` —— 改那个文件不会改变画面。
分镜层改不动 IR 的问题（`hero-overlong`、`text-below-min`、`beat-window-overflow` 等）
记在 `entries` 里，由人或 agent 落到手写的 `script/storyboard_src.md` 与 `fixtures/script.json` 上。

沙盒跑法（不改仓库里的 fixtures，供 `npm run verify:repair` 用）：
`PROJECT_FILE=<项目文件> IR_DIR=<render-IR 目录> node scripts/repair.mjs`。

## 25. Lessons 闭环

目标：

~~~text
QC
  ↓
Repair
  ↓
Lesson
  ↓
未来 Build / Agent
~~~

持续沉淀：

- 哪类镜头容易失败；
- 哪类布局过密；
- 哪类 camera 在 9:16 容易失败；
- 哪类字幕位置容易碰主体；
- 哪类动作不足。

## 26. Footage / B-roll

真实素材统一接入：

<code>FootageTrack</code>

素材目录：

~~~text
public/assets/<slug>/
~~~

manifest 至少登记：

~~~text
source
sha
license
purpose
~~~

并限制：

~~~text
单帧最多 1 个 OffthreadVideo
~~~

不要在 JSX 中散落大量外部视频 URL。

## 27. Artifact 目录

生产产物统一归档：

~~~text
artifacts/<project_id>/
~~~

常见目录：

~~~text
research/
script/
beats/
scene/
render-ir/
audio/
build-groups/
runtime/
qc/
repair/
delivery/
~~~

这保证输入、中间结果、质量报告、修复和最终输出都可追溯。

## 28. Delivery

执行：

~~~bash
npm run deliver
npm run verify:delivery
~~~

Delivery 必须校验：

- 文件存在；
- 文件大小；
- SHA-256；
- manifest 与实际文件一致。

## 29. Final Production Gate

执行：

~~~bash
npm run verify:production
~~~

完成定义：

~~~text
双比例成片
+
Frame Metrics
+
Motion
+
画面文字出处
+
Shot Score
+
QC
+
Repair / Recheck
+
tts-word-boundary
+
Still Manifest
+
Delivery checksum
+
verify:production
~~~

只有全部通过后，才应报告：

~~~text
Production PASS
~~~

## 30. 完整手动流程

~~~bash
npm install
pip install -r requirements.txt

npm run verify:fast
npm run verify:authored-shots

npm run run-production

npm run tts
npm run verify:word-boundary
npm run asr-second-pass

npm run storyboard
npm run selfcheck

npm run materialize-ir
npm run build-groups
npm run materialize-shots

npm run verify:shots
npm run verify:authored-shots
npm run verify:scene-contract
npm run verify:shot-score

npm run preview
npm run pilot

npm run render

npm run frame-metrics
npm run motion-check
npm run visual-regression
npm run verify:text-provenance

npm run qc
npm run repair-cycle

npm run deliver
npm run verify:delivery
npm run verify:production
~~~

## 31. 常用命令速查

| 目的 | 命令 |
| --- | --- |
| 快速校验 | <code>npm run verify:fast</code> |
| authored shot 校验 | <code>npm run verify:authored-shots</code> |
| Skill 一键入口 | <code>npm run skill -- "TOPIC" --source URL --auto-approve</code> |
| Production 前半段 | <code>npm run run-production</code> |
| TTS | <code>npm run tts</code> |
| WordBoundary 校验 | <code>npm run verify:word-boundary</code> |
| 配音收口 / 二次校验 | <code>npm run asr-second-pass</code> |
| Storyboard | <code>npm run storyboard</code> |
| Storyboard 自检 | <code>npm run selfcheck</code> |
| 画面文字出处 | <code>npm run verify:text-provenance</code> |
| RenderIR | <code>npm run materialize-ir</code> |
| Build Groups | <code>npm run build-groups</code> |
| Shot 物化 | <code>npm run materialize-shots</code> |
| Preview | <code>npm run preview</code> |
| Pilot | <code>npm run pilot</code> |
| Render | <code>npm run render</code> |
| QC | <code>npm run qc</code> |
| Repair | <code>npm run repair-cycle</code> |
| Delivery | <code>npm run deliver</code> |
| 最终 Gate | <code>npm run verify:production</code> |

## 32. CI

快速 CI：

<code>.github/workflows/verify-fast.yml</code>

主要验证：

~~~text
npm install
npm run verify:fast
npm run verify:authored-shots
~~~

完整 CI：

<code>.github/workflows/verify.yml</code>

覆盖：

~~~text
contracts
→ runtime
→ Research
→ TTS
→ WordBoundary
→ Storyboard
→ Build
→ Pilot
→ Render
→ Frame Metrics
→ Motion
→ Visual Regression
→ Shot Score
→ QC
→ Repair
→ Delivery
→ Production Gate
~~~

因此：

> <code>verify:fast PASS</code> 不等于 <code>Production PASS</code>。

## 33. 当前 44-shot 状态

当前开发分支已经包含 44 个 authored scene source：

~~~text
G1/SC01–SC06
G2/SC07–SC12
G3/SC13–SC18
G4/SC19–SC24
G5/SC25–SC30
G6/SC31–SC36
G7/SC37–SC42
G8/SC43–SC44
~~~

蓝图：

<code>fixtures/reference-shot-blueprint.json</code>

它定义每镜：

- shot_id；
- group；
- variant；
- hero_size；
- camera；
- settle_frames；
- 6 个 still sample kind（这是**参考片的实录**：那 44 镜没有一镜声明 `highlight`。渲染层的判据是「每镜 ≥6 张、`SHOT_RECIPE.highlight === true` 的镜头 ≥10 张」，真源 `src/build/limits.mjs:27,38`，论述见 `docs/knowledge/agent-protocol.md` §4）。

当前验证器**不写影片规模**：它判蓝图自洽（`shot_count === shots.length`）、每条 `group` 与 `MAX_SHOTS_PER_GROUP` 的分组公式一致、每组条数等于公式期望、镜头源文件存在且字段不与蓝图漂移、`settle_frames` 不低于相机最短让位帧、以及越权旧 renderer 引用。44 镜 / 8 组是这份蓝图自身的属性，不是门禁脚本里的常量（论述见 `docs/knowledge/agent-protocol.md` §7，真源在 `src/build/limits.mjs`）。

## 34. 当前工程状态应如何表述

当前分支已经完成主要 Skill 和生产管线建设，包括：

- Skill 入口；
- Artifact Contract；
- Research / Narration / TTS；
- WordBoundary 时间轴；
- Storyboard；
- Build Groups；
- Build Agent 写入边界；
- 44 authored shot sources；
- Still benchmark；
- 30-frame test-render contract；
- 双比例 RenderIR；
- Frame Metrics；
- Motion；
- Visual Benchmark；
- Visual Regression；
- Shot Score；
- QC；
- Repair；
- Lessons；
- Footage manifest；
- Delivery checksum；
- Production Gate。

但是，没有真实 production run 和完整质量报告时，不能直接把代码状态称为最终 Production PASS。

尤其要由真实运行最终确认：

- 44 authored source 是否和当前 production script / timeline / RenderIR / registry 完全一致；
- 16:9 / 9:16 是否真实渲染；
- 44 × 6 still 是否真实执行；
- 各 Build Group 的 30-frame test render；
- 最终 QC；
- Repair → Recheck；
- Delivery checksum；
- <code>verify:production</code>。

## 35. 新主题的推荐流程

新主题不要把 demo fixture 当成最终生产数据。

标准流程：

~~~text
新 Topic
  ↓
Research
  ↓
Claims / Evidence
  ↓
Narration
  ↓
Real TTS / WordBoundary
  ↓
Storyboard
  ↓
RenderIR
  ↓
Shot Recipes
  ↓
Authored Scenes
  ↓
Pilot
  ↓
16:9 + 9:16 Render
  ↓
QC
  ↓
Repair
  ↓
Delivery
~~~

## 36. 新增视觉变体

推荐顺序：

1. 新增 visual primitive；
2. 新增 variant；
3. 新增 authored scene；
4. 新增 positive / anti benchmark；
5. 增加必要 QC；
6. 跑 regression。

不要只改一个 generic template，让所有镜头一起发生不可追踪的变化。

## 37. 新增 TTS Provider

Provider 最终应该稳定输出：

~~~text
audio
+
真实 word boundary / block boundary
~~~

不能把按字数推算的时间轴伪装成真实媒体时间。

## 38. 核心设计原则

reel-forge 的目标不是“自动生成一个 MP4”，而是构建一个可以持续生产、验证和修复解释型视频的 Agent Skill。

~~~text
Agent 能理解
+
生产可重复
+
过程可追溯
+
镜头可审计
+
视觉可比较
+
错误可修复
+
结果可验收
~~~

最终形成：

~~~text
Skill
  +
Agent
  +
Deterministic Tooling
  +
Typed Artifacts
  +
Authored Shots
  +
QC / Repair
  =
可持续的视频生产系统
~~~

## 39. 一句话定义

> **reel-forge 是一个以 <code>SKILL.md</code> 为行为规范、以 Agent 为导演、以 Typed Artifact Contract 为阶段接口、以确定性脚本和 Remotion 为执行引擎，并通过 Render → QC → Repair → Recheck → Delivery 形成闭环的解释型视频 Agent Skill。**
