# reel-forge ↔ a2e 创作差异清单（v1，2026-10-10）

目标：力求与 a2e 创作结果一致。基准：`anything2explainer/examples/rag/`（STYLE_GUIDE / AGENT_RAG_QC_RULES / AGENT_RAG_BUILD_RULES / 分镜表 / qc_v3_final / 交付说明）。
红线：不过度设计、不过度冗余——只补影响创作结果的，不做无锚点的死代码。

## A. 创作词汇层（决定创作上限）

| # | 差异 | a2e 证据 | 现状 | 处置 |
|---|---|---|---|---|
| A1 | 图表卡拓扑（网格+曲线+坐标字+红点） | STYLE_GUIDE §5 图表卡 440×300；SC15「−49%」 | 18 拓扑无 chart | **不做**：IR/recipe 无数据锚点，造了是死代码。接入条件：research 产出数据锚点时随 BigNumber 一起接 |
| A2 | 打字机逐字（stepKf 每 2 帧 1 字） | SC04 答复气泡 | 无对应图元 | **不做**：同上，无叙事锚点。设计草案：`Typewriter` 图元（N, f0, text, per=2），有锚点即接 |
| A3 | 每镜微叙事动作注入点 | 分镜表「被 Cross 拦住回弹 4px」「日历翻页」「神经元闪灰 6 帧」 | recipe 只有拓扑+items+focus 偏移，动效全模板化。**第五轮量化**：`stage.focus` 是手写相对偏移，只覆盖镜前段；43 个有 focus 的镜头「末拍→镜末」距离 min 74 / 中位 141 / max 250 帧，**41/43 > 90 帧**（超 `still_max_seconds=3s`）→ 焦点交接走完后画面剩 HeroGlow 呼吸（变化 0.02–0.11 < still_thr 0.35）+ 末 8 帧离场，是 `motion_too_low` 的系统性根因 | **✅ 已修复（第六轮）**：`plan.mjs` 新增 `tileFocus`，把作者写的焦点拍表**按镜长铺满整镜**（槽序循环，见 `stage-kit.jsx` `focusWalk/isPast` 支持循环），根治「焦点只在镜前段」；补 4 个焦点盲区拓扑（CiteSide/CompareTable/Reshape/Split2Col 的 `focusSlots` 驱动）与 SC02 缺失的 `focus`。8 镜抽样 + 全片 QC 复核（原 41/43 超预算 → 全片 `motion_16x9` 零阻断） |
| A4 | HUD 章内换词（a2e 第 4 章 4 次，8 帧淡入） | 分镜表 G0 HUD 时间表 | HUD 章节级 | **接 script**：HUD 词表可从 narration 章内小节自动推导，成本中。待新片验证价值后做 |
| A5 | 数字滚动镜头（Counter rev2） | SC39 | BigNumber/countTo 图元已在，IR 无数字锚点 | **不做**（无锚点）。research 配额落地后自然获得锚点 |

## B. 规则与门禁层（决定质量兜底）

| # | 差异 | a2e 证据 | 处置 |
|---|---|---|---|
| B1 | 最小字号 22px 红线 | STYLE_GUIDE「图内说明最小 22px」 | **本轮做**：textfit.mjs `fitSize` 默认 minSize 钳 `max(22, size*0.78)` |
| B2 | QC 语义 agent 协议（七类判据，每镜必留一行结论） | QC_RULES 全文 | **已由既有真源覆盖**：`docs/knowledge/agent-protocol.md` §5 已把 a2e 11 个 QC 维度 ↔ 本仓库执行者对照成表（含全部 ⚠ 无执行者项），本文不另立第二份真源。缺口=执行者：#7 性能（本轮 `perf:probe` 补上）、#1 遮挡测量、#4 审美判定仍缺 |
| B3 | 入场曲线机器验证（GLITCH_SEQ 模板扫描 + 每字幕块 D(n) 单调/往返 + rev0 统计） | qc_v3_final §1 | **暂缓**：verify-shot-sample 需扩帧窗口（成本+）。已有的 settle/quiet 覆盖一半语义。留待 QC agent 接入后按需扩 |
| B4 | 性能红线 + 30 帧测渲 ≥3fps | BUILD_RULES §4/§6 | **本轮做**：`scripts/perf-probe.mjs`（30 帧计时门）。DOM≤600/SVG filter≤6 属源码纪律，写进协议文档不机械化检查 |
| B5 | 衔接/组界明文规则（不留空白帧、0–3 帧重叠、章节卡前无残留） | BUILD_RULES §3 / QC §5 | 已部分覆盖（GAP_BAND/SETTLE），余下归入 B2 协议 |

## C. 流程与协作层（决定生产力）

| # | 差异 | a2e 证据 | 处置 |
|---|---|---|---|
| C1 | 分镜表=导演意图文档（帧区间/节拍/画面/动效，QC 判「分镜表有而画面没有」的依据） | 分镜表.md 99 行 | **本轮做**：materialize-ir 后自动生成人可读分镜表 `artifacts/digest-explainer/storyboard.md`（从 IR 推，非手写） |
| C2 | BUILD_NOTES 交接层（每组镜头表/测渲耗时/降级项） | BUILD_RULES §7 | **不做**：当前单 agent，并行生产启用时再立 |
| C3 | STYLE_GUIDE 文档化 +「先看图再写代码」 | style-guide.md + ref_*.jpg | **已补**：`docs/knowledge/style-guide.md`（本仓库实现真值，索引页原有断链已修复）。参考帧 = `artifacts/stills/` |
| C4 | 字幕每块 ≤16 字预算门 | STYLE_GUIDE/narration-storyboard §5 | **本轮做**：verify:fast 加 `subtitle-budget` 检查；实测现状 14/132 超标（最长 21），门禁落地后随文案重写收敛 |
| C5 | GlitchIn 白名单机制（23 项+重口味 4 处） | BUILD_RULES §8 用户裁定 | **记录**：我们 glitch 用量低（FocusIn 仅焦点交接），如用量上升需先立白名单 |

## D. 已对齐不再跟踪
调色板/字体族（Noto 900 压窄+Exo2 紫+Orbitron+Audiowide）/墨迹 dy/fitSize/StarField+雾底/DotFieldBg/尺寸三档（HERO_MIN 170）/HeroGlow 家族/CameraRig/一帧一紫（focusWalk）/确定性纯函数（rnd）/字幕带与进度条语义/章序号 Orbitron/片尾压黑。

## E. 语速节奏（已修，记录）
- a2e：edge-tts YunxiNeural **+8%**、无标点连读，实测 5.48 字/秒
- 原状：+0%+全程标点+join 逗号 → 4.09 字/秒；同句对照实验：去标点+8% → 5.01 字/秒
- 已改：tts_build.mjs spokenText/spokenChunks（仅合成文本去标点，字幕/溯源保留原文），词边界对齐在去标点空间做
- 剩余差值来自内容英文词占比，非参数差异

## F. 工程管线层（a2e `template/` 可复用模板 ↔ 本仓，2026-10-10 第二轮）

a2e 的工程真源是 `template/`（tts_build.py / render.sh / sheet.py / selfcheck.py / Main.tsx）。逐机制对比：

| 机制 | a2e template | 本仓 | 结论 |
|---|---|---|---|
| 节奏常量 GAP/PARA/CHAPTER/LEAD | 10 / 20 / 45 / 40 | 10 / 30(合计等价) / 45 / 45 | ✅ 等价 |
| TAIL 片尾静音 | 90 帧（3s） | 60 → **本轮改 90** | ✅ 已对齐（下次 tts 生效） |
| `## gap N` 显式间隙 | 有 | 无 | 不补：narration 无消费者（防死代码） |
| SHORT_TAIL 段末补停留 | 构建时补 45 帧 | QC `hold_too_short` 检测 | 机制异构：它预防、我们检测+指修法；不重复实现 |
| edge-tts 空音频重试 | 4 次 | 并发失败转串行 6 次退避 | ✅ 超越 |
| 渲染→帧导出 | ffmpeg jpg q4 全帧 | PNG 全帧双画幅（测量层纯标准库可解码） | ✅ 超越 |
| **sheet 缩略总表** | sheet.py（60 帧绑字幕） | **本轮补** `sheet-gen.mjs`，接 render.sh 尾部 | ✅ 对齐（QC 通读入口） |
| 帧区间对账 | selfcheck.py（空洞/重叠/缺失） | plan-audit + verify-narrative | ✅ 等价 |
| 共用层装配 | Main.tsx | Root.jsx（Subtitle/Hud/ProgressBar） | ✅ 等价 |
| 渲染标记/bundle 复用 | render.done / SKIP_BUNDLE | checkpoint 体系 | ✅ 更强 |

## G. 声明式内容配置层（template/src/config.ts 深读，第三轮 2026-10-10）

a2e 把**内容语义控制**集中在 `config.ts` 的 VIDEO 对象：slug / lang（zh-en 双语规则内建）/ bg（dots|stars 二选一）/ title{big,rest,en,tagline}（片头四件套，「中英不要并排等大」big118/rest96）/ **credit**（片尾署名卡 kicker·title·byline·note）/ **builtBy** / **chapterTech**（章节英文副标数组）/ **hud**（HudEntry[]：按句 id 区间声明小节导航词条）/ rails（RailSpec，与本项目同构）/ endingFade。

对照结论：**消费端本项目全部已实现且接口一致**（TitleCard 四件套 / ChapterCard tech / EndingCredit credit+builtBy / hudEntries 已支持 timeline.hud 声明优先解析含句 id+offset+w / rails 同构同键名）。差异全部在**供给端**——声明数据无人产出：

| # | 缺口 | a2e 形态 | 本仓现状 | 对齐方案 / 状态 |
|---|---|---|---|---|
| G1 | **HUD 小节级声明词条** | config.hud 按句 id 手写导航词条（名词短语 zh≤6 字，tech 英文注脚） | hudEntries 支持声明，但 timeline.json 无 hud 字段 → 走章节级推导 | ✅ 已做：project.json `hud:[{fromS,toS,text,tech}]`，tts_build 透传 `timeline.hud`（现片 12 条，与 rails 三步小节同构） |
| G2 | **片尾署名卡** | config.credit{,title,byline,note='all visuals drawn in code'} + builtBy | EndingCredit 已消费 `timeline.credit`，但无配置源 → 现在片尾只有 builtBy 一行 | ✅ 已做：project.json 加 `credit`，tts_build 透传（见第六轮事故 21：形状升级需 grep 全部消费端） |
| G3 | **章节英文副标** | config.chapterTech 数组（顺序对应 CHAPTER 1..n） | ChapterCard tech 参数在；timeline.chapters 是否含 tech 待确认 | ✅ 已做：project.json 声明 `chapterTech: []`，tts_build 合入 `chapters[i].tech` |
| G4 | bg 二选一开关 | config.bg='dots'\|'stars'（frame_metrics 按值抠幕底） | 两套幕底图元都在；开关形态待确认 | 待确认 Backdrop 是否已参数化；若硬编码则加开关 |
| G5 | **片头四件套数据源** | config.title{big,rest,en,tagline}（big118/rest96，「中英不要并排等大」） | `TitleCard` 组件在 `Primitives.jsx`，但**未装配**、无供给数据 → 片头只有幕底点阵 | ✅ 已做（第六轮 27）：project.json 加 `title`，tts_build 透传 `timeline.title`；`Root.jsx` 把 `TitleCard` 挂到字幕之下常驻层，窗口 `[1, chapters[0].from−9]`；第 1 章补吃章前 45 让窗口够长 |

配套机制（a2e 有、本仓等价或更强）：`lang` 双语规则（SQUEEZE/TEXT_DY/预算分流）→ 本仓 language 字段 + verify:language；tagline 一句话钩子 → TitleCard tagline ✓；HUD「相邻条目无空档自动补齐、跨章自动淡出」→ hudEntries 已实现同机制 ✓。

## H. 镜头构建模式（shots_src G0/G1/G5 深读）

- **状态纯函数**：G1 BUILD_NOTES 明文「所有状态是绝对帧号 N 的纯函数，镜头边界零跳变，后一镜头**导出内容复用前一镜头完成态**」——本仓 stage-kit 组内共享舞台纯函数承接，语义等价 ✓
- **G0 覆盖层**：片头/章节卡/HUD/流程轨/片尾压黑全在覆盖层，Main 中排最低层；HUD「自动补齐相邻条目」由 Overlay.tsx 实现 → 本仓 hudEntries ✓
- **流程轨三态**：active/done/todo 按当前帧计算 → 本仓 Rail ✓（rails 配置同构）
- **图元约定**：ui_rag.tsx「纯函数式、绝对定位、动画由调用方按 N 计算后传入」→ 本仓图元同约定 ✓
- **内容镜头表**：每组 index.ts 导出 SHOTS_Gn {id,from,to,Comp,layer}+BG_Gn → 本仓 registry.jsx+IR scenes ✓

结论：镜头构建模式**已同构**，无需改动。a2e 的 315 行/组手写细度由其多 agent 并行产能支撑，本仓用 18 拓扑 stage-kit 系统化替代——这是既定架构差异（生产力换细度），不是缺口。

## I. 五方面深挖（文稿/配音/时间线/帧画面/动画，第四轮 2026-10-10）

### I-文稿 ✅ 同源
a2e：narration.txt（# CHAPTER+空行分段+| 切分+## gap）+ reference/narration-storyboard.md §5 预算规范。本仓解析规则与写作预算已收录 `docs/knowledge/narration-and-storyboard.md`（含执行状态对照），本轮 verify:subtitle-budget 已把「≤16 字」落成门。无新增缺口。

### I-配音 ⚠️ 2 项
a2e 真值：edge（中，YunxiNeural，模板默认 **+0%** 但 rag 样片裁定 **+8%**——注释明文「+8% 把中文从 5.5 抬到 6 字/秒听着赶」，我们取样片口径 +8% 正确）/ **多引擎**（edge / kokoro 英文默认 / piper 本地 / kokoro_onnx，KOKORO_SR=24000）/ **后处理链**：ffmpeg decode→48k 单声道 float32→trim_edges 去首尾静音→块拼接→**峰值归一化 0.89**→16bit PCM wav。
| # | 差异 | 对齐方案（未动手） |
|---|---|---|
| I1 | 音频后处理链：a2e 峰值归一 0.89 + 16bit wav 无损进编码；我们 mp3 中间格式、无峰值归一 | tts_build.mjs 加：mp3→48k f32→trim→peak 0.89→wav（一并解决之前记录的「双代有损」） |
| I2 | 英文配音链路（kokoro） | **缓**：换英文题时才建；届时 verify:language 已有语言层基础 |

### I-时间线 ✅ 等价（1 项已记录）
sentence{id,chapter,from,to,text,para,subs}/chapter{n,title,from}/sub{from,to,text} vs a2e 全字段等价；subs.ts/timeline.ts 代码生成层我们不需（Root 直读 JSON）。chapter 缺 tech 副标 → G3 已记录。

### I-帧画面 ✅ 数值全同源
a2e frame_metrics 判据（主体≥170/110/80px 分档、紫色碎片块≥80px 且 ≤8、柔光 sat>0.25 & 22<lum<110 & dots 特判、空场=无≥110 主体且无 ≥10000px² 光活动、320×180 采样）——本仓 `src/visual/field.mjs` 全部同名同值，连「点阵幕底误判柔光→亮度下限抬 22」的实战修正都带了。无缺口。

### I-动画 ✅ 词汇全同源（复核修正）
a2e motion_check 阈值（THR 0.35/HOLD_THR 1.5/STILL_MAX 3s/HOLD_MIN 30/EXIT_K 0.9/GLOW_OFF 6/STEP 3）本仓同名同值 ✓。动效词汇复核：**BEZ_SCALE_IN（easing.mjs L57 cubicBezier(0.1,0.1,0.35,1)）与 emphasisPulse（L63，up13/hold4/down13）已存在**，另有 stepKf/typedCount（打字机纯函数）——a2e 动效词汇库已完整移植，无需改动。原判「2 项词汇缺失」系检索遗漏，撤销。

## 消解进度（2026-10-10 总任务书驱动，全自主）
1. ✅ B1 fitSize 22px 红线 → 2. ✅ C4 字幕预算门 + Gate 9 受控实验（注入 47 字块→门红→真源复验路径验证；旧 timeline 14 处超标=旧产物正确反映，新 narration 已切分待重合成转绿）→ 3. ✅ B4 perf:probe → 4. ✅ C1 storyboard:gen + C3 style-guide.md → 5. ✅ **G1-G3 声明式配置**（project.json hud 12 条[与 rails 三步小节同构]/credit/chapterTech + tts_build L241-243 透传）→ 6. ✅ **I1 音频链**（mixAudio 两遍峰值归一 0.89→-1.01dBFS+pcm_s16le wav；引用链 5 处同步：checkpoints/skill/verify-imports/verify-e2e/.gitignore；文档 audio.mp3→wav 已清）→ 7. ✅ I3/I4 复核撤销（easing 已含 BEZ_SCALE_IN L57/emphasisPulse L63/stepKf/typedCount——动效词汇库完整）→ 8. ✅ REFERENCE_PARITY.md 合并本轮 7 项新结论（不另建第二份矩阵）

### 第五轮（2026-10-10 视觉保真 + 门禁有牙）
13. ✅ **FIX A 镜区间首尾相接**（a2e 分镜表衔接规则）：`BEAT.SHOT_LEAD/SHOT_TAIL` → `beat-graph.mjs` 镜区间 = `[本句 from−8, 同章下一句 from−9]`；内容区空白 **14.7% → 1.4%**（仅 3 处章界由 ChapterCard 覆盖）
14. ✅ **FIX B 离场结束在镜头末帧**：`exitPlan` 改 `exitAt = len − BEAT.EXIT_TAIL(8)`（旧 `len − hold` 留下每镜末尾 18–33 帧纯幕底）；`SemanticShots` 用 `plan.exit.exitTail`；`camera.mjs` 三处 `usable` 同步扣 `exit`
15. ✅ **FIX C motion_check hold 假阳性**：亮度法定位后再从该帧往回**最多 `EXIT_TAIL` 帧**跳过仍在离场的帧；新增反例自检（内容一路动到末帧仍报 `hold_too_short`）
16. ✅ **FIX D QC 覆盖度有门**：`qc.mjs` 缺测量文件从 `continue` 改阻断；`verify-production.mjs` 加覆盖度/区间漂移断言（反例实测：4 镜旧产物 → 报「测量覆盖不足」）
17. ✅ **文档交付**：`docs/PRODUCTION_METHOD.md`（13 阶段 × 6 要素）、`docs/ANYTHING2EXPLAINER_PARITY.md`（由 REFERENCE_PARITY.md `git mv` 而来，8 列证据表）、README 索引；同步 `motion-vocabulary` / `composition-and-light` / `lessons` 的 `exitAt` 口径与 `narration-and-storyboard` §6.1「一段=一镜」误读
18. ⏳ 终验（第五轮）：`verify:fast` 36/36 ✅；`verify:production` **BLOCKED**（指纹过期，需全量重渲）→ **第六轮解除约束后已执行，见 §第六轮 26**
19. ✅ **A3 缺口量化（不渲染静态推导）**：43 个有 focus 镜头的「末拍→镜末」距离 min 74/中位 141/max 250 帧，41/43 超 3s 预算 → 判定 `motion_too_low` 为**系统性**缺陷（非 scene-001 独有）；根因定位到 `marksOf`（手写 focus 偏移）与 `beatFrames`（按块派生 it.f0）时间跨度不一致

### 第六轮（2026-10-11 全片重渲闭环 + 三类新事故）

20. ✅ **A3 根治**：`plan.mjs` `tileFocus/focusMarks/focusSlots`（焦点拍表铺满整镜）+ `stage-kit.jsx` `entryOf/marksOf/focusWalk/isPast` 槽序循环（`FOCUS_RISE=11`）+ 4 个焦点盲区拓扑补驱动 + SC02 补 `focus:[0,36,72]`。判据：焦点交接一路演到镜末，`motion_too_low` 不再系统性出现
21. ✅ **事故 · 片尾 credit 渲染崩溃（React error #31）**：`timeline.credit` 已从字符串升级为声明式对象 `{kicker,title,byline,note}`（G2 透传），而 `EndingCredit` 仍把 credit 当 React 子节点渲染 → **整片渲染第一帧即崩**。修法：`Primitives.jsx` `EndingCredit` 同时收字符串（旧 fixture）与对象（新口径），对象版布局对齐 a2e `overlay/Overlay.tsx` 的 EndCredit（kicker→title→byline→分隔线→note→builtBy）。教训：**升级声明式数据形状时，必须 grep 全部消费端**（同类风险：`hud` / `chapterTech`）
22. ✅ **事故 · 一键链缺 `sync-script`**：`run-flow.mjs` 与 `skill.mjs` 的顺序是 tts_build → materialize-ir，缺了中间的 `sync-script` → captions 词流自动分组与 timeline/IR **不同源**（`verify:timeline-source` 报 43 个字幕块不落在任何句区间）。修法：两处补 `node scripts/sync-script.mjs`（tts_build 之后）。教训：**「一键链」与「README 规范链」必须逐项对齐**，否则跑一键链得到的产物过不了门
23. ✅ **事故 · 交付指纹覆盖面漏项（假绿）**：`releaseFingerprint()` 只哈希 `src/shots/G*/SC*.jsx`、`G*/stage.jsx`、`stage-kit.jsx` → 改 `plan.mjs`/`src/remotion/*`/`src/visual/*` 画面会变但指纹不变，生产门给假绿。修法：改为递归覆盖 `src/shots` + `src/remotion` + `src/visual` 全部 `.jsx/.js/.mjs`（87 文件）。教训：**指纹判据只有一个 —— 改了它像素会不会变**
24. ✅ **事故 · S42 镜头 <120 帧**：`selfcheck.py` L77「shot too short (<120f)」是本仓**更严于 a2e** 的自定标准（a2e 只有 `fx.tsx:211 minLen:90` 用于高光镜头）。选择**不降标准、改内容**：`script/narration.txt` S42 解说词扩为「代价最终还是要落在两侧。」（12 字 ≤16 预算），实测 S42 117→134 帧
25. ✅ **指纹 / 门禁覆盖面**：`verify:production` 新增「**测量覆盖度**」与「**输入指纹新鲜度**」断言。反例实测：陈旧 4 镜产物配 44 镜 IR → 报「测量覆盖不足：motion_16x9 量了 4 个镜头，IR 有 44 个」，**门有牙**
26. ⏳ 终验：`verify:fast` 36/36 ✅；`verify:timeline-source` PASS（44 镜/44 句/146 字幕/4 rails/`total_frames=10179`）；全片双比例重渲 → QC → repair → delivery → `verify:production` 见 `docs/ACCEPTANCE_REPORT.md`
27. ✅ **G5 片头四件套装配**：`fixtures/project.json` 加 `title`；`tts_build.mjs` 去掉 `sentenceIndex>0` 短路让**第 1 章也吃章前 45**（对齐 a2e `tts_build.py` 遍历到 chapter 就补 `CHAPTER_GAP`），并透传 `timeline.title`；`Root.jsx` 把 `TitleCard` 挂到字幕之下，窗口 `[1, chapters[0].from−9]`。真帧实测：片头区间 [1,85]=2.83s，四件套（DIGEST/摘要握手/tagline/HTTP Digest Fields）全部可见。副作用：`total_frames 10134→10179`（S01.from 49→94）。⚠ **同轮漏改契约**：`title` 没登记进 `contracts/project.schema.json` / `timeline.schema.json`（`additionalProperties:false`）→ `verify:contracts` FAIL、连带 `verify:spawn` FAIL。已补齐两处 schema 并把静态对撞的 note 措辞改准（「不在对象字面量里」≠「没写」，hud/title/credit 都是条件补写）
28. ✅ **事故 · shot-score 阻断分依赖 advisory 视觉回归层**：`src/visual/shot-score.mjs` 把 `visual_regression` 的 5 个维度（`reference_similarity` 等）折进阻断加权分，而那一层是 `gate:advisory / blocking:false`（64×36 合成参考图 + 像素描述符，与质量反向相关）。后果：同一份 IR —— 盘上**无**该报告（CI 第一次 lint）全 PASS；**有**（CI 第二次 lint / 本地全链）22 个 generic 镜掉到 0.693–0.719 < 0.72 FAIL。修法：阻断分只由 IR 结构维度算（权重和归一，阈值语义不变），视觉维度只随附注记录；`verify-shot-score.mjs` 加不变量断言（advisory 在/不在不得改变判定）+ 反例自检（结构缺失镜头必须 FAIL）。受控实验：结构完好 generic=0.774 PASS、generic 无运镜=0.674 FAIL、结构缺失=0.371 FAIL
