# 解说词与分镜表（从口播稿到帧号，谁在执行哪条规则）

这份文件只管**时间轴上游**：解说词文件的语法、停顿与帧数预算、写作预算的执行状态、分镜表的令牌语法与表格格式、以及 `selfcheck.py` 真正会判的那几条。每条规则后面跟着它的执行者（代码路径 + 行号，或某道门）；没有执行者的写成「⚠ 无执行者」——那表示它是**给作者的硬要求，改它不会让画面变，但也没有任何东西拦得住不写**。

分工（一条规则只有一个真源，其余只链接）：

| 主题 | 真源文档 |
|---|---|
| 解说词语法、TTS 停顿帧数、写作预算的执行状态、分镜令牌与表格格式、`selfcheck` 判据、句:镜 1:1 冲突 | 本文 |
| 时间轴口径（`tts-word-boundary`）、词边界 lint 与 ASR 二次校验 | 本文 §7 + `docs/REFERENCE_PROCESS.md` |
| 帧号口径、帧数预算（镜头内）、节拍窗口、运镜词表、效果配额 | `motion-vocabulary.md` |
| 字幕字号与「每块 ≤16 字」为什么在渲染层没执行者 | `style-guide.md` §字幕 / §10 |
| 内容区、主角尺寸、光、QC 测量判据 | `composition-and-light.md` |
| 生产顺序与四个人工确认点 | `SKILL.md` |
| Agent 收到什么、必须交付什么、哪些约束没人执行 | `agent-protocol.md` |
| 调研文档结构与「事实有出处」 | `research-brief.md` |
| 上游五部片里打在**写法与对位**上的返工逐条归属（定稿后别改词、出处小字要 ≥2.5 s 停留、句:镜与镜头区间口径、英文语速与读音覆写），以及本文各「⚠ 无执行者」有没有在上片后真被踩 | `lessons.md` §2/§8 |

---

## 0. 链条：只有一个真源，其余全是派生物

```
script/narration.txt                     ← 作者写；定稿后不许再改词（见 §6.4）
   │ scripts/tts_build.mjs（逐句 TTS + 真实词边界）
   ├─→ script/timeline.json              时间轴真源（fps / total_frames / chapters / sentences[].from,to,subs）
   ├─→ src/remotion/timeline.gen.mjs     同一份数据的 webpack 装载点（gitignore 产物不能被静态 import）
   ├─→ script/timeline.md                人读的句→帧表
   ├─→ script/timeline-source.json       全片词级时间戳
   ├─→ artifacts/<pid>/audio/voice-manifest.json
   ├─→ fixtures/captions.json            ⚠ 另一条字幕流，由词边界**自动重新分组**（见 §5.4）
   └─→ public/audio.mp3
script/storyboard_src.md                 ← 作者写，帧号一律用令牌
   │ scripts/render_storyboard.py（把令牌换成真实帧号）
   ▼
分镜表.md ──→ scripts/selfcheck.py（判帧号/覆盖/持续动作/停留/白名单）
   │ scripts/materialize-ir.mjs → scripts/build-groups.mjs → scripts/materialize-shots.mjs
   ▼
fixtures/render-ir-16x9.json / 9x16.json + src/shots/Gn/SCnn.jsx
```

执行者：`tts_build.mjs` 的七处写出在 `scripts/tts_build.mjs:132`（timeline.json）、`:136-143`（timeline.gen.mjs）、`:145-150`（timeline.md）、`:151-152`（timeline-source）、`:153-158`（voice-manifest）、`:159`（captions.json）；令牌填充与「先验残留再写文件」在 `scripts/render_storyboard.py:65-71`；自检在 `scripts/selfcheck.py`。

时间轴的一致性不是靠约定：`scripts/verify-storyboard.mjs` 用**合成时间轴**把 `render_storyboard → selfcheck` 整链真跑 14 个用例（1 基准 + 13 条判据变异），`scripts/verify-contracts.mjs` 把 `timeline` / `voice-manifest` 的字段表与生产者的对象字面量**静态对撞**（不等产物生成），`npm run verify:narrative` 把 `script.segments` ↔ `timeline.sentences` ↔ `renderIR.scenes` 三者逐句对齐。⚠ 位置要知道：`verify:narrative` 这道门在 CI 里跑（`.github/workflows/verify.yml:69`），但**不在** `scripts/verify-fast.mjs` 的检查清单里，一键链 `scripts/skill.mjs` 也没调用它 —— 本地只有主动跑才判得到。

---

## 1. 解说词文件的语法：解析器只认四类行

`parseNarration`（`scripts/tts_build.mjs:16-36`）逐行读，规则如下——**写在这五行之外的东西一律不进时间轴**。

| 写法 | 匹配 | 下游后果 | 出处 |
|---|---|---|---|
| `# CHAPTER 2 章名` | `/^# CHAPTER\s+(\d+)\s+(.+)$/i` | 换章；章号与章名进 `chapters[]`，章名同时是进度条/HUD 文案候选。**只有 `sentenceIndex>0` 时才补章前停顿**（第一章前不加） | `:25-26`、`:99`、`:127-128` |
| `## gap 20` | `/^## gap\s+(\d+)$/i` | 累加到**下一句**的 `gapBefore`；不改词、不影响该句内部帧号 | `:27-28`、`:30` |
| 空行 | 任意空行 | 把**上一句**标成 `paragraphEnd`（`timeline.md` 里显示 `¶`），并让下一句获得段前停顿 `PARAGRAPH_GAP` | `:21-24`、`:30` |
| 其他以 `#` 开头的行 | — | **整行忽略**（不朗读、不占帧） | `:29` |
| 其余非空行 | — | 一句 = 一个 `sentence` = 一个镜头（§6.1） | `:31` |
| 句内竖线 `A \| B \| C` | `split("\|")` | 只切**字幕块/节拍块**；朗读时按语言拼回：中文无分隔、英文补空格 | `:101-102`、`:114` |

三条容易被忽略的行为，写稿前要知道：

1. **章标题行会吞掉刚由空行设上的段前停顿**。`:26` 在处理 `# CHAPTER` 时把 `paragraphBreak` 重置为 `false`，所以「空行 + 章节行 + 首句」实际只得到 `CHAPTER_GAP`（45 帧），拿不到额外的段前 30 帧。想要「章前更长留白」就加大 `CHAPTER_GAP_FRAMES`，不要指望前面那个空行。
2. **最后一句一定被标成段末**（`:34`），片尾停顿走 `TAIL_FRAMES`。
3. `## gap N` 是**累加**的（`:28` `pendingGap+=`）：连着写两行 `## gap 15` 得到 30 帧，而不是一行覆盖另一行。

> ⚠ 竖线块与朗读无关这件事，上游是被事故逼出来的（把 `powerful|but` 直接拼成 `powerfulbut` 送 TTS）。本仓库的执行者是 `:102` 的 `chunks.join(language==="en"?" ":"")`——中文不插空格、英文插空格，两种语言的拼回规则由 `language` 决定而不是靠作者补空格。

---

## 2. 停顿与帧数预算（这张表是全片帧号的底座）

`scripts/tts_build.mjs:9-14`，`FPS` 写死 30，其余五个都可用环境变量覆盖：

| 常量 | 缺省 | 环境变量 | 作用 | 上游（anything2explainer）值 |
|---|---|---|---|---|
| `FPS` | 30 | — | 一切帧/秒换算 | 30 |
| `LEAD_FRAMES` | 45 | `LEAD_FRAMES` | 第一句起始 = 45 帧（1.5 s） | 40 |
| `SENTENCE_GAP_FRAMES` | 10 | `SENTENCE_GAP_FRAMES` | 段内句间停顿 | 10（同名） |
| `PARAGRAPH_GAP_FRAMES` | 30 | `PARAGRAPH_GAP_FRAMES` | 空行段**前**停顿 | 20（+GAP 合计 30）—— 合计相同，归属不同 |
| `CHAPTER_GAP_FRAMES` | 45 | `CHAPTER_GAP_FRAMES` | 章前停顿（>0 句之后才加） | 45 |
| `TAIL_FRAMES` | 60 | `TAIL_FRAMES` | 末句结束后的黑尾 | 90 |

换算规则（不是估的，是代码算的）：`gapBefore = pendingGap + (paragraphBreak ? PARAGRAPH_GAP : SENTENCE_GAP)`（`:30`）；句首帧 `from = round((offset + words[0].start) × 30) + 1`，句末帧 `to = max(from, round((offset + 末词.end) × 30))`（`:112-113`）；`total_frames = ceil((cursor + TAIL/30) × 30)`（`:123`、`:130`）。**帧号 1-based**，与 `motion-vocabulary.md` §0 同一口径。

音量侧唯一硬编码判据：`alimiter=limit=0.89`（`:79`，混音链 `adelay → amix(normalize=0) → apad → atrim → alimiter`）。上游同为 0.89。

⚠ **没有任何门把成片时长和目标对齐**：`duration_target_s` 只被写进 `fixtures/project.json` 并由 `contracts/project.schema.json` 校验形状，**全仓库没有读者**（逐符号检索：`scripts/skill.mjs:22` 写、schema 声明、fixture 里存着，三处，零读者）。`speech_seconds` 与 `total_seconds` 只出现在 `tts_build.mjs:160` 的 PASS 行里，同样无人比较。**时长是不是超了，目前只能看那行输出。**

---

## 3. 写作预算：上游的数，本仓库的执行状态

左列是 anything2explainer 在 `narration-guidance.md` / `narration-storyboard.md` 里定的预算（数值原样抄，标注口径）；右列是**本项目现在真的有没有人判**。

| 规则 | 上游数值 | 本仓库执行者 |
|---|---|---|
| 每句字数 | 中文 **≤35 字**；英文 ≤20 词 | ⚠ **无执行者**（没有任何代码读 `segment.text` 的长度） |
| 每个字幕块 | 中文 **≤16 字**；英文 ≤48 字符（实测 49 字就要缩字号、>70 折两行） | ⚠ 对**解说词的 `\|` 块**无执行者。`SUBTITLE_BUDGET={zh:16,en:48}`（`src/visual/textfit.mjs:65`）零调用（`style-guide.md` §10）；渲染层字幕只会先缩到 34px 再折两行、两行仍超宽**不产生任何令牌**。唯一真的按 16 字切分的是**另一条字幕流** `captionsFromWords(maxCharsZh=16)`（`src/captions/pipeline.mjs:16-21`、`:51`）——见 §5.4 |
| 章名长度 | 中文 ≤6 字；英文按槽宽 `1280/章数`、≤14 字符最稳 | ⚠ 无执行者（`:26` 原样收章名） |
| 段落构成 | 2–4 句一段，**一段 = 一个镜头** | ✗ **与门冲突**：本仓库是「一句 = 一镜」，见 §6.1 |
| 章数 | <3 分钟单章；3–5 分钟 3–4 章且每章 ≥60 s；5–8 分钟 4–6 章 | ⚠ 无执行者；单章兜底是真的（`:128`：没有 `# CHAPTER` 行时合成 `[{n:1,title:"",from:1}]`） |
| 2–3 分钟中文篇幅 | ≈650–880 字 / 24–32 句（上游英文同档：280–420 词 / 24–32 句·镜头） | ⚠ 无执行者（见上一节的 `duration_target_s`） |
| 语速 | 中文 ≈5.5 字/秒（edge `+0%`）；英文 edge 2.96 词/秒、kokoro 2.30 词/秒 | 数据可核对但无判据：`TTS/TIMELINE PASS` 打印 `speech_seconds` 与 `total_seconds`（`:160`） |
| 末块过短 | 段末句**末块 <45 帧**要补 `## gap 15–30` 或把末拍元素前挂 | ⚠ 无执行者。`selfcheck` 只在**镜头级**判 ≥120 帧与 `hold ≥30f`（`scripts/selfcheck.py:77-83`），不判块长 |
| 数字必须有出处 | 只用调研 §数字清单里的数 | ✅ **只覆盖画面文字**：`scripts/verify-text-provenance.mjs:50-54` 要求画面文案里的每个数字能在解说词或 `research.md/json` 找到。**解说词自己的数字没有门**（详见 `research-brief.md` §4） |
| 【待核】不进解说词 | — | ⚠ 无执行者（本仓库的 `research.md` 是 claim/evidence 表，根本没有【待核】这个记号，见 `research-brief.md` §5） |
| 每句通过「上一句之后听众新知道了什么」 | 人工判 | ✅ 载体是人工确认点 `narration-signoff`（`SKILL.md`），不是代码。它的产物哈希被钉住：`src/runtime/checkpoints.mjs:25` + `:90-91` |
| 主线不可换序 / 先因后果 / 术语先白话后命名 / 列表 >3 项删 / 章界留钩子与承接 | guidance §2/§3/§8/§10/§13 | ⚠ 全部无执行者。章界唯一能被机器说的是 `chapter-order`（章起始帧不得倒退，`src/visual/narrative.mjs`）与「章名非空」都没判 |

**给作者的一句话**：这一节里只有 ⚠ 号右边写着 ✅ 的两条会拦住你（画面数字出处、解说词与时间轴逐句等长）。其余全靠写作时自觉，写完也没有第二道网。

---

## 4. 分镜源文件的令牌语法（帧号只能这么写）

真源是 `scripts/render_storyboard.py:36` 的一条正则：

```
\{(S\d+|C\d+|TOTAL)(?:\.(from|to|c\d+))?([+-]\d+)?\}
```

| 令牌 | 解析成 | 解析代码 | 出错时的话 |
|---|---|---|---|
| `{S12.from}` / `{S12.to}` | 第 12 句的起始/结束帧 | `:43`、`:54-55`、`:61` | 「分镜里有 `{S99.from}`，但时间轴没有句子 S99（共 N 句）」（`:50-51`） |
| `{S12.c3}` | 第 12 句**第 3 个字幕块**的起始帧，1-based（`index = 3-1`） | `:55-59` | 「`S12` 没有第 3 个子句（subs），但分镜写了 …」（`:57-58`） |
| `{C2}` | 第 2 章起始帧 | `:45-48` | 「时间轴没有第 2 章（章节到 X 为止）」 |
| `{TOTAL}` | `timeline.total_frames` | `:43-44` | — |
| 任意令牌 ± 整数 | `{S12.from-8}` = 该帧减 8 | `:62` `v + off` | — |

两道防呆，顺序有意义：

1. **先验残留再写文件**（`:68-71`）。写完再抛错会在仓库里留一份半渲染的分镜表，下一轮 `selfcheck` 拿它当输入，报出一堆与真因无关的帧号问题。变异用例：`leftover-token`。
2. `selfcheck.py:43-44` 再查一遍「未解析令牌」，因为它读的是**磁盘上的分镜表**，可能有人手改过而没重跑渲染。

`{Sxx.cN}` 取的是 `timeline.sentences[].subs`（作者的竖线块），而渲染层的节拍锚取的是 `fixtures/captions.json`（自动分组）——**这是两套块**，见 §5.4。

---

## 5. 分镜表：格式、判据、变异用例

### 5.1 表格是 5 列，不是上游的 7 列

`scripts/selfcheck.py:47` 的解析正则钉死了列数与分隔符：

```
^\| (SC\d+) \| (\d+)–(\d+) \| ([^|]+) \| ([^|]+) \| (.+?) \|$
   ①镜头 id     ②起–止帧      ③节拍       ④画面       ⑤动效
```

- ②的区间分隔符是**en-dash `–`**，不是 ASCII `-`。换成 `-` 的后果不是「少解析一列」而是**一行都匹配不上**，此时 `:60-62` 报「分镜表里没有解析到任何 `| SCnn | 起–止 | … |` 表格行：格式变了还是这一版根本没用表格？」——这句话是刻意写的：以前这里会掉进 coverage 判断，报一个 `0 != 14` 的假原因。变异用例：`table-format`。
- ⚠ **上游的「主角·尺寸」「光」两列在这里加不进去**：多两列会让每一行都不匹配正则，整张表被判「格式变了」。要采用上游那套两列审美约束，必须同时改 `selfcheck.py:47` 的正则 **和** `scripts/verify-storyboard.mjs` 的变异锚点（它写的是 `script/storyboard_src.md` 里的原句，锚点对不上时直接判失败：`:59-61`「变异锚点过期了」）。现状：主角尺寸/光的约束由渲染层与 QC 兜（`composition-and-light.md` §5/§7），不由分镜表兜。

现仓库里的分镜源在 `script/storyboard_src.md`（4 行 demo + 「## 全局约束」清单），它同时是 `verify-storyboard.mjs` 的**基准输入**——改这个文件等于改那条门的夹具，改之前先确认 14 个用例仍然全绿。

### 5.2 `selfcheck.py` 真正会判的九件事

| # | 判据 | 出处 | 钉住它的变异用例（`scripts/verify-storyboard.mjs`） |
|---|---|---|---|
| 1 | 镜头数 == 时间轴句数 | `:65-66` | `coverage` |
| 2 | 每行帧号与时间轴**逐句相等** | `:71-72` | `frame-drift`（分镜按基准轴渲染、自检读另一份轴——「重跑 TTS 忘了重跑 storyboard」的真实形状） |
| 3 | `to ≥ from` | `:73-74` | ⚠ 无用例钉住 |
| 4 | 镜头不重叠（`from ≥ 上一镜 to`） | `:75-76` | ⚠ 无用例钉住 |
| 5 | 每镜 ≥120 帧 | `:77-78` | `short-shot` |
| 6 | 动效格必须含 `continuous:` | `:79-80` | `no-continuous` |
| 7 | 动效格必须含 `hold: Nf` 或 `停留: Nf` 且 N≥30 | `:81-83` | `weak-hold` |
| 8 | `Glitch`/`GlitchIn` 只允许出现在「**闪烁白名单**」行点名的镜头，且每镜 ≤1 次 | `:86-92` | `glitch-offlist` |
| 9 | `LightSweep`/`StageLine`/`GhostText` 只允许出现在「**扫光白名单**」行点名的镜头，且每镜 ≤1 次 | `:94-99` | `sweep-offlist` |
| 10 | 旧的一次性入口 `scripts/run-p1..p7.mjs` 不得残留 | `:102-112` | ⚠ 无用例（属于「流程考古」类判据） |

两个必须知道的边界：

- **白名单行不存在 = 一律不许用**（`:86`、`:94` 用 `next(...)` 取行，取不到就是空串）。所以 demo 分镜里「扫光白名单：SC01」这一行是**功能性的**，不是注释。
- 闪烁白名单是**集合成员判断**（`:87` `re.findall` 成 set），扫光白名单是**子串判断**（`:97` `shot["id"] in light_line`）。两句法不一样：后者在镜头号进到三位数时可能误放行（`"SC10" in "SC100"` 为真）。当前 ≤99 镜头不触发，但这条门不是按名字精确匹配的。

### 5.3 3 秒判据为什么在两个地方

「≥120 帧」「hold ≥30」由 `selfcheck.py` 在**分镜层**判；「末拍落位后停 30–45 帧」由 `motion_check.py` 在**像素层**判（令牌 `hold_too_short`），镜头最短帧数在契约层还有 `SET_PIECE.minLen` / `SHOT_MIN_FRAMES`（多为不变式，无画面读者）。口径与因果分别归 `motion-vocabulary.md` §1/§4 与 `composition-and-light.md` §8.4，本文只保留分镜层那一份。

### 5.4 ⚠ 两套字幕块：`subs` 与 `captions` 不是同一个东西

| | `timeline.sentences[].subs` | `fixtures/captions.json` |
|---|---|---|
| 谁生成 | 作者的竖线块，帧号取该块真实词边界（`tts_build.mjs:114`） | 全片词流**重新自动分组**（`tts_build.mjs:129` → `captionsFromWords`） |
| 分组依据 | 作者意图 | `maxTokens=8`、`maxDuration=2.5 s`、中文 >16 字 / 英文 >48 字符（`src/captions/pipeline.mjs:16-21`、`:51`） |
| 谁读它 | 分镜令牌 `{Sxx.cN}`（`render_storyboard.py:59`）、词边界 lint（`src/visual/word-boundary.mjs:58`）、`verify-e2e.mjs:46-47`、`narrative.mjs`（只判非空） | **渲染层的节拍锚**：`src/remotion/index.jsx:5` 静态 import → `SemanticShots.jsx:58` → `buildPlan({captions})` → `shotCaptions` / `firstSubLocal`（`src/shots/plan.mjs:314-332`）；`plan-audit.mjs:20` 同一个来源 |

后果：竖线块如果超过 16 字或被 2.5 秒切成两截，**分镜表里写的 `{S07.c2}` 帧号和渲染层用来判 `beat-window-overflow` 的第二拍锚点就不是同一帧**。⚠ 现在没有任何门比对这两套块（`verify-contracts` 只校验 `captions` 的形状，`verify-narrative` 只判 `subs` 非空）。

写解说词时的安全做法：**每个竖线块自己就满足 ≤16 字 / ≤2.5 秒 / ≤8 个词**，让自动分组无事可做，两套块自然重合。这是硬要求，但只有 ⚠ 无执行者。

---

## 6. 已知破口（按「要不要现在改」排序）

### 6.1 一句 = 一镜是结构性的，和 SKILL.md 的承诺相反

`SKILL.md` §样片级硬规则「视觉」写着「镜头按画面单元组织，不为每句机械切镜」，但三处执行者把它钉成 **1 句 = 1 镜**：

- `src/director/pipeline.mjs:58`：`script.segments.map((segment, index) => beatToScene(graph.beats[index], segment))` —— 导演层直接按 segment 下标生成 scene。
- `src/visual/narrative.mjs`：`(renderIR.scenes||[]).length !== segments.length` → `scene-narration-coverage-mismatch`（阻断门 `verify:narrative`）。
- `scripts/selfcheck.py:65-66`：镜头数 ≠ 句数即失败。

所以「一段 2–4 句合成一个镜头」在本仓库**目前做不到**，而 ≥120 帧/镜 的判据又反过来要求句子足够长。两个改法：(a) 承认现状，把 `SKILL.md` 那句改成「一句一镜，长句用竖线分块」；(b) 引入 `segment → scene` 的合并层（导演 + 两道门 + `materialize-ir` 同批改）。本轮按「先不执行，只写实现」只记录，未改——因为 (b) 会影响画面。

### 6.2 时长目标没有任何执行者

`duration_target_s` 零读者、`speech_seconds` 零比较（§2）。校验一片 2–3 分钟中文时，唯一的机器反馈是那行 `TTS/TIMELINE PASS`。最小修法：`tts_build.mjs` 写出 manifest 时按 `project.duration_target_s` 判 ±15% 并打印一条 `warning`，或新增一道 `verify:duration`（纯本地、不渲染，符合当前约束）。未做。

### 6.3 分镜表无法承载审美约束

上游把「主角·尺寸」「光」做成表格列，是为了让构建 agent 与 QC 有共同坐标；本仓库受 §5.1 的 5 列正则限制，这两列的信息只能放进自由文本格（④画面 / ⑤动效），机器不解析。现状由 `composition-and-light.md` §5（`HERO_MIN`、`BIG_TEXT_MIN`）与 QC 测量层承担。

### 6.4 「定稿后不改词」有执行者，但只在 checkpoint 路径上

上游的教训是：构建组代码硬编码帧号，改词会让全片错位。本仓库的执行者是**确认点的产物哈希**：`narration-signoff` 覆盖 `fixtures/script.json`、`script/narration.txt`、`script/storyboard_src.md`（`src/runtime/checkpoints.mjs:25`），后续任何一步调用 `requireCheckpoint` 时重算哈希，不一致就抛 `checkpoint artifact changed after approval`（`:90-91`）。⚠ 走 `--auto-approve` 时四个点被连续批准，这条保护仍然在（哈希在批准时定格），但它**不覆盖** `script/timeline.json` 之后的重跑：`voiceover` 点覆盖 timeline 与音频（`:26`），改词后重跑 TTS 会被它拦住，而「只重跑 TTS 不改词、但忘了重跑 storyboard」靠的是 `selfcheck` 的 `timeline mismatch`（§5.2 第 2 条）。

### 6.5 一键链生成的分镜骨架过不了自检

`scripts/skill.mjs:76` 为每个 segment 生成的 `storyboard_src.md` 骨架只有一行帧区间（`{Sxx.from}–{Sxx.to}`），**没有 `continuous:` 也没有 `hold:`**，因此 `skill.mjs:88` 紧接着跑的 `selfcheck.py` 必然以 `missing continuous action` 失败。这是「一键入口」的真实断点之一：它的产物由脚本生成，而自检按人写的分镜表判。修法要么让骨架自带 `continuous: <由 variant 推的动作>; hold: 36f`，要么把这两条判据降级为「 authored 分镜才判」。**未改**，因为它决定了 `npm run skill` 能不能跑通，改法需要一次真渲染验证，而当前不允许执行。

### 6.6 新主题的解说词需要 agent provider

`src/director/pipeline.mjs:30-33`：`script` 缺失且没配 `AGENT_COMMAND` 时直接抛 `script missing and no agent provider configured`。也就是说「新主题 + 2–3 分钟中文」这片子的**第一步就依赖外部 agent**，脚本侧只保证 claim↔evidence 对得上（`:46-53`），不保证文案写得好或写得够长。见 `agent-protocol.md` §3。

---

## 7. 时间轴口径（一句话，真源在别处）

`timing_mode` 只有一个合法值 `tts-word-boundary`，写死在生产者（`tts_build.mjs:130`）与契约（`contracts/timeline.schema.json`、`contracts/voice-manifest.schema.json`），并由 `scripts/verify-production.mjs:33-36` 在三处字段上逐个核对、由 `scripts/verify-contracts.mjs` 的「生产者 ↔ 契约字段静态对撞」保证生产者不会偷偷多写字段。禁止把无词边界的引擎伪装成外部 ASR：`tts_build.mjs:107-108` 拿不到真实词边界就直接失败（`no real word timing for sentence N`）。

---

## 可核对规则

1. 解说词只有四类行会进时间轴：`# CHAPTER n 名`、`## gap N`、空行（段末）、其余非空行（一句）；其他 `#` 开头整行忽略 —— `scripts/tts_build.mjs:16-36`。
2. 竖线只切字幕块不影响朗读，中文无分隔拼回、英文补空格 —— `scripts/tts_build.mjs:101-102`。
3. 停顿帧数：片头 45 / 段内句 10 / 段前 30 / 章前 45 / 片尾 60，全部可由同名环境变量覆盖，`FPS` 写死 30 —— `scripts/tts_build.mjs:9-14`；段前停顿加在**下一句**上（`:30`）。
4. 章标题行会重置段前停顿标记，所以「空行 + 章节行」只得到 `CHAPTER_GAP` —— `scripts/tts_build.mjs:26`。
5. 没有 `# CHAPTER` 行时自动合成单章 `{n:1,title:"",from:1}` —— `scripts/tts_build.mjs:128`；这是 2–3 分钟校验片的默认形态。
6. 句帧号：`from = round((offset+首词.start)×30)+1`、`to = max(from, round((offset+末词.end)×30))`，1-based —— `scripts/tts_build.mjs:112-113`。
7. 混音只有一处响度硬约束 `alimiter=limit=0.89` —— `scripts/tts_build.mjs:79`。
8. 每句 ≤35 字、每块 ≤16 字、章名 ≤6 字、2–3 分钟 ≈650–880 字：本仓库**全部无执行者**；画面数字的出处是唯一有门的写作约束 —— 本文 §3 + `scripts/verify-text-provenance.mjs:50-54`。
9. `duration_target_s` 零读者、`speech_seconds` 零比较，时长偏差目前只能看日志 —— 本文 §2 的检索结论。
10. 分镜令牌只有 `{Sxx.from|to|cN}`、`{Cn}`、`{TOTAL}` 加 ±偏移，`.cN` 是 1-based 的 `subs` 索引 —— `scripts/render_storyboard.py:36-62`。
11. 未解析花括号**先验后写**，且 `selfcheck` 再查一遍残留 —— `scripts/render_storyboard.py:68-71` + `scripts/selfcheck.py:43-44`。
12. 分镜表是 5 列、区间用 en-dash；格式对不上时报「没有解析到任何 …表格行」而不是 coverage 假原因 —— `scripts/selfcheck.py:47`、`:60-62`。
13. 分镜自检九判据（覆盖、帧相等、区间有效、不重叠、≥120 帧、`continuous:`、`hold ≥30f`、闪烁白名单、扫光白名单）中，第 3、4 条与废弃入口检查**没有变异用例钉住** —— 本文 §5.2 对照 `scripts/verify-storyboard.mjs` 的 14 个用例。
14. 白名单行缺失 = 一律禁用；扫光白名单是子串匹配（三位镜头号会误放行），闪烁白名单是集合匹配 —— `scripts/selfcheck.py:86-99`。
15. 「全片扫光 ≤2」不在分镜层执行，由装配层截断白名单实现 —— `src/remotion/Root.jsx:51-52`，见 `motion-vocabulary.md` §7。
16. `subs`（竖线块）与 `captions.json`（自动分组）是两套字幕块，渲染层的节拍锚用后者、分镜令牌用前者，没有门比对二者 —— 本文 §5.4。
17. 一句 = 一镜被导演层、narrative 门、selfcheck 三处钉死，与 `SKILL.md`「不为每句机械切镜」相反 —— `src/director/pipeline.mjs:58` + `src/visual/narrative.mjs` + `scripts/selfcheck.py:65-66`。
18. 「定稿后不改词」由确认点产物哈希执行，覆盖 `narration.txt` / `script.json` / `storyboard_src.md` —— `src/runtime/checkpoints.mjs:25`、`:90-91`。
19. 一键链生成的分镜骨架缺 `continuous:` 与 `hold:`，跑到 `selfcheck` 必失败 —— `scripts/skill.mjs:76` 对照 `scripts/selfcheck.py:79-83`。
20. 新主题第一步依赖外部 agent：无 `script` 且无 `AGENT_COMMAND` 时直接抛错 —— `src/director/pipeline.mjs:30-33`。
