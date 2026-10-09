# 上游教训对照（a2e 五部片 125 条真实返工，本仓库拦住了哪几条、原样复刻了哪几条）

这份文件只管**一件事**：`anything2explainer/reference/lessons.md` 里那 125 条「每条对应一次真实返工」的教训，逐条问一句「同样的事故在 reel-forge 会不会再发生、由谁拦」。规则的技术定义不在这里（去各自真源文档），本文只给事故、状态、执行者（代码路径 + 行号，或某道门）；没有执行者的标「⚠ 无执行者」。

一句话结论先给，三句：

1. **多数教训在本仓库结构上不可能犯**——因为本仓库没有多 agent 分工、没有手搭模板、没有分片 import 的共用层、覆盖层层序写在装配层里。这类占了约一半，本文不逐条铺开（§11 只列机制名与理由）。
2. **少数教训原样还在**，而且其中三条是上游**写过、修过、又被四个 QC 重复报过**的那几条：进度条当前章高亮切在首句帧（`lessons.md:73` → `:188` → 本仓库 `Primitives.jsx:477` 一模一样）、`Counter`/`BigNumber` 默认字族落到 `FONT_HEAVY`（`:64` → 本轮已修 + 加了 pin）、`fadeIn(0)=0` 让首帧空（`:50` → 本仓库 `Primitives.jsx:603` 片尾仍中）。详见 §10。
3. **本仓库独有一种新形态破口**：上游那批教训的根因是「协议提到的工具在共用层不存在」（`:110`、`:176`）。本仓库把它反过来犯了一次——**修法躺在共用层里，渲染层一行都没调用**：`firstOp` / `exitRise` / `exitFade` / `softIn` / `typedCount` / `textDyFor` / `squeezeFor` / `mixHex` / `BEAT.LATERAL` / `BEAT.STILL_MAX_FRAMES` / `FONT_SERIF` 全部零调用者（§10 表 A）。文档写「用 firstOp 不要用 softOp 的低起点」，而代码里没人用 firstOp——这比不存在更难发现，因为它绿着。

分工（一条规则只有一个真源，其余只链接）：

| 主题 | 真源 |
|---|---|
| **上游 125 条教训的归属与逐类对照、本仓库独有的三类破口（死掉的修法 / 注释即执行者 / 半个修法）、结构上不可能犯的那一类为什么不可能** | **本文** |
| 帧号口径、节拍窗口、帧数预算、运镜词表、效果配额与它的弱门、修复路由、死表清单 | `motion-vocabulary.md` |
| 设计空间与 band、内容区划分、主角/配角尺寸、发光模型、`frame_metrics` 判据与 ×k 换算 | `composition-and-light.md` |
| 调色板与每个色值的读取状态、字号阶梯、**字体角色表（含本轮的 `FONT_ORB` pin）**、画面文案准入与禁令 | `style-guide.md` |
| 解说词语法、停顿与帧数预算、分镜表格式、`selfcheck.py` 判的九件事、**时长目标无执行者** | `narration-and-storyboard.md` |
| provider 形态与三态信封、四个角色的 payload、构建组分组与 `only_paths`、**agent 输出零下游消费者**、still 采样计划（每镜 ≥6 / 高光 ≥10）+ 30 帧测渲**是计划不是证明** | `agent-protocol.md` §3.1、§4 |
| 画面文字出处门 A1/A2/B/C 的真实语义、四条弱点、三条变异结果 | `research-brief.md` §4 |
| 各道门的**命令**与生产顺序、人工确认点（本文只说哪条事故由哪道门拦） | `SKILL.md` |
| **125 条教训的原文**（本文只给归属与状态，不复述结论；要读事故本身去这里） | `anything2explainer/reference/lessons.md`（上游文件，**不在本仓库**；地址与吸收范围见 `docs/REFERENCES.md`） |

---

## 0. 上游那份文件长什么样

`anything2explainer/reference/lessons.md` 共 202 行、**125 条顶层 bullet**，按片累积（标题行不算）：

| 段落 | 片 | 条数 | 上游行号 |
|---|---|---|---|
| 1 | 第一片《RAG》（样片，日期未标） | 26 | `:3-39` |
| 2 | 第二片《eCPM 与广告竞价》2026-09-07，48 镜头 / 4′16″ | 33 | `:42-92` |
| 3 | 第三片《电影运镜》2026-09-08，50 镜头 / 4′00″ | 32 | `:95-145` |
| 4 | 一分钟《Agentic RL》2026-09-09 | 5 | `:148-153` |
| 5 | 第四片《The AI Systems Performance Engineer》2026-09-10，英文，48 镜头 / 5′07″，9 组 | 29 | `:157-203` |

它开头写的是「新片结束后把新教训追加到这里」，所以它是**上游唯一一份记录「规则写进文档之后实际发生了什么」的材料**——这才是逐条对照的理由。风格指南告诉你能做什么，lessons 告诉你做过什么。

⚠ 本文**不复制**这份文件的内容进本仓库（按既定路线：参考方法、不复用文本）。第 4 段那 5 条在上游挂在第三片的 `#` 块下（`:148` 用的是 `##` 级），逐条对照时按片归。

## 1. 状态口径（六个词，本文只用这六个）

| 标记 | 含义 |
|---|---|
| ✅ 有牙齿 | 有执行者，而且**判的是被改的对象本身**——改掉对象它就红。附变异/夹具证据。 |
| 🔒 构造性规避 | 本仓库做不出那个形状（装配层唯一入口 / 单一真源 / 无对应结构），不是靠门拦的。 |
| 📝 只有注释 | 事故原因写进了代码注释，但没有门、代码自己也没做到。 |
| ⚠ 无执行者 | 规则在本仓库存在（写在文档或 IR 里），没有任何代码读它。 |
| ❌ 原样还在 | 上游踩过、本仓库现在**会中同一颗雷**，且给得出证据链。 |
| ◐ 半个修法 | 上游的两段修法只落了一段。 |

「上游已修 + 本仓库有门」= ✅；「上游已修 + 本仓库只有注释」= 📝。这是本文最有信息量的一列，别把两者混在一起。

---

## 2. 帧时序：入场、停留、离场

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:8` | 「末 2 帧不离场 + 下一镜头硬切」被两侧理解成「我不动、你从节拍帧才入场」→ 一片 5 处组界空场 | ✅ | 离场不是文字约定而是算出来的：`exitPlan`（`src/shots/plan.mjs:35-40`）按 `BEAT.EXIT_HOLD_MIN/MAX = 30/45`（`src/visual/easing.mjs:139-140`）给 `exitAt`，入场晚于它记 `beat-after-exit`（`plan.mjs:428`），夹具把五类 plan issue 全列进必查 token（`scripts/verify-render-layer.mjs:140`） |
| `:9` | 6.7%/帧的线性 exitFade 末帧还剩 40–57%，动态下「啪」一声 → 用 `1−(n/N)^1.5` | ✅ + 📝 | 渲染层用的是幂加速：`exitDrop` 的 α = `1 − (n/len)^1.6`、Δ=440（`easing.mjs:164-168`，幂常量 `BEAT.EXIT_ACCEL_P` `:138`），调用点 `Primitives.jsx`（Hud/ChapterCard）与 `SemanticShots.jsx:9` 导入。**但**线性的 `exitFade`（`easing.mjs:163`）照样导出，且**零调用者**——它不会中招，因为它没人用；同理 `exitRise`（`:170-172`）零调用者（§10 表 A） |
| `:10` | 自下滑入 Δ≈300 穿过 y637–690 字幕带（一片 6 处），改「Δ≤120 或侧向滑入 + 前 6 帧渐入」 | ◐ | **侧向滑入**这一半的常量在（`BEAT.LATERAL`，`easing.mjs:130`，注释「横向滑入 Δ260–320」）**但零调用者**；入场位移走 `slideIn`。字幕带禁令写在 `Primitives.jsx:500`（「⚠ 字幕带与进度条带（y637–720）永不放画面内容；入场轨迹不得穿过字幕带」），执行者只有**静态 y**：`verify-render-layer.mjs:167-170` 判 authored 元素的 `y` 是否越出 `[contentTopNoRail−200, contentBottom+40]`。**运动轨迹穿过带子这件事没有静态判据**——要渲出来才看得见 |
| `:46` | 首批元素等到字幕块起始帧才动 → 镜头首段空屏，组界叠成 11–16 帧纯黑；裁定「首批元素的 f0 = 镜头首帧」 | ⚠（静态） | 本仓库选了另一条路：入场锚在**本元素对应字幕块**并允许早 6 帧（`BEAT_WINDOW = [-6, 3]`，`src/visual/style.mjs:160`；排布在 `beatFrames`，`plan.mjs:279-`，窗口内从 −4 起排）。效果是「镜头前 ≤ subFrom−7 帧可能没人动」——上游要 8 帧预算，这里给 7 帧。**这段空场没有任何静态判据**，只有测量层 `EMPTY_FIELD` 类 token 在真渲帧上才判得到（`scripts/frame_metrics.py`），而真渲从未跑过（见文末验证缺口） |
| `:47` | 末拍动画溢出镜头末尾：末块到镜头结束只剩 20 帧，塞不下 22 帧 slideUp / 14 帧 draw-on → 元素整镜不出现、下镜突然满态 | ◐ | `beat-after-exit` 判**入场帧**晚于离场起点（`plan.mjs:428`），夹具 `verify-render-layer.mjs:185-188`（5 件配 2 块字幕全落窗 + 逐件错峰）。**动画本身放不放得下**（f0 + 动效长度 ≤ len）没人算：`BEAT.DRAW_ON=22`、`BEAT.COUNTER=20`（`easing.mjs:133, 135`）与 `len` 之间没有任何比较 |
| `:23` | kf 首值陷阱：`t < 首关键帧` 返回首值，入场表必须以 [镜头起始帧, 画外值] 开头，否则元素提前停在画内 | ✅ 🔒 | 同一颗雷在引擎里当设计约束处理：`easing.mjs:74` 写着「⚠ 首值陷阱：t < 首关键帧时返回**首值**（不是 0）」，实现 `:101` `if (t < pairs[0][0]) return pairs[0][1]`；关键帧一律由 `buildPlan` 以 **1-based 镜头首帧**生成（`cameraKeysFromPreset(presetName, 1, len, …)`、`slowPushKeys(1, …)`，`plan.mjs:389-394`），词表里没有一个调用点传 0。帧号口径真源 `motion-vocabulary.md` §1 |
| `:50` | `fadeIn(n, len)` 在 n=0 返回 0 → 用它做首帧入场必然空一帧；改用 `softOp`（首帧 ≈25%） | ✅ **且 ❌** | 主角/配角层确实换了：`softOp(n, len, from=0.25)`（`easing.mjs:160`），主角灯亮 `SemanticShots.jsx:239`、配角 `:276, :346, :361`。**但片尾署名卡还中着**：`Primitives.jsx:603` `const op = fadeIn(N - from, 18) * …`，`N === from` 那帧 `fadeIn(0,18)=0` → 黑底与两行字同时 α=0，整帧纯黑。同一条上游教训，同一个文件里一半修了一半没修（§10 破口 C 的第二例） |
| `:51` | 更隐蔽的一层：`softOp(0,8)`=25% 时白描边亮度只有 65，仍低于「亮度 >70」的空场判据；要首帧被量到得 `softOp(n+1, 6)`（≈57%） | ⚠ | 这个换算在本仓库**已经抽象成命名修法**：`firstOp(n, len=6, from=0.57)`（`easing.mjs:161`），而且 `:151-159` 那段注释把两条实测根因（25% 仍可能低于 `bright_luma`/`SOFT_GLOW` 可见下限）写清了。**零调用者**。判据数字本身在 `src/visual/field.mjs`（×k 换算见 `composition-and-light.md` §7） |
| `:52` | 多元素错峰入场别用 GlitchIn（5 个胶囊各自随机闪像掉帧），用错峰 slide+fade | ✅ 🔒 | 错峰是常量驱动的：`BEAT.STAGGER = 2`（`easing.mjs:132`）+ `stagger()`（`:173-174`），入场帧分配在 `beatFrames`（`plan.mjs:279-`）；每块最多 4 件（`BEAT_PER_BLOCK_MAX`，注释给了理由：10 帧窗口 ÷ 2 帧错峰）。glitch 与错峰解耦：`effectsOf` 只认声明（`plan.mjs` 效果门控段），且 `Math.random()` 被门禁逐文件禁掉（`verify-render-layer.mjs:211-232` 走 `src/remotion`/`src/shots`/`src/visual`）——「各自随机闪」在这里根本写不出来 |
| `:168-171` | 「入场即停」是缺陷：4/6 镜头静止帧 42–72%、最长 2.8 s，且**样片也有这个毛病，所以对标样片筛不出它**；裁定「入场后不许完全静止 >30 帧」+「组级低分辨率偏松，成片复测才是判据」 | ✅（长静止）/⚠（静止比） | `scripts/motion_check.py:197-227` 量最长连续静止段并分类「真静 / 小面积动作 / 有动作」（`:227` 打「变化像素中位」），判据数字只有一份真源：`src/visual/field.mjs:170` `still_thr=0.35`、`:172` `still_max_seconds=3.0`，导出链 `export-visual-contracts.mjs` → `fixtures/visual_contracts.json`（`:93` 还断言 `hold_thr > still_thr`）。下游 `src/qc/flags.mjs:2, 10, 35` 一一对应，`src/repair/engine.mjs:225` 把分类透传。低分辨率采样确实存在（`:122` `scale_to_width(SAMPLE_W)`）。**两处偏离**：① 上游判「静止 ≤40%」，本仓库 `motion_check.py:270` 明写「still% 只报不判」；② 上游的 ≤30 帧被本仓库放宽成 ≤3 s（=90 帧）。另外 `BEAT.STILL_MAX_FRAMES = 90`（`easing.mjs:141`）与 `field.mjs` 那份**重复且零调用者**——两个真源里没被读的那个 |
| `:121` | 末镜头的动作被片尾压黑吃掉（`endingFade=30` 从末句 −30 起） | 🔒 | 本仓库的片尾不压在内容上：`Root.jsx:80` `from={lastSceneFrame + 12}`，`EndingCredit` 自己 `if (N < from) return null`（`Primitives.jsx:602`）。没有「压黑吃掉末拍」这个形状。代价见 §7 最后两行 |

---

## 3. 空、小、暗：审美传递这一层

上游第二片复盘（`:86-91`）是整套「构图与光」文档的起因，也是本仓库存在的一部分理由。

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:87` | skill 把禁令传过去了，「画多大、谁发光、高光怎么编排」只在做样片的人脑子里 → 新片主体中位高度 172px vs 样片 219px、29% 时长最大物体 <110px、主角全是无光白线框 | ✅（常量与判据）/⚠（画面实际） | 那三个数现在是常量与判据：`HERO_MIN=170`、`SUBJECT_SMALL=110`、`BIG_TEXT_MIN=96`（`src/visual/style.mjs` 主角尺寸三档段），空场判据在 `src/visual/field.mjs`，主角/配角尺寸的读取链与下限断言见 `composition-and-light.md` §5–§6。**但**「实际画出来多大」只有渲出来才量得到，`.jsx` 从未执行（文末缺口） |
| `:89` | QC 只查缺陷不查「空 / 小 / 暗」：四轮 QC 全过，画面还是小而暗 | ✅ | `frame_metrics.py` 量最大物体高度 / 主角区柔光面积 / 紫色碎片中位，flag 走 `src/qc/flags.mjs`（severity 决定是否阻断：`flags.mjs:15` 只有 high/medium 阻断）；紫色碎片判据 `PURPLE_DEBRIS`（`field.mjs:146-153`）+ 实现 `frame_metrics.py:133-134, 188-193, 332-333`，真源与换算见 `composition-and-light.md` §7 |
| `:90` | 运镜被**上游自己的文档**压掉了：旧 build-rules 写「静态镜头为主」，结果两片都只有 2.2–2.5 次/分钟、零次推近，而风格来源原片 6.6 次/分钟 | ◐ | 词表、`CameraRig`（`Fx.jsx:322-`）、视差深度 `PARALLAX_DEPTH` 都在；`CAMERA_CLEAR`（运镜结束到离场 ≥30 帧）有读者并被 `verify-render-layer.mjs` 读。**每章 ≥3 次运镜**这条：`CAMERA_PER_CHAPTER_MIN = 3`（`src/visual/style.mjs:164`）**零代码读**，而 `verify-render-layer.mjs:192-194` 三条「效果预算」断言判的是常量自己 `<= 2 / <= 1 / <= 1`（恒真）。完整论述在 `motion-vocabulary.md` §7，不在此重述 |
| `:112-116` | 高光时刻的「清场 → 扫光」开场本身被判空场：SC12 前 79 帧只有一条舞台光线 + 一轮扫光细带，最大物体 ≤46px；而 §6 的豁免要求内容区柔光 ≥10000px²，一轮扫光实测只有 5004px² | ⚠ | 豁免判据在 `field.mjs`（`SET_PIECE` 时序表真源 `field.mjs:101-109`），`composition-and-light.md` §6 写了豁免条件；**「前 60–80 帧单独算一遍最大物体多大」没有任何执行者**，也没有「扫光三轮 → 柔光面积达标」的静态核算。上游给的两条修法（三轮 + 第 1 拍给临时主角）里，第一条落在 `LightSweep` 的 `rounds` 参数（`Fx.jsx:72`），第二条没有 |
| `:153` | 图形光环与标签要**看放大帧**：只看 contact sheet 会漏掉白环贴住白字 | ◐ | 写死的那半已修：`required_per_scene`、组号与 still 下限现在同源 `src/build/limits.mjs:27,38,44`（`still-benchmark.mjs:4,40,51`、`still-budget.mjs:3,26`，另见 `build-groups.mjs:10`、`materialize-shots.mjs:6`、`verify-shots.mjs:5`），由 `verify:limits` 五段守着，完整论述与 19 例变异记录在 `agent-protocol.md` §3.1、§4。**「放大看」这半仍然根本没有**：门只看 manifest 里的计划帧号，没有任何步骤把放大帧交给任何人或 agent 看，contact sheet 是唯一出口 |

---

## 4. 画面文字与事实合规

真源是 `research-brief.md` §4（门 A1/A2/B/C 的语义、四条弱点、三条变异结果）。这里只做事故对照。

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:12` | 「glitch」一词写在每一格 → 构建 agent 给所有文字加闪烁，一片 102 处，用户否决 | ◐ | `effectsOf` 只认显式声明、缺省即关（`plan.mjs` 效果门控段，含「⚠ 强调脉冲是高光时刻的手势，不是每镜头默认动作」的历史注释——以前写 `fx.pulse !== false`，缺省即开）；每镜头 ≤1 的**源码级计数**没有门：`verify-render-layer.mjs:193` 只断常量 `GLITCH_PER_SHOT_MAX <= 1`（恒真）。上游那句「源码级计数闪烁白名单」在本仓库只有**紫光横扫**落了地：`Root.jsx:52` 用 `SWEEP_WHITELIST_MAX` 截断白名单 |
| `:56` | 计数动画的中间值也是上画面的数字：年份 1995→1998 会让中间三年清晰可读 4–6 帧，都不在事实清单内 | ❌ | **本仓库会中，且没有任何东西拦。** `countTo`（`Fx.jsx:253`，20 帧幂 2 缓出）真在画面上用：主角大数字 `SemanticShots.jsx:242`、配角数字 `:365`。`verify-text-provenance.mjs` 的 A2 段只收集 `buildPlan` 产出的 `hero.text/sub/unit` 与 `items[].text/unit`（`scripts/verify-text-provenance.mjs:108-136`）——**运行时逐帧生成的中间整数不在里面**。而 `Fx.jsx:257` 的注释写着「事实出处门禁要按出现的每个中间值登记」：一条注释在给门禁布置它做不到的任务。最小修法（本文只写不改）：把 `countTo` 在 `[0, BEAT.COUNTER]` 区间展开的每个中间值并入 A2 的数字对账，或数字主角不做计数 |
| `:57` | 让年份不可读要够狠：blur 6.3→1.3px 中间值仍可读，最终 12→9px + 落定归零才干净 | ⊘ | 本仓库没有 `YearRoll` 等价图元（`KNOWN_ICONS` 17 个键里没有，`plan.mjs:67`），所以没有这条判据的落点 |
| `:58` | 自建示意算例必须与画面标注自洽：「本秒 +2405」下面跟「一天几十亿次」（差 30 倍）；柱高算出 34 而画面标「≈1/5」（应 24） | ⚠ | 无执行者。A2 的数字对账只判「这个数字有没有出处」，不判「这两个数字互相打不打得架」 |
| `:59` | **补一条查法：从源码静态抽取所有会上画面的字面量，和事实清单对账**——QC 从像素抽帧查，看不到没被抽到的帧；源码对账把 8 个组一次扫完，那个计数器就是这么抓到的（四个 QC 全漏） | ✅ | 这条是本仓库**唯一被完整复刻并且有牙齿**的上游查法：`scripts/verify-text-provenance.mjs` B 段五通道扫源码（`:159-163` `attrLiteral`/`stringArray`/`legacyFallback`/`jsxChildren`/`quotedChildren`）+ 扫描器自检 7 探针（`:203-220`）+ 扫到 0 条即 FAIL（`:241-243`）+ 数字不可被白名单豁免（`:145-148`）+ `--write` 只登记现存的（`:226-239`，本次清掉 28 条幽灵）。三条变异结果与弱点清单见 `research-brief.md` §4 |
| `:145` | 主会话的静态检查值得每片都留：帧覆盖 / 闪烁白名单源码级计数 / 字面量对账，**噪声过滤要写好**否则一堆假阳性没人看 | ✅ ◐ ⚠ | 字面量对账 ✅（上一行）；噪声过滤 ✅（`scannerSelfTest` 保证「扫得到」，`--write` 保证「登记的是真存在的」）；帧覆盖 ◐（`verify-scene-contract.mjs:31-34` 判 duplicate / `invalid-duration` / **overlap**，**不判空洞**：`start > maxSceneEnd` 不报错，而 `render-ir.mjs:1` 的 `duration = max(start+duration)` 会把空洞变成片尾一段无人认领的时长）；闪烁白名单源码级计数 ⚠（只紫光横扫落了地）。**注册状态也是破口**：`verify:scene-contract` 只在 `.github/workflows/verify.yml:66`，不在 `verify:fast` 也不在一键链 |
| `:29` | 定稿后不要改词：构建组代码里帧号硬编码，要改先改词再全体重对位 | ◐ | 「定稿后不改词」有执行者，但只在 checkpoint 路径上——详见 `narration-and-storyboard.md` §6.4，本文不重述 |
| `:162` | Noto Sans SC 的弯引号 `“ ”` 与 `…` 是 1em 全宽字形，英文里留出一个大空档；画面上一律用直引号 | ◐ | 宽度模型认得它们（`textfit.mjs:27` `if (c >= 0x2000) em += 1`，注释 `:7` 点明「几乎都是 1em」），配音侧把它们删掉（`scripts/tts_build.mjs:42` 的 `clean` 正则含 `“” …`）。**画面上用直引号这件事没有执行者**：文案原样进 `Subtitle`/`CText` |

---

## 5. 字体与排版

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:28` | 最小字号 22px（QC 量 ink 高），上标角标可例外 20px | ◐ | `TEXT_MIN` 有，`plan.mjs:431` 的 `text-below-min` **只在分镜显式写了字号时判**（渲染层自算的字号由 `fitSize` 兜，实际显示值由 `frame_metrics` 从截图反查）。这是 `motion-vocabulary.md`/`composition-and-light.md` 都写过的分工，本文只补一句：`SCALE` 类破坏这条（下一行） |
| `:126` | 整组 `scale(0.72)` 把 26px 字变成 18.7px，跌破下限；QC 从像素查不出来（量的是 ink 高），是构建组自己算出来报的 | 🔒（当前）/⚠（将来） | 当前唯一的整层 `scale` 是主角呼吸（`SemanticShots.jsx:252`），而 `emphasisPulse`（`easing.mjs:63-69`）区间是 `1 → 1.11 → 1`，**不缩到 1 以下**，所以现在不会中。没有任何判据阻止下一个 `scale(<1)`；上游给的通则（「凡是整组 scale 的地方，把里面所有字号乘一遍缩放系数再对照下限」）零执行者 |
| `:62` | `Orbitron[wght].ttf` 不含 `¥`(U+00A5)、`≠`(U+2260)、`≈`(U+2248)（fontTools 可核）；回退链要保留 `'Orbitron','Audiowide'`，`≠`/`≈` 直接用 `FONT_HEAVY` | ◐ | **回退链是照裁定写的**：`FONT_ORB = "'Orbitron', 'Audiowide', sans-serif"`（`src/visual/style.mjs:129`）。**字形覆盖没有任何检查**：`verify-imports.mjs:186` 只判 `FONTS` 非空、`:188` 只判 `public/<file>` 存在（注释自己写了理由：「装载失败只会打 console，画面静默换系统字体」）；没有 fontTools、没有码位表、没有 `¥/≠/≈` 的例外规则 |
| `:63` | Orbitron 的斜杠零（Ø）孤立成单个 `0` 会被读成图标（「0 次点击」读成「Ø 次点击」） | ⚠ | 无执行者，也无对应常量。这条只能靠人 |
| `:64` | `Counter` 的默认字族是 `FONT_HEAVY` 不是 Orbitron，与风格指南「数字用 Orbitron」冲突 → **四个组同时反馈并各自绕开自建了一份**；已把默认改成 `FONT_ORB` 并补 `family` 入口 | ❌ → ✅（本轮） | 本仓库原样中着同一颗雷：`BigNumber`（`Fx.jsx:258`）的 `family` 原来**没有默认值** → `CText` 的 `family = FONT_HEAVY`（`Primitives.jsx:52`）生效 → 数字用 Noto 画；而且 `emFor(family)`（`Primitives.jsx:87-92`）按字体串取宽度系数，`EM_ORB = 1.2`（`textfit.mjs:19`）一起失效——字形与宽度模型同时错档。**本轮改动**：`family = FONT_ORB` + `FONT_ORB` 进 `Fx.jsx:4` 的 import + 新 pin `verify-render-layer.mjs:196-208`（三种变异各自变红：删默认值 / 从 import 摘掉 `FONT_ORB` / 改掉 `BigNumber` 签名）。**残留缺口**：pin 只保证「默认值写在那儿」，不保证「画出来真的是 Orbitron」——那需要真渲 + 字体装载成功（`Design.jsx:54` 装载失败不阻断） |
| `:27` | CJK 行盒 ascent 让墨迹比 top 低 3–7px，居中文字预扣 `dy −2…−5` | ✅ | `CText` 默认 `dy = -2` 并把注释写在 `Primitives.jsx:48-52`；`GhostText` `-4`（`Fx.jsx:124`）、`BigNumber` `-2`（`:258`）。注意上游给的是一段区间，本仓库取的是同一个端点，没取 lang |
| `:163` | `Pill.textDy` 默认 −2 是**中文**基线补偿，英文片要跟 `TEXT_DY`；模板已改 | ⚠ | 本仓库把这条做成了**函数但没有接**：`textDyFor(lang) = lang === 'en' ? 0 : -2`（`style.mjs:143`）**零调用者**；同时 `squeezeFor(lang)`（`:142`，注释「拉丁压窄会变形」）也零调用者，`CText` 的 `scaleX` 默认 1、由调用点各写各的（`EndingCredit` 自己传 0.85，`Primitives.jsx:608`）。**后果**：出英文片时基线补偿仍是 −2，且没有任何东西读 `language` 去改它。语言开关这一层的功能差异仍在：`language` 由 `tts_build.mjs` 写进 timeline，渲染层没有任何东西读它去调字号补偿或压窄系数 |
| `:180` | `CodeCard` 的 tag 16px 低于 22 下限，四个组都用了它才被 QC 抓到——**共用图元里的字号也要过下限** | ⚠ | 共用图元的默认字号写在 CSS 默认参数里（`TechText` 30、`ProgressBar.labelSize` 24、`BigNumber.unitSize` 24…），没有一条门把 `TEXT_MIN` 对着图元默认值扫一遍。`plan.mjs:431` 只扫 IR/recipe 传进来的 `size` |

---

## 6. 图元、几何与光

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:24` | Check/Cross 这类 draw-on 在 `p=0` 时要 `return null`，否则 linecap 露出一个点 | 🔒 | 引擎层就返 null：`Primitives.jsx:317` `if (p <= 0) return null`、`:324` 同、`:287`/`:310` 用 `<= 0.001` 早退。写不出「p=0 还画一笔」的形状 |
| `:25` | 颜色混合函数要能解析 `rgb()` 与 hex，嵌套解析出 NaN → 25 张卡全不可见 | 🔒（当前）/📝 | `Rgba`（`style.mjs:107-110`）与 `mixHex`（`:113-122`）都只吃 hex，`mixHex` 返回 `rgb(...)`，注释 `:112` 明写「⚠ 不能再喂回 mixHex（会静默变 NaN）」——与上游事故逐字相同，但**没有门**，而且 `mixHex` **零调用者**（连犯的机会都没有）。上游的另一个修法（提供返回 `#hex` 的版本）没有 |
| `:26` | `blur σ<0.8` 在 Chromium 无效；`feConvolveMatrix` 走软件路径 0.13 fps 禁用；SVG filter 一律 `colorInterpolationFilters="sRGB"` | 📝 ◐ | 现役三处 filter **都带 sRGB**（`Fx.jsx:398`、`Glitch.jsx:26, 29`），性能红线写在注释里（`Fx.jsx:384`、`Primitives.jsx:269`「单帧 SVG filter ≤6 个；禁用 feConvolveMatrix；一律 sRGB」）。**σ 下限没有兜**：`Fx.jsx:399` 写的是 `stdDeviation={`${Math.max(0, bx)} ${Math.max(0, by)}`}`，调用方传 0.5 就静默无效——上游那条 0.8 正好没落进代码；`≤6 个 filter` 与 `禁 feConvolveMatrix` 都没有门（全仓 `feConvolveMatrix` 现在零出现） |
| `:15-16` | 覆盖层的压黑/淡出必须在内容之上（`SHOTS` 数组末尾或 `aboveBar`），否则末镜头在自己 Sequence 结束时硬切消失 | 🔒 | 层序写在装配层唯一入口里，agent 改不了：`Root.jsx:64-80` 顺序 = `Fonts → Audio → FootageTrack → Backdrop → scenes → Hud → ProgressBar → ChapterCard → Subtitle → EndingCredit`。压黑（`EndingCredit` 的 0.72 黑底，`Primitives.jsx:607`）确实在内容之后 |
| `:67-70` | 图元几何要先验算再画：`GavelIcon` 把槌头画在支点左上 76 单位、音块在支点下 101 单位 → ±26° 旋转永远碰不到音块（QC 实测槌头上移）；落槌停在接触姿态被读成橡皮图章；draw-on 的叉和箭头挤在同一个 `<Svg>` 里会被卡片黑底整块盖掉 | ⚠ | **无执行者。** `icon-unregistered`（`plan.mjs:421` 段 + `verify-render-layer.mjs:153`）只查「这个键在不在 17 个注册键里」，不查几何。本仓库没有任何「两个图元是否真的接触/遮挡」的断言。这类事故在这里的形态是：名字对、注册对、门全绿，画面讲错 |
| `:97-100` | 当主题本身是几何的：**先造一个真的**，别用 CSS 假造——如果推近和变焦长得一样，整章等于讲错。真投影后 QC 逐像素拿到 275/275px 与 197/158px，论点才变成「画面证明」 | ⚠ | 无执行者，也没有任何机制能区分「画面证明」与「旁白声称」。这是本仓库与上游**能力上**的差距，不是纪律上的：门禁全部围绕「有没有越界/有没有出处/够不够大」，没有一条围绕「画面演的是不是那句话讲的机制」 |
| `:133` | 图元默认值要按规范设：`FovCone` 默认紫，G5 显式传灰、G6 用默认 → 同一章上下半颜色不同，还是「紫色碎片 ≥8」的主因。**不要让「传不传参数」决定风格** | ❌ | 同一颗雷在本仓库：`LightBar` 的默认色是 `PURPLE_LIGHT`（`Fx.jsx:32`），而画风规则是「紫只给当前重点 / 配角不发光」（真源 `style-guide.md` §2.1、§8 第二行）。`accent-overflow` 管的是**同镜头 ≤1 个 active**（`plan.mjs:412-420`，flag 在 `:418`），管不到「谁默认带紫」 |

---

## 7. 覆盖层：章节卡、进度条、HUD、片尾

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:18` | HUD 同章相邻条目要无空档（上一条延到下一条 `from−1`）；进章节卡前 8 帧淡出；HUD 换词与大 glitch 错开 4 帧否则同帧全黑 | ✅ ◐ 📝 | **空档**这条最硬：续期写在 `hudEntries`（`src/visual/timeline.mjs:73-85`，`:85` `list[i].to = next.from - 1` **但** `acrossCard`（`:74`）判过「这段留白是过场还是漏了」），审计 `hudBlankSpans`（`:98-120`，区间减法 `:122`），门 `scripts/verify-timeline.mjs:60` 断正常分镜报 0 档、`:62` 用「故意删一条」的夹具断真能报出来——正负都有，所以不是假门。**进章节卡前淡出** ◐：卡片窗口 `prevTo+3 … curFrom−9` 是真源（`timeline.mjs:143-149` 与 `:154-160`），但「8 帧淡出」的帧数在 `Primitives.jsx` 的 Hud 里另算。**HUD 换词与 glitch 错开 4 帧** 📝：注释里有理由，无判据 |
| `:28` | 流程轨末 8 帧淡出，不要一帧消失；流程轨当前步别做成 1 帧硬切（灰底↔紫底同帧翻转） | ⚠ | 本仓库有 flow rail（`SemanticShots.jsx:109, 178, 272-273` 的 `Rail`），但**没有「当前步」状态**，也没有跨步过渡的判据；`:10` 那条「Δ≤22 否则越过 rail 空间契约」在这里同样只剩 `contentTopNoRail` 这个键名和被夹的静态 y（`verify-render-layer.mjs:167-170`） |
| `:73` 与 `:188` | **进度条当前章高亮要切在章节卡起始帧，不是本章首句起始帧**——否则章节卡在画面正中宣告「02 一次竞价」的那 45 帧里，底部进度条还高亮着上一章，两处信息矛盾。第二片写过，第四片四个 QC 又都报了，这次才真的改进模板 | ❌ **原样还在** | `ProgressBar` 的 `starts[i] = chapters[i].from`（`Primitives.jsx:455`），而 `from` 就是**本章首句首帧**——这一点 `timeline.mjs:27` 注释自陈（「tts_build 只写每章 `from`（= 本章首句首帧）」）。章名高亮色 `N >= from ? WHITE : GREY`（`Primitives.jsx:477`）于是切在首句帧，卡片期间（`prevTo+3 … curFrom−9`，`timeline.mjs:145-147`）整段仍高亮上一章。**只有半个修法落地**：填充宽度那一段确实往前提了——`const begin = i === 0 ? from : from - 3`（`:464`，注释「避免卡片期间条不动或先走」），但它只喂给 `p`（宽度），没喂给 `:477` 的颜色。**最小改法**：`:477` 的条件换成 `N >= begin`（或按 `chapterCardWindows` 给的 `from` 判），并给它一条正负夹具——`verify:render-layer` 目前不读 `ProgressBar` |
| `:150` | 短片缩短 `CHAPTER_GAP` 后，HUD 原有「间隔 <30 帧即视为同章」的规则会把上一章胶囊盖到下一章章节卡上；应按句子的 `chapter` 比较，而不是猜间隔 | ✅ 🔒 | 本仓库从第一版就是按 `chapter` 字段聚合：`chaptersOf` 用 `s.chapter ?? 1` 建 `lastFrameOfChapter`（`timeline.mjs:36-39`），章节边界不靠猜。`CHAPTER_GAP_FRAMES` 只在 `tts_build.mjs` 里当留白用 |
| `:76-77` | 片尾 `EndingTop` 的淡入帧数决定末段纯黑有多长；`endingFade=30` 会从「末句 −30」开始压黑，把全片最后一个动作吃掉 | 🔒 ◐ | 形状不同：本仓库压黑在内容**之后**（`Root.jsx:80` `from = lastSceneFrame + 12`；`Primitives.jsx:602` 早退）。**残留**：`+12` 与同文件 `:599` 注释「⚠ endingFade 会吃掉末拍动作，留 ≥30 帧」直接矛盾——注释要求 30，装配层给 12，没有门（§10 表 B 第一行） |
| `:189-190` | 片尾进度条不能在画面全黑后孤悬 2 s：`EndingTop` 改成随 `endingFade` 同步压黑；署名卡起点必须 **>** 末句 `to`（第一版与末字幕、末镜头残影重叠 20 帧） | ◐ | 起点条件天然满足（`from = lastSceneFrame + 12 > 末句 to`）。**进度条与片尾没有联动**：`Root.jsx:76-77` 的 `Hud`/`ProgressBar` 无条件渲染到 `totalFrames`，署名期间它们只是被 `Primitives.jsx:607` 那块 α=0.72 的黑压住，而条体自己是 0.52 α（`Primitives.jsx:459`）——上游的修法是「同步淡出」，本仓库没有 |
| `:151` | 只有 40 帧的片头要重排动效预算，不能把长片头的 glitch + 副标 + 推镜挤一起；最终选三行统一 6 帧淡入 | ⚠ | 没有片头专段（`TitleCard` 未装配，`style-guide.md` §6 字体角色表那行标了），所以这条在本仓库既没实现也没落点 |

---

## 8. 配音与时间轴

| 上游 | 事故一句话 | 状态 | 本仓库执行者 |
|---|---|---|---|
| `:31` | 定稿后不要改词（帧号硬编码在构建组代码里） | ◐ | 见 `narration-and-storyboard.md` §6.4 |
| `:32` | TTS 词边界起点与音频 onset 误差 ≈1 帧；检测 onset 时窗口别跨到上一句尾音（会误读 −15 帧） | ✅ | 漂移预算写成了可跑判据：`src/visual/word-boundary.mjs:34` `lintWordBoundaryTimeline(timeline, words, {maxDriftFrames = 2})`，`:46` 判非单调（`start < previousEnd - 0.01`），`:53` 每句必须有覆盖（`no-word-boundary-coverage`），`:15` 没词边界直接 `throw`。契约侧 `src/visual/asr-contract.mjs:1-2` 用 NFKC + 小写归一，`:44-47` 只认 `tts-word-boundary` 三字段一致 |
| `:33` | 英文 `|` 切块拼回整句时块之间要补空格（曾把 `powerful|but` 送进 edge-tts 读成 powerfulbut），块起始游标也要跳过这个空格 | ✅ | 逐字实现且带语言条件：`scripts/tts_build.mjs:101` `split("|")` → `:102` `chunks.join(language === "en" ? " " : "")`；游标用 `alignedChunks(cleanText, chunks, words, duration)`（`:110`）在拼回串上重新分配 |
| `:149` | edge-tts 新版默认可能给 `SentenceBoundary`，旧脚本只收 `WordBoundary` → 静默留下空列表并**退化成按字数估字幕**；缓存命中时也要查词边界非空，没有就停止而不是误报精准同步 | ✅ | 两处都拦住了：`src/providers/tts/edge.mjs:11` 缓存命中分支要求 `words.length` 才复用（不满足就落到重合成），出结果后 `:24` `if(!words.length) throw new Error("provider returned no word timings")`；`tts_build.mjs:108` 再判一次 `no real word timing for sentence N`。**「按字数估」这条路在本仓库不存在**——`timing_mode` 只有一个取值 `tts-word-boundary`（`edge.mjs:4`、`native.mjs:26,37`），`asr-contract.mjs:47` 见别的值就报 `asr:must-use-tts-word-boundary` |
| `:160` | 语速不是表里那个数：kokoro `am_liam` speed 1.0 实测 ≈2.3 词/秒（缩写密集句 1.4–1.8），不是 edge-tts 的 2.96；5 分钟英文片按 700+ 词写会超到 6′17″；**第一次跑先合成全稿看 `speech=` 读数再回调篇幅** | ⚠ | 本仓库没有任何「片长目标 ↔ 字数/词数」判据。`tts_build.mjs:130` 确实把 `speech_seconds` 写进 timeline，但全仓库只有 `verify-storyboard.mjs:35` 把它当**夹具字段**用，没有门读它；`TTS_RATE`（`:90`）只透传。结论与 `narration-and-storyboard.md` §6.2 相同：**时长目标没有任何执行者** |
| `:161` | kokoro 把 CUDA / NIXL / MIG 逐字母拼读、把 v5.0 读成 "v five zero"；`[词](/音标/)` 覆写有效，已做成 `tts_build.py` 的 `PRONOUNCE` 表（只改送 TTS 的文本，字幕不变） | ⊘ | 本仓库只有 `edge` 与 `native` 两个 provider（`src/providers/tts/`），没有音标覆写层，也没有「送 TTS 的文本 ≠ 上字幕的文本」这条分流。做英文片时这是实打实的功能缺失，不是纪律缺失 |

---

## 9. 多 agent 协作与工程习惯

这一层本文一律只给指针：**`agent-protocol.md`** 是真源。它的一句话结论是「在本仓库里，agent 的输出没有任何下游消费者，所有阻断都来自确定性测量层」，所以上游这一整批教训在本仓库变成另一件事。

| 上游 | 事故一句话 | 状态 | 说明 |
|---|---|---|---|
| `:36-39`、`:80-84`、`:140-145`、`:192-196` | 一个 agent 只派一件重活；pane 上限是全机共享的（第 8 个 / 第 5 个就 `fork failed`）；QC 必须「边查边 append」；不要照抄 agent 自评；先看磁盘再决定重派还是唤醒 | ⊘ | 本仓库没有派发循环，也就没有这些事故。`scripts/build-groups.mjs:39-47` 只把分组写成 JSON 产物，`agent-protocol.md` §6 记了 payload 里没人读的约束键 |
| `:38`、`:83` | 构建组会**自行合理偏离**（换示例文本、加中文全称、改拓扑、缩帧数），有出处就放行、裁定写进 BUILD_NOTES；本片三条最有价值的改进全部来自构建组发现**分镜表本身错了** | ⚠ 代价 | 这是不派 agent 的代价：本仓库没有任何角色能回报分镜缺陷。最接近的替代品是确定性门：`plan.mjs` 的五类 issue token（`hero-overlong` `:142`、`accent-overflow` `:418`、`icon-unregistered`、`beat-window-overflow`、`beat-after-exit` `:428`、`text-below-min` `:431`）+ `REPAIR_ACTIONS` 表（`:481-485`，`auto: true` 只有两条）。**它们抓不到「这一章讲错了」** |
| `:84`、`:145` | 主会话要自己留一手**与 QC 互补**的静态检查：帧覆盖、源码字面量与事实清单对账、闪烁白名单源码级计数——三项都不渲染，几秒跑完 | ✅ ◐ ⚠ | 见 §4 `:145` 那行。字面量对账 ✅（并已在 2026-10 从假门修成真门），帧覆盖 ◐（有 overlap 无 gap），闪烁计数 ⚠ |
| `:102-110` | 派 8 个 agent 前先用探针把共用系统跑一遍：一个 `_probe.tsx` 一帧一格渲 8 种相机状态，**当场抓到两个会让 8 个组集体做错的问题**（pitch −22° 画框全空；`personZ=520` 时推 vs 变焦只差 12% 肉眼看不出）；探针成本 10 分钟，返工成本 3 个组；产物要变成分镜表里的实测速查表 | ⚠ | 本仓库的对应机制是 still 契约，但它是**计划不是证明**：见 `agent-protocol.md` §4（每镜 ≥6 张、高光 ≥10 张、30 帧测渲契约各判到什么）。没有任何探针脚本、没有相机参数↔画面高对照表 |
| `:107-110`、`:174-176` | 跨组一致性：**协议提到的工具必须在共用层真的存在**——`softOp` 被四个组各写一份且公式不一样；本片派单前把跨组要用的东西做进 `ui.tsx`，之后零重复 | ✅ 且反过来犯了一次 | 共用层是真的：视觉常量单一真源 `src/visual/{field,style,camera}.mjs` → `npm run export-visual-contracts` → `fixtures/visual_contracts.json`，Python 测量侧**只读这份 JSON**，`npm run verify:measure` 用合成 PNG 真跑一遍（`verify:measure:quick` 在 `verify:fast` 里）。但上游那条教训的反面形态现在成立了：**存在但没人调用**（§10 表 A）。零协调成本的优点保留，代价是文档会写出一堆读不到的「真源」 |
| `:4-5` | `public/` 只放本片资产；出 still 只用 `scripts/still.sh`，改码后 `rm -rf build_dev_<tag>` 再建，别直接 `npx remotion still`（会在 `$TMPDIR` 留临时 bundle）；后台脚本一律绝对路径（shell cwd 会漂移） | 🔒 ✅ | 本仓库不用 `mktemp`/随机后缀目录——所有产物落固定名（`artifacts/preview`、`artifacts/agent-selftest`、`artifacts/spawn-selftest`、`artifacts/<pid>/qc/…`），所以「临时 bundle 残留」和「带点后缀被 Remotion 当成输出扩展名拒绝」（`:152`）这两条**形状上不存在**。「后台脚本绝对路径」这条由启动层守：`npm run verify:spawn` 专门验 spawn 别名解析（`verify-fast.mjs` 顶部注释记着历史事故：Windows 上 `npm` 是 `npm.cmd`，不开 shell 直接 ENOENT，`status=null` 被 `?? 1` 当成失败，于是一条检查都没跑、9ms 退出） |
| `:196` | `test_render.sh` 的 mktemp 模板带点被拒——**一分钟片的 lessons 写过，模板没改**；这次改了。「写进 lessons 的模板 bug 要当场改模板」 | ⚠ 无闭环 | 本仓库没有「教训 → 门」的闭环机制。§10 表 B 那三条「注释写了但代码没做」正是同一条教训的另一种形态 |
| `:39`、`:145` | QC 读亮度用 int32（int16 溢出全零）；噪声过滤要写好 | ✅ | 测量层是纯标准库 Python，且「测量层还是不是纯标准库」「判据有没有退回成脚本字面量」都在 `verify:fast` 的秒级检查里（`verify-fast.mjs` 的 `verify:measure:quick` 注释）；`test_measurement.py:23` 把描述符名字收敛到一处（「别在测试里再抄一遍」） |

---

## 10. 本仓库独有的三类破口

### A. 死掉的修法：共用层有，渲染层不调

「零调用者」的判法：`grep -rln <名字> src scripts` 的结果里**只有定义所在的那个文件**。

| 死掉的修法 | 位置 | 上游哪条教训要它 | 后果 |
|---|---|---|---|
| `firstOp`（首帧 ≈57%，起点 0.57） | `easing.mjs:161` | `:51` 首帧 25% 仍低于可见下限 | `easing.mjs:151-159` 那段注释一边写「需要可见首帧时用 `firstOp`」一边没人用它；主角实际用 `softOp`（25%，`SemanticShots.jsx:239`）——**文档给的修法与代码走的路是两条**，而判据数字（`field.mjs` 的亮度下限）只认得到前者 |
| `textDyFor(lang)` | `style.mjs:143` | `:163` 英文片基线补偿不该是 −2 | 出英文片时基线仍按 CJK 预扣，且没有东西读 `language` |
| `squeezeFor(lang)` | `style.mjs:142` | `:162`（拉丁压窄会变形，一律 1） | `CText` 的 `scaleX` 由各调用点写死（`EndingCredit` 传 0.85，`:608`），没有语言判据 |
| `exitFade`（线性） | `easing.mjs:163` | `:9` 线性淡出末帧还剩 40–57% | 现在没人用所以没中招；它是 `exitDrop`（`:165-168`）旁边的一个陷阱选项 |
| `exitRise` | `easing.mjs:170-172` | — | 章节卡/片尾的上抬离场没有走它，另算 |
| `softIn` | `easing.mjs:150` | — | 与 `softOp` 同族但线性、起点 0；`SoftIn` 这个名字在文档里到处出现，代码里两个函数只有一个被用 |
| `typedCount` | `easing.mjs:176` | — | 打字机动效无渲染层调用点 |
| `mixHex` | `style.mjs:113-122` | `:25` 混色函数解析 `rgb()` 出 NaN | 只吃 hex + 注释警告；上游要求的「能解析 rgb()」或「返回 #hex 的版本」都没做 |
| `BEAT.LATERAL`（Δ260–320） | `easing.mjs:130` | `:10` 侧向滑入 | 位移常量没人读，入场位移实际由 `slideIn` 决定 |
| `BEAT.STILL_MAX_FRAMES = 90` | `easing.mjs:141` | `:170` 静止判据 | **两个真源里没被读的那个**：真判据是 `field.mjs:172` 的 `still_max_seconds = 3.0` ×fps |
| `FONT_SERIF` | `style.mjs:131` | — | 未装载 + 零引用（`style-guide.md` §6 已记），公式画不出来 |

为什么值得单列：这一批名字让**文档看起来比代码能做的事更多**。`agent-protocol.md` 里那条「payload 里的约束哪几条有执行者、哪几条只是礼节」是同一种病，只是发生在 agent 层而不是渲染层。

### B. 注释即执行者

写法是「⚠ …」的注释，**没有任何门，而且代码自己就没做到**：

| 注释 | 位置 | 代码实际 |
|---|---|---|
| 「⚠ `endingFade` 会吃掉末拍动作，留 ≥30 帧」 | `Primitives.jsx:599` | `Root.jsx:80` 给的是 `lastSceneFrame + 12` |
| 「σ<0.8 在 Chromium 中无效」 | `Fx.jsx:384` | `:399` `stdDeviation` 只 `Math.max(0, b)`，没有 0.8 下限 |
| 「单帧 SVG filter ≤6 个；禁用 `feConvolveMatrix`；一律 `colorInterpolationFilters="sRGB"`」 | `Primitives.jsx:269` | 现役 filter 确实都带 sRGB（`Fx.jsx:398`、`Glitch.jsx:26, 29`），但数量与关键词都没有门——加第 7 个 filter 不会让任何东西变红 |
| 「事实出处门禁要按出现的每个中间值登记」 | `Fx.jsx:257` | `verify-text-provenance.mjs:108-136` 只收 `buildPlan` 的静态产出，运行时逐帧生成的计数中间值不在里面 |
| 「⚠ 字幕带与进度条带（y637–720）永不放画面内容；入场轨迹不得穿过字幕带」 | `Primitives.jsx:500` | 前半有静态判据（`verify-render-layer.mjs:169` 判 authored `y`），后半（轨迹）没有 |

### C. 半个修法：同一条裁定只落了一段

目前两例，都在覆盖层：

1. `ProgressBar` 当前章：宽度切在 `from − 3`（`Primitives.jsx:464`），**颜色切在 `from`**（`:477`）→ 上游 `:73`/`:188` 那条「卡片期间进度条还高亮着上一章」原样成立。
2. `EndingCredit` 的入场：`fadeIn(N - from, 18)`（`:603`）首帧为 0，而它前面的 `if (N < from) return null`（`:602`）说明作者知道首帧问题——**知道、挡住了 null、却仍然用线性淡入把这一帧做成了全黑**。

### D. 三条建议动作（本文只写，不动代码，除非另行确认）

1. `Primitives.jsx:477` 条件改 `N >= begin`，并在 `verify-render-layer.mjs` 给一条正负夹具（卡片期间条色必须已切章）。
2. `Primitives.jsx:603` 换 `softOp`/`firstOp`（顺手让 §10 表 A 的 `firstOp` 有第一个调用者）。
3. 数字主角的计数中间值：要么并进 A2 数字对账，要么把 `SemanticShots.jsx:242, 365` 的 `countTo` 关掉直给终值——**这条改完 `Fx.jsx:257` 那句注释才不是谎话**。

---

## 11. 上游有、本仓库结构上不可能犯的那一类

列出来是为了别把它们当「还没补的洞」——它们不是洞，是没有那个结构：

- 分片 import / 跨组复用 / 「G7 要跨组 import G6 的矩阵」（`:108`）——渲染层只有一个真源链（`src/visual/*` → `fixtures/visual_contracts.json`），不存在「各存一份逐参数复制」。
- 「8 个构建组 BUILD_NOTES 零处提到 shots_src，光效图元留在样片组内文件里没进模板」（`:88`）——本仓库没有 BUILD_NOTES 这个环节（顺带：`BUILD_NOTES` 在 reel-forge 也**零读者**，见 `agent-protocol.md`）。
- 「构建组自行合理偏离 / 换示例文本 / 改拓扑」（`:38`）——`verify-authored-shots.mjs` 会把 authored 的图标、坐标、时长、camera 名逐条判，偏离直接红。
- 「同一元素渲染两份（一份常亮 + 一份 GlitchIn）把闪烁完全遮住」（`:53`）——画面元素由 `buildPlan` 的 `items` 唯一决定，`SemanticShots.jsx` 按 slot 画一遍。
- 「`softOp` 四份公式不一样、G1/G2 靠调用处传 `n+1` 补偿」（`:110`）——只有 `easing.mjs:160-161` 一份。
- 「模板 bug 写进 lessons 却没改模板，两片重复踩」（`:196`）——本仓库没有独立的模板副本；这条**部分**成立（同一份代码，改就全改），部分不成立（§10 表 B 的「注释写了没做」正是它的替身形态）。
- 双联版式左右必须真的是同一台相机（`:130-132`）、房间几何按最极端运镜设计（`:135-138`）、`roomAnchors()` 与 `SCENE` 从没对齐（`:131`）——本仓库没有场景几何这一层，`CameraRig` 只做整幅缩放/平移/视差。⚠ 所以这类事故不会发生，但**「画面证不成立」这件事也没有任何判据**（§6 `:97-100` 那行）。

---

## 可核对规则

1. 上游教训的规模与分片是 125 条 / 5 部片（26+33+32+5+29），行号见 §0；本文不复制其文本，只给对照。
2. 离场停留是算出来的不是约定的：`exitPlan`（`src/shots/plan.mjs:35-40`）+ `BEAT.EXIT_HOLD_MIN/MAX`（`src/visual/easing.mjs:139-140`）；入场晚于 `exitAt` 记 `beat-after-exit`（`plan.mjs:428`）。
3. 离场淡出用幂不用线性：`exitDrop` 的 α = `1 − (n/len)^1.6`（`easing.mjs:164-168`）；线性的 `exitFade`（`:163`）零调用者。
4. kf 首值陷阱在引擎层就是设计约束：`easing.mjs:74` 注释 + `:101` 行为；关键帧一律以 1-based 镜头首帧为起点。
5. 首帧不空这条只有半个体系：`softOp(…, 0.25)` 有调用者，`firstOp(…, 0.57)`（`easing.mjs:161`）**没有**；片尾 `Primitives.jsx:603` 仍用线性 `fadeIn`，`N === from` 那一帧全黑。
6. 静止判据只有一个真源数字且被门跑：`field.mjs:170, 172` → `export-visual-contracts.mjs`（`:93` 还断言 `hold_thr > still_thr`）→ `fixtures/visual_contracts.json` → `motion_check.py:197-227`；`BEAT.STILL_MAX_FRAMES`（`easing.mjs:141`）是没被读的那份。
7. 「静止 ≤40%」本仓库不判（`motion_check.py:270` 明写只报不判）；「最长静止」放宽到 3 s。
8. 计数中间值不进出处门：`countTo`（`Fx.jsx:253`）用在 `SemanticShots.jsx:242, 365`，而门的 A2 只收 `buildPlan` 静态产出（`scripts/verify-text-provenance.mjs:108-136`）。
9. 源码字面量对账是本文里唯一「上游查法 + 本仓库有牙齿 + 做过变异」三样齐全的条目：`verify-text-provenance.mjs` B 段（`:159-163, 203-220, 241-243`）；弱点与变异结果在 `research-brief.md` §4。
10. 数字用 Orbitron 现在是真有 pin 的：`Fx.jsx:4` import `FONT_ORB`、`:258` `family = FONT_ORB`、`verify-render-layer.mjs:196-208`（删默认值 / 摘 import / 改签名三种变异各自变红，夹具文件恢复后字节不变）。
11. 字形覆盖无门：`verify-imports.mjs:186, 188` 只判 `FONTS` 非空与 `public/<file>` 存在；`¥/≠/≈` 与孤立 `0` 的裁定（上游 `:62`、`:63`）零执行者。回退链 `Orbitron → Audiowide` 在 `style.mjs:129`。
12. 语言开关是死代码：`textDyFor`、`squeezeFor`（`style.mjs:142-143`）零调用者，出英文片时基线补偿仍 −2。
13. 整层 `scale` 只有一个调用点且不缩（`SemanticShots.jsx:252` + `emphasisPulse` 区间 `1→1.11→1`，`easing.mjs:63-69`）；「scale 会把字号带下下限」这条通则无执行者。
14. draw-on 的 `p=0` 形状写不出来：`Primitives.jsx:317, 324`（及 `:287, 310` 的 `<= 0.001` 早退）。
15. filter 的三条性能红线只有 sRGB 落地：`Fx.jsx:398`、`Glitch.jsx:26, 29` 带 `colorInterpolationFilters="sRGB"`；`σ ≥ 0.8` 与「单帧 ≤6 个」无判据（`Fx.jsx:399` 仅 `Math.max(0, ·)`）。
16. 覆盖层层序由装配层唯一入口决定：`Root.jsx:64-80`（`Backdrop → scenes → Hud → ProgressBar → ChapterCard → Subtitle → EndingCredit`），片尾黑底在内容之后。
17. HUD 空档是正负都有夹具的：`timeline.mjs:73-85, 98-120` + `verify-timeline.mjs:60, 62`；章节边界按句子的 `chapter` 聚合，不猜间隔（`timeline.mjs:36-39`）。
18. 进度条当前章高亮仍切在首句帧（`Primitives.jsx:477` 的 `N >= from`，`from` = 本章首句首帧，见 `timeline.mjs:27`），卡片窗口是 `prevTo+3 … curFrom−9`（`:145-147`）——上游 `:73`/`:188` 那条矛盾在这里原样存在；`§10-D-1` 给了最小改法。
19. 片尾与内容无联动：`Root.jsx:80` 给 `+12` 帧（注释要求 ≥30，`Primitives.jsx:599`），`Hud`/`ProgressBar` 在署名期间仍渲染（`Root.jsx:76-77`）。
20. 词边界是硬要求不是选项：`word-boundary.mjs:15` throw、`:34` `maxDriftFrames = 2`、`:46, 53`；`edge.mjs` 空词边界 throw、缓存路径要求非空；`asr-contract.mjs:44-47` 只认 `tts-word-boundary`。英文 `|` 补空格在 `tts_build.mjs:102`。
21. 时长目标零执行者：`speech_seconds` 由 `tts_build.mjs:130` 写出，但只有 `verify-storyboard.mjs:35` 当夹具字段读；音标覆写（上游 `:161`）在本仓库不存在。
22. 帧覆盖只有 overlap 没有 gap：`verify-scene-contract.mjs:31-34`（且只在 `verify.yml:66`，不在 `verify:fast` / 一键链）、`verify-e2e.mjs:41`；`render-ir.mjs:1` 的 `duration = max(start+duration)` 会把空洞变成尾部时长。
23. 多 agent 类教训一律是「不适用 + 代价」：本仓库没有派发循环，`build-groups.mjs:39-47` 只写分组 JSON；agent 输出零下游消费者的完整论述在 `agent-protocol.md`，不在此重述。

---

## 验证缺口（本文所有画面结论的边界）

- `.jsx` / 渲染层**从未执行过**（既定约束：先不执行，只写实现）。§2–§7 里凡是「要渲出来才知道」的判据（空场、首帧亮度、柔光面积、静止段、字距出画）都只有静态一侧被验证；`§10` 表 A 的「零调用者」是纯静态 grep 结果，可信。
- `verify:qc` / `verify:delivery` / `verify:production` / `verify:e2e` 目前因缺产物而失败；timeline / voice-manifest / word-timing / delivery / research 契约打印 `skip`（等联网 TTS 与完整 production run）。
- `verify:research`、`verify:narrative` 不在 `verify:fast` 与一键链里；`verify:scene-contract` 不在本地 fast 链里。✅ `verify:authored-shots` 现在两处都在（`scripts/verify-fast.mjs:47` 与一键链 `scripts/skill.mjs:104`，渲染之前），`.github/workflows/verify-fast.yml` 里那条单列步骤随之删除。
- `verify:still-benchmark` 不在 fast 里，它读 `artifacts/<pid>/qc/still-manifest.json` —— 那是 `npm run still-benchmark` 的运行产物、不入库，所以全新 clone 上它会以「manifest missing」失败，而不是以「画面不合格」失败。
- **高光 still 分支在参考片上是空转的**：44 个 authored 镜头没有一个声明 `SHOT_RECIPE.highlight === true`，所以「高光 ≥10 张」这条要求目前只由 `verify-limits.mjs` E 段（临时假镜头文件）与一次性变异 M18/M19 证明；把它变成真要求的动作（给某些镜头标 `highlight`）没有门会替你决定。已知局限：`highlight: true` 写在注释里也算高光。
- 本轮新增的 `verify-render-layer.mjs:196-208` 字体角色 pin 做过三种变异（各自变红）；工作区已恢复字节一致。它**不能**证明画面上真的是 Orbitron——那需要真渲 + 字体装载成功（`Design.jsx:54` 装载失败不阻断）。
