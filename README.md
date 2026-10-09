# reel-forge

Agent-native 视频生产引擎。

当前先按 anything2explainer 的生产过程完成可用功能，再做优化。

本仓库同时提供根目录 <code>SKILL.md</code>，可作为 Agent Skill 执行规范：Agent 负责需求理解、Research、Narration、导演与质量判断，脚本负责确定性流水线、渲染、QC、Repair 与 Delivery。结构参考 anything2explainer 的 Skill 形态，但实现与画面保持本项目原创。

## 这是什么

**reel-forge 的核心是一个 Agent Skill。**

它不是单纯的 Remotion 模板，也不是只负责渲染视频的脚本集合。Skill 定义的是一条完整的知识讲解视频生产链：

~~~text
User Request
  ↓
SKILL.md
  ↓
Agent
  ↓
Research
  ↓
Narration / TTS / WordBoundary
  ↓
Storyboard
  ↓
G1…Gn Build Agents
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

详细使用、环境要求、命令、44-shot 结构、QC/Repair 和当前验收边界见：

**[docs/USAGE.md](docs/USAGE.md)**

## 快速开始

### 1. 安装

~~~bash
git clone https://github.com/juxiu/reel-forge.git
cd reel-forge
git checkout feat/visual-benchmark-skill

npm install
pip install -r requirements.txt
~~~

建议使用 Node.js 22、Python 3.11，并安装 FFmpeg。

### 2. 快速验证

~~~bash
npm run verify:fast
~~~

`verify:fast` 不需要任何运行产物，检查清单里已含 `verify:authored-shots`（authored 镜头合规）与 `verify:limits`（分组与 still 数量真源）；想单跑某一道用 `npm run verify:<name>`。

**要渲染或跑 <code>verify:e2e</code>，必须先生成 TTS 产物**：<code>public/audio.mp3</code>、<code>script/timeline.json</code>、<code>fixtures/captions.json</code>。它们由 <code>npm run tts</code> 生成、不入库（<code>src/remotion/index.jsx</code> 会 import时间轴，<code>&lt;Audio&gt;</code> 依赖配音文件），所以全新 clone 的第一步是：

~~~bash
npm run tts
npm run run-production
~~~

### 3. 作为 Skill 一键执行

~~~bash
npm run skill -- \\
  "Explain HTTP Digest Fields" \\
  --source https://www.rfc-editor.org/rfc/rfc9530.html \\
  --auto-approve
~~~

非 auto 模式会在四个人工 checkpoint 停止：

~~~text
length-language
narration-signoff
voiceover
pilot-preview
~~~

使用：

~~~bash
npm run checkpoint -- <checkpoint> approved
~~~

通过后使用 <code>--resume</code> 继续。

## 完整生产链

1. Research：来源、事实、证据。
2. Narration：定稿文案、段落和字幕块。
3. TTS/Timeline：真实配音、WordBoundary、帧级时间轴。
4. Storyboard：从时间轴 token 生成分镜表。
5. Overlay/Primitives：统一字幕、HUD、进度条、视觉图元。
6. Pilot：先生成 G1 / 前 30 秒 preview，并暂停等审批。
7. Parallel Build：按 G1…Gn 拆镜头并行生产。
8. Render：16:9 / 9:16 成片。
9. Quantitative QC：frame metrics / motion / media probe。
10. Visual Regression：scene/ratio 采样帧，与 positive / anti-reference benchmark 做 visual embedding similarity。
11. Repair / Recheck：问题按 node / ratio 局部修复，再复验全部质量层。
12. Delivery：checksum manifest 和归档。

## 44-shot authored scene

当前开发分支包含 44 个 authored scene source：

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

每镜要求独立 <code>SHOT_RECIPE</code>、variant、hero size、camera 和至少 30 帧 settle；基础 still benchmark 固定 6 个采样点。

验证：

~~~bash
npm run verify:authored-shots
~~~

## Visual Benchmark

<code>fixtures/visual-benchmark.json</code> 定义：

- positive references：network-flow、structured-mechanism、transformation；
- anti references：static-card、clutter、decorative-motion；
- <code>visual-pixel-v2</code> embedding（这个名字必须与 <code>scripts/visual_regression.py</code> 里的 <code>DESCRIPTOR</code> 一致，<code>verify:visual-benchmark</code> 会把两边读出来对撞）；
- pass / reference / excellent / anti-fail 阈值。

Shot Score 当前统一汇总：

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

## Production Gate

最终不能只以“视频文件生成成功”为完成条件。

完成定义要求：

~~~text
双比例成片
+
Frame Metrics
+
Motion
+
Visual Regression
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

因此：

~~~text
verify:fast PASS
~~~

不等于：

~~~text
Production PASS
~~~

只有完整 production run 真实通过全部质量门后，才能报告 Production PASS。

## 文档

- [SKILL.md](SKILL.md) — Agent Skill 行为规范
- [docs/USAGE.md](docs/USAGE.md) — 完整使用说明
- [docs/REFERENCE_PROCESS.md](docs/REFERENCE_PROCESS.md) — 生产过程与完成定义
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — 当前项目状态
- [docs/VISUAL_GRAMMAR.md](docs/VISUAL_GRAMMAR.md) — 规则 ↔ 执行者索引页（不是真源，先从这里找入口）
- [docs/knowledge/composition-and-light.md](docs/knowledge/composition-and-light.md) — **空间与光**的真源：设计空间与 band、内容区划分、构图模式、变体几何、主角/配角尺寸、发光模型、QC 测量判据与换算
- [docs/knowledge/motion-vocabulary.md](docs/knowledge/motion-vocabulary.md) — **时间与动效**的真源：帧号口径、帧数预算、缓动、节拍窗口、运镜词表、效果开关与配额、修复路由、死表清单
- [docs/knowledge/style-guide.md](docs/knowledge/style-guide.md) — **画风常量**的真源：调色板与每个色值的读取状态、字号阶梯、字体角色、画面文案准入与禁令
- [docs/knowledge/narration-and-storyboard.md](docs/knowledge/narration-and-storyboard.md) — **解说词与分镜表**的真源：句法与停顿帧数、写作预算的执行状态、分镜令牌与表格格式、`selfcheck` 判据、句:镜 1:1 冲突
- [docs/knowledge/agent-protocol.md](docs/knowledge/agent-protocol.md) — **agent 层**的真源：provider 形态与四个 `AGENT_*` 开关、三态信封、四个角色的输入输出、`only_paths` 的实际效力、a2e QC 维度对照
- [docs/knowledge/research-brief.md](docs/knowledge/research-brief.md) — **事实层**的真源：本仓库的"调研"实际是什么、claims 的自证性质、画面文字出处门 A1/A2/B/C 判到哪、判不到哪
- [docs/knowledge/lessons.md](docs/knowledge/lessons.md) — **上游教训对照**的真源：a2e 五部片 125 条返工逐条归属（六态口径）、本仓库独有的三类破口（死掉的修法 / 注释即执行者 / 半个修法）、结构上不可能犯的那一类
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — 实现计划与 Scoped Repair（与代码同源，由 `npm run verify:plan` 双向校验）

> 一条规则只有一个真源文档，其余位置只放链接。新增规则前先查上面六篇（空间与光 / 时间与动效 / 画风常量 / 解说词与分镜 / agent 协议 / 事实层）有没有写过，再看 `lessons.md` 里上游是否已为这条踩过坑；写重了 `verify:plan` 与文档评审都会把它抓出来。
