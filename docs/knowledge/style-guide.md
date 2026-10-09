# 风格指南（调色板、字号阶梯、字体角色、画面文案准入）

这份文件只管四件事：**颜色常量到底被谁用、字号阶梯与它的下限由谁守、字体装了哪几个、什么样的文案进不了画面**。每条规则后面跟着它的执行者——某个常量、某段代码路径或某个门禁；没有执行者的明确标「⚠ 无执行者」，不要把它当约束引用。

分工（一条规则只有一个真源，其余只链接）：

| 主题 | 真源文档 |
|---|---|
| 设计空间与 band、`layoutBands` 两条带、`composition.focus`、变体槽位几何、主角/配角尺寸、光模型、QC 测量判据与取景区、竖屏现状 | `composition-and-light.md` |
| 帧号口径、帧数预算、缓动曲线、节拍窗口、运镜词表、效果开关与配额、修复路由、死表清单、确定性随机 | `motion-vocabulary.md` |
| **调色板与色值、字号阶梯、字幕字号、字体装载、画面文案禁令（"什么样的字不许上画面"）** | **本文** |
| 生产顺序、人工确认点 | `SKILL.md` |
| 调研产物是什么、claims 的性质、**画面文字出处门 A1/A2/B/C 的语义与破口（"上画面的字要从哪儿查到"）**——本文 §8 只留禁令那一面 | `research-brief.md` |
| 解说词语法、分镜表格式、`selfcheck` 判据 | `narration-and-storyboard.md` |
| Agent 收到什么、哪些约束没人执行 | `agent-protocol.md` |
| 上游五部片里打在**字体与排版**上的返工逐条归属（Orbitron 缺 `¥ ≠ ≈`、孤立单字 `0` 被读成 `Ø`、`Counter` 默认字族、transform 缩放把字号带下 22 下限、全宽弯引号），含本文 §6 字体角色那条默认值的 pin 的来由 | `lessons.md` §5 |

> 本文不重复上面的空间/时间规则。需要那些数时按 §1 的指针去取，别在这里找。

---

## 1. 本文不管的部分（只给指针）

| 想查什么 | 去哪 |
|---|---|
| `design()` 系数、`logicalH`、每个 band 谁读谁没读 | `composition-and-light.md` §1 |
| 内容框高度、主角带/机理带、9:16 的实际后果 | `composition-and-light.md` §2、§9 |
| 主角可用宽 1160 / 696、`heroPos` 的 x640 / x408 / x872、轨道右界 | `composition-and-light.md` §3 |
| 11 个 variant 各自的槽位几何与那道反解 case 集合的门 | `composition-and-light.md` §4 |
| `heroSizeOf` 公式、`hero_scale`、配角 `kindOf` / 图标 / `active` | `composition-and-light.md` §5、§6 |
| 光只有哪三档、全片唯一的 glow 调用点、`key_intensity` | `composition-and-light.md` §7（本文只管**色值本身**，见 §2.3–§2.4） |
| QC 怎么量这块画面、×k / ×k² 换算、令牌 severity | `composition-and-light.md` §8 |
| 效果预算（扫光 ≤2 / glitch / pulse / halo）落在哪一层 | `motion-vocabulary.md` §7 |

---

## 2. 调色板：常量、语义、以及引擎到底用没用

常量声明在 `src/visual/style.mjs:30-46`，`PALETTE` 聚合对象在 `:65-87`。

### 2.1 紫色系

| 常量 | 值 | 声明语义 | 渲染层实际用途 | 是否被读 |
|---|---|---|---|---|
| `PURPLE` | `#6630F8` | 当前重点 / 主角描边 | active 图元边框 `rect stroke`（`src/shots/SemanticShots.jsx:302`）、active 列表底线（:305）、`Box` 的 active 边框（:372）、舞台线渐变的色标（`src/remotion/Fx.jsx:182`）、`BigNumber` 硬投影 `6px 6px 0`（:258） | ✅ |
| `PURPLE_LIGHT` | `#A175F1` | 高光端 / active 卡边 | 配角文字色（`SemanticShots.jsx:363`）、hub 连线（:307）、链条箭头（:311, 337）、扇形连线（:316）、`Check` 勾（:318）、hub 圆环（:326）、轨道游标圆点（:353）、`TechText` 默认色（`Primitives.jsx:125`）、`LightBar` 默认色（`Fx.jsx:32`）、`StageLine` 渐变（:114）、光环虚线波纹（:205）、章节卡 `CH 01` 序号（`Primitives.jsx:565`） | ✅ |
| `PURPLE_TECH` | `#6530F4` | Exo 2 英文技术词 | 无 | ❌ 死常量。`TechText` 实际用 `PURPLE_LIGHT`（`Primitives.jsx:125`） |
| `PURPLE_DEEP` | `#5A3AD5` | 曲线 / 标题硬投影 | 无 | ❌ 死常量。硬投影写的是 `rgba(102,45,248,…)` 字面量（`Fx.jsx:258`、`SemanticShots.jsx:244`、`Primitives.jsx:568, 588`） |
| `PURPLE_PALE` | `#E6DCFF` | — | 只被 `Primitives.jsx:16, 43-44` 原样 import / 再导出，无样式消费点 | ❌ |

### 2.2 其余颜色

| 常量 | 值 | 声明语义 | 渲染层实际用途 | 是否被读 |
|---|---|---|---|---|
| `WHITE` | `#FFFFFF` | 结构线与正文 | 主角大字（`SemanticShots.jsx:244`）、非 active 配角文字（:363）、描边与箭头、`StageLine` 白闪（`Fx.jsx:114`）、`GlowBlob` 外的白描边 | ✅ |
| `GREY` | `#A0A0A1` | 不活跃项 / 副标 / 说明 | `Cross` 叉号色（`SemanticShots.jsx:319`）、进度条未到达章名（`Primitives.jsx:477`）、`TechSub` 副标（:140）、章节卡 tagline（:593）、`BigNumber` 单位小字（`Fx.jsx:258` 的 `unitColor` 是**同值字面量** `'#A0A0A1'`，不读这个常量） | ✅ |
| `GREY_MID` | `#747474` | 灰块 | 非 active hub/扇形连线（`SemanticShots.jsx:307, 316`） | ✅ |
| `GREY_LINE` | `#4A4A4A` | 网格线 | 非 active 边框（:302, 372）、轨道虚线（:350）、`TiltPlane` 描边（:330） | ✅ |
| `GREY_LIGHT` | `#D4D4D4` | 文本线条 | 无（只进 `PALETTE` 对象） | ❌ |
| `ORANGE` / `CORAL` | `#F05F41` / `#F16043` | 指标 / 警示 | 无。大数字主角与指标一律是**白色 + 紫硬投影**（`Fx.jsx:258`） | ❌ |
| `RED_DEEP` | `#EC081F` | 深红警示块 | 无 | ❌ |
| `GREEN` | `#8FF740` | 通过 / 正确 | 无。`Check` 勾的实际颜色是 `PURPLE_LIGHT` 或 `WHITE`（`SemanticShots.jsx:318`） | ❌ |
| `MAGENTA` / `CYAN` | `#D100D6` / `#58FFEE` | 「仅 glitch 副本」 | 无。glitch 的品红/青错位由 SVG **`feColorMatrix` 矩阵**做（`TintDefs`，`src/remotion/Glitch.jsx:23-34`），不读这两个常量；唯一的容器 `GLITCH_TINT`（`Glitch.jsx:112`）本身零引用 | ❌ 连「只进 GLITCH_TINT」都不成立：那份映射也没人读 |
| `BLACK` | `#000000` | 填充 | 幕底 `AbsoluteFill` 背景写的是字面量 `'#000'`（`src/remotion/Root.jsx:58`） | ⚠ 语义成立，但不是经该常量接线 |
| `PALETTE` 对象 | — | 「兼容旧代码」 | 无任何调用者 | ❌ |

**结论给作者**：能请求的颜色只有 **紫（`PURPLE` / `PURPLE_LIGHT`）、白、三档灰（`#A0A0A1`/`#747474`/`#4A4A4A`）**。橙红、深红、绿、`PURPLE_TECH`、`PURPLE_DEEP`、`PURPLE_PALE`、`GREY_LIGHT` 是**文档色**——写进分镜不会有任何代码去用它。glitch 的品红/青只在 `rgbSplit > 0` 时出现，而语义引擎的 `FocusIn` 不传 `rgbSplit`/`slices`（`SemanticShots.jsx:253`），默认 0 → 镜头画面里不会出现品红/青；唯一传 `rgbSplit={4}` 的是 `TitleCard`（`Primitives.jsx:585`），而它未被 `Root.jsx:3` 装配。

### 2.3 紫光的色相和 `PURPLE` 不是一个颜色

所有 glow 由 `field.mjs` 的结构化 spec 经 `glowCss()` 生成（`src/visual/style.mjs:88-106`），spec 里的颜色是 `rgba(102, 45, 248)` = `#662DF8`（`src/visual/field.mjs:60`），而 `PURPLE = #6630F8` = `(102, 48, 248)`。**绿通道差 3**。`src/visual/field.mjs:54-57` 明确写了这是样片实测值原样搬过来、在不能渲染比对的前提下刻意不改，导出脚本把两个值都写进 contracts，留待真机渲染时二选一统一。

作者要知道的后果：紫色描边（`#6630F8`）和它周围的光晕（`#662DF8`）色相微偏，画面是两种紫。这不是缺陷，是已知并保留的现状。

### 2.4 组件里手写的色值（与「唯一真源」相冲的地方）

`src/visual/style.mjs:4` 自称「不允许在组件里另写一套色值」。实际存在这些内联字面量，改常量不会传导到它们：

| 位置 | 写死的串 | 对应常量 |
|---|---|---|
| `Primitives.jsx:180`（`Box` 的 `glow` 属性） | `0 0 12px 3px rgba(102,45,248,.35), 0 0 42px 14px rgba(102,45,248,.45)` | `GLOW_PURPLE` |
| `Primitives.jsx:278`（`Svg` 的 `bloom`） | `drop-shadow(0 0 3px rgba(255,255,255,.5))` | `BLOOM` |
| `SemanticShots.jsx:244`（主角大字 `shadow`） | `0 0 34px rgba(102,45,248,.45)` | 无对应常量（`GLOW_PURPLE` 的 blur/spread 都不同） |
| `Fx.jsx:258`（`BigNumber` 默认 `shadow`） | `6px 6px 0 ${PURPLE}, 0 0 28px rgba(102,45,248,.45)` | 半字面量：`PURPLE` 走常量，光晕走字面量 |
| `SemanticShots.jsx:373`（代码块标签族串） | `'SF Mono', Menlo, Consolas, monospace` | `FONT_MONO`（`style.mjs:130`，同值重写） |
| `Primitives.jsx:491`、`:568`、`:588` | `rgba(102,45,248,…)` 进度条白线紫外阴影 / 章节卡 / 片名硬投影 | 无对应常量 |
| `Fx.jsx:299` | `drop-shadow(0 0 2px rgba(255,255,255,.35))` | 与 `BLOOM` 同族但更轻，无常量 |

> ⚠ 无门禁：没有任何门比对「组件里的字面量」与「常量」。`verify-visual-contracts.mjs:86-97` 冻的是 `glowCss()` 的输出字符串，不是这些内联副本。

---

## 3. 设计空间与画布带 → 见 `composition-and-light.md` §1

一句话结论（细节、每个 band 的读取状态、`cameraSafe` 为什么不能用，都在那篇）：全部画面层写在「1280 宽 × `logicalH` 高」的逻辑画布里（16:9 系数 1 / 高 720；9:16 系数 0.5625 / 高 2276），内容区恒从 `contentTop = 175` 起、下界 `logicalH − 100`，字幕带与进度条带是禁放区。

与**本文**有关的两条色值/字号事实：

1. `src/visual/style.mjs:203-210` 的 `SAFE` / `safeArea()` 是旧签名兼容层，**全仓库零调用**（`src/`、`scripts/` 全量检索无引用）。别用它算任何边距。
2. 字幕的字号/描边/最大宽常量（`SUBTITLE_SIZE = 44`、`SUBTITLE_STROKE = 4`、`SUBTITLE_MAX_W = 1160`，`style.mjs:154-156`）是**真读的**——`Primitives.jsx:18-20` import、`:502/:508/:514-515/:527` 消费；进度条带与字幕带的坐标则是 `style.mjs:190-193` 的 band。

---

## 4. 主角带 / 机理带 → 见 `composition-and-light.md` §2–§4

`layoutBands`（`src/shots/SemanticShots.jsx:35-49`）把内容框**垂直居中**、高度 `designH = round(min(avail, max(445, logicalH × 0.35)))`，上 42% 给主角带、其余留 12px 间隙给机理带。竖屏的代价（9:16 只在中间 797 逻辑像素里画画）见 `composition-and-light.md` §9，**不是可以靠 `hero_size` 弥补的参数**。

---

## 5. 字号阶梯

| 档位 | 值 | 用在哪 | 下限被谁守 |
|---|---|---|---|
| `TEXT_MIN` | 22px（`style.mjs:151`） | 画面任何文字的实际显示值 | ⚠ 半守：`plan.mjs:431` 只在**分镜显式写了 `size`** 时报 `text-below-min`；渲染层自身字号来自常量与 `fitSize`，无全局 22px 断言。测量层量的是**主体尺度**，不量字号 |
| `BIG_TEXT_MIN` | 96px（`style.mjs:149`） | 大字型主角**字号**下限，与 `HERO_MIN` 二选一即达标 | `plan.mjs:134` 把它作为 `floor` 传进 `fitSize`；`verify-render-layer.mjs:157` 断言 `hero.size >= 96` 否则必须已有 issue |
| `HERO_MIN` | 170px（`style.mjs:146`） | 主角高度下限 | `heroSizeOf` 夹紧（`plan.mjs:159-164`）+ `verify-authored-shots.mjs:131` 逐镜头判 `hero_size >= 170` |
| 主角字号 | 由 `hero_size` 推 | 文字主角直接用 `hero.size`（`SemanticShots.jsx:244`）；数字主角用 `max(110, round(hero.size × 0.66))`（:242） | 同上 |
| 配角文字 | 有图标 26px / 无图标 30px | `SemanticShots.jsx:380` | 无独立门禁 |
| 配角数字 | `min(96, max(54, slot.h × 0.72))` | `SemanticShots.jsx:365` | 无 |
| 代码块标签 | 24px | `SemanticShots.jsx:373` | 无 |
| 大数字单位 | 24px（`unitSize` 默认）、色 `#A0A0A1` | `Fx.jsx:258` 声明、`:263` 渲染 | 无 |
| HUD 胶囊主字 | 33px / 700 | `Primitives.jsx:215` 默认、`:233` 落地 | 无 |
| HUD 英文副标 | 22px（`hud` 模式强制） | `Primitives.jsx:140`（`hud ? 22 : size`），由 `:239` 传入 | 靠与 `TEXT_MIN` 同值的巧合，不是断言 |
| 字幕 | 44px / 700，描边 4px，最大宽 1160 | `style.mjs:154-156` + `Primitives.jsx:502-533` | `fitSize` 兜底到 **34px**（`Primitives.jsx:508` 的 `minSize` 实参），装不下折两行（:533）；两行仍超宽**不报错** |
| 进度条章名 | 24px / 800，`skewX(-10°)` | `Primitives.jsx:451` 默认、`:476` fitSize | `fitSize(…, slot − 20, …, ×0.7)` |
| 章节卡标题 | 96px，超宽降 82；`clamp(…, 44, 96)` | `Primitives.jsx:562` 判宽、`:568` 落地 | 同上 |
| 章节序号 | Orbitron 30px 紫，字距 10 | `Primitives.jsx:565` | 无 |
| 片名 | Audiowide 118px + `6px 6px 0 rgba(102,45,248,.9)` | `Primitives.jsx:588` | ❌ `TitleCard`（:576）未接入 `Root.jsx:3`，实际不出现在成片 |
| `LABEL_SIZE [26,34]` / `TITLE_SIZE [44,96]` | `style.mjs:152-153` | — | ❌ 死常量，零引用 |

### 5.1 `fitSize` 是兜底，不是预算

`fitSize(s, maxW, size, minSize = size × 0.78, …)`（`src/visual/textfit.mjs:53`）超宽就等比缩字号，**最低 78%**；同文件 `:51` 明写「缩到 minSize 仍超宽 → 文案违反长度预算，改文案，不要指望这里」。

宽度按 em 估算而非测 DOM，所以渲染是确定的：汉字 1.000em、大写 .668、小写 .566、数字 .590、空格 .227、半角标点 .325（`textfit.mjs:23`），Audiowide ×1.18、Orbitron ×1.20、Exo 2 ×0.92（`textfit.mjs:17-20`）。`letterSpacing` 是固定 px、不随字号缩，必须传进 `textW`/`fitSize`（`textfit.mjs:45`）。

> ⚠ 无执行者：`SUBTITLE_BUDGET = {zh: 16, en: 48}`（`textfit.mjs:65`）、`overflows()`（`:61`）、`wrapText()`（`:72`）**全仓库零调用**（逐符号检索，命中只有它们自己的定义行）。「每块中文 ≤16 字 / 英文 ≤48 字符」这条 `textfit.mjs` 头注释自称的「真正的约束」没有任何代码执行；字幕自己折行走的是 `Primitives.jsx:535` 的私有 `wrapTwoLines`。**写解说词时这是硬要求，但只能靠自觉。**

### 5.2 压窄与基线补偿

中文标题要 `scaleX 0.85` 压窄；CJK 行盒墨迹比 top 低 3–7px，所以 `dy = -2` 预扣。执行点：`CText` 默认 `dy = -2`（`Primitives.jsx:52`）、主角压窄在 `heroPos` 里按文本实判 `isCJK ? 0.85 : 1`（`SemanticShots.jsx:87`）、章节卡与片尾写死 `scaleX 0.85`（`Primitives.jsx:568`、`:607`）。

> ⚠ 死常量：`squeezeFor(lang)` / `textDyFor(lang)`（`style.mjs:142-143`）**零调用者**。`style.mjs:141` 附近声称的「语言开关影响压窄系数、基线补偿、字幕与章名预算」没有开关，英文片不会自动生效——英文标题只因 `isCJK` 判成非 CJK 才侥幸不被压窄。

---

## 6. 字体角色

| 角色 | 族常量 | 实际装载 | 说明 |
|---|---|---|---|
| 全部中文（标题 900 / 标签 600–800 / 字幕 700） | `FONT_HEAVY` Noto Sans SC（`style.mjs:126`） | ✅ `fonts/NotoSansSC.ttf` | 主角大字 weight 900（`SemanticShots.jsx:244`） |
| 英文技术词（紫粗斜体） | `FONT_TECH` Exo 2（:127） | ✅ `Exo2-Italic.ttf`，style italic | `TechText` 默认 30px、`scaleX 0.8`（`Primitives.jsx:125`） |
| 宽体展示字（片名 / 大写缩写） | `FONT_WIDE` Audiowide（:128） | ✅ | 仅 `TitleCard`（未装配）与骨架标签 `BEFORE/AFTER` 文案 |
| 数字 / 章序号 / 计数 | `FONT_ORB` Orbitron（:129） | ✅ `Orbitron[wght].ttf` 见 `FONTS`（:134） | `BigNumber` 用它（`Fx.jsx:258` 的 `family = FONT_ORB` 默认值），宽度按 `EM_ORB = 1.2` 换算（`textfit.mjs:19`，`emFor` 按字体串取系数）。**这条默认值有 pin**：`verify-render-layer.mjs:196-208`（删默认值 / 摘 import / 改签名三种变异各自变红）。上游 `lessons.md:64` 中过一次同样的雷（`Counter` 默认 `FONT_HEAVY`，四个组各自绕开自建一份） |
| 代码 / 等宽 | `FONT_MONO`（:130） | ❌ **未装载** | 且 `SemanticShots.jsx:373` 又内联重写了一遍同一条 CSS 族串 |
| 公式 | `FONT_SERIF`（:131） | ❌ 未装载，零引用 | 引擎画不了公式 |
| 通用西文 | `FONT_EN`（:132） | ❌ 未装载 | 仅片尾署名用（`Primitives.jsx:609`），会掉到系统字体 |

`FONTS` 只注册 4 个族（`style.mjs:134`），由 `Fonts` 组件 `delayRender` 装载（`src/remotion/Design.jsx:35-59`）。字体缺失时 headless Chromium 静默回退，所以装载失败会显式打 `[reel-forge] 字体装载失败，画面将回退到系统字体（质量不达标）` 而**继续渲染**（`Design.jsx:54`）——回退不阻断渲染，pilot-preview 阶段必须肉眼确认。

---

## 7. 光：常量清单归 §2.4 与下面这张表，模型归 `composition-and-light.md` §7

| 常量 | CSS | 谁读它 |
|---|---|---|
| `GLOW_PURPLE`（`style.mjs:101`） | `0 0 12px 3px rgba(102,45,248,.35), 0 0 42px 14px rgba(102,45,248,.45)` | ✅ `HeroGlow` 的默认 box-shadow（`Fx.jsx:226`），唯一调用者是主角层（`SemanticShots.jsx:251`） |
| `GLOW_PURPLE_S`（:102） | 8px/24px 轻一档 | ❌ 零引用。「当前重点那枚配角给小紫光」在本引擎不成立：active 配角只换**描边色与文字色** |
| `GLOW_ORANGE` / `GLOW_RED`（:103-104） | 橙 / 红双层 | ❌ 零引用（连橙红色值本身也没有代码用，见 §2.2） |
| `BLOOM`（:106） | `drop-shadow(0 0 3px rgba(255,255,255,.5))` | ❌ 零引用；同一串 CSS 被 `Svg` 内联重写（`Primitives.jsx:278`） |

> `GLOW_*_SPEC` 的**结构化定义**在 `src/visual/field.mjs:59-87`，`style.mjs:88-99` 只做再导出，CSS 串由 `glowCss()` 生成——这是为了让 QC 能问「半径/alpha 到底是多少」而不必正则解析 CSS。别把字符串再抄回组件里（现状已经抄了，见 §2.4）。

---

## 8. 画面文案的准入与禁令

| 禁令 | 执行者 | 违规后会发生什么 |
|---|---|---|
| **整句解说词进画面** | ① 主角位：`heroTextOf` 只接受 `textEm(v) <= 12` 的候选（`src/shots/plan.mjs:148-156`，判定在 :153）；② `pickHero` 按实测宽度挑第一条装得下的，全部装不下就 push `hero-overlong`（`plan.mjs:134-142`）；③ 配角位：`textEm(text) > 12 && kind === 'box'` 直接丢弃不画（`plan.mjs:190`） | 画面退化成长度 ≤12em 的关键词或 `narrative_job` 串，issue 里带 `overlong {max_width, floor_size, candidates, longest_chars}`（`plan.mjs:142`）。`verify-render-layer.mjs:158` 另断言主角文案**不以 `…`/`...` 结尾**——渲染层绝不省略号截断 |
| **同镜头多个 active 紫光** | `buildPlan` 顺序计数，第二个起强制 `it.active = false` 并记 `accent-overflow`（`plan.mjs:412-420`）；夹具全片断言 `actives <= 1`（`verify-render-layer.mjs:150`）；authored 的 `accent_index < support_count`（`verify-authored-shots.mjs:134-136`） | 降级为白/灰。`accent-overflow` 是两个 `auto: true` 整改项之一（真值在 `elements[].active`，Repair 直接改 IR，`plan.mjs:479-487`） |
| **随机数 / 墙上时钟进渲染层** | 两道：`verify-render-layer.mjs:211-232` 逐文件扫 `src/remotion`、`src/shots`、`src/visual`，命中 `Math.random(` 或 `new Date()`/`Date.now()` 即 FAIL；`verify-authored-shots.mjs` 对每个镜头源文件再扫一遍 | 门禁直接非零退出。画面抖动/粒子只能用确定性伪随机 `rnd(...seeds)`（`src/visual/easing.mjs:111-121`）。注意 `clock` 是**已注册图标**（`KNOWN_ICONS`），与本禁令无关，可以用 |
| **未注册图标** | `iconOf` 只认 `KNOWN_ICONS` 17 个键，其余返回 `unknown:<k>`（`plan.mjs:67`）；`buildPlan` 记 `icon-unregistered`（`plan.mjs:421`）；夹具另判 authored 图标在不在注册表（`verify-render-layer.mjs:153`） | 画面静默缺那块（`Icon` 对未知 kind 返回 null，`src/remotion/Icons.jsx:347-349`），但 issue 会出声；整改是「注册图元或改文字」（`plan.mjs:483`，`auto: false`） |
| **字幕带 / 进度条带放画面内容** | `layoutBands` 的 `contentBottom = logicalH − 100`（`SemanticShots.jsx:37`）；`verify-render-layer.mjs:169` 判 authored `y` 越出 `[contentTopNoRail−200, contentBottom+40]` | 报「越出内容区」 |
| **紫色撒在配角上（紫色碎片中位 ≤8 块）** | ✅ 有执行者（旧版文档说「无」，已过期）：判据 `PURPLE_DEBRIS`（`field.mjs:146-153`），实现 `frame_metrics.py:133-134`（规则 `b>r>g`、`sat_min`、`lum_min`）+ `:188-193`（形态学成块）+ `:332-333`（中位 ≥ `median_max` 报 `purple_debris`） | severity 是 **low** → 进报告成 WARN，**不阻断**修复循环（阻断只看 high/medium，`src/qc/flags.mjs:15`） |
| **每章高光 ≤1 / 每镜头 glitch ≤1 / 每章运镜 ≥3** | ⚠ 弱：`verify-render-layer.mjs:192-194` 只断言**常量本身** `<= 2 / <= 1 / <= 1`（恒真），不按章或按镜头实际计数。`CAMERA_PER_CHAPTER_MIN = 3`（`style.mjs:164`）**零代码读**。真正按镜头计数的是 `scripts/selfcheck.py`，但它读的是 `分镜表.md` 的 Markdown 表格文本（该文件当前不在仓库里），且判的是「在不在白名单行里」而非全片总数 | 效果预算的**渲染侧硬上限**只有扫光一处（`Root.jsx:52` 截断白名单），详见 `motion-vocabulary.md` §7 |
| **画面出现无出处文案 / 数字** | `scripts/verify-text-provenance.mjs`（阻断）。四段判据（A1 IR 文案 / A2 **真上画面**的文案 / B 字面量白名单 / C 双比例一致）、数字不可被白名单豁免、以及子串匹配这类弱点，以 `research-brief.md` §4 为准，本文不重述 | 非零退出，写 `artifacts/<id>/qc/text_provenance.json`；`scripts/qc.mjs:37` 见文件缺失也记阻断 issue，`scripts/deliver.mjs:52` 与 `scripts/verify-production.mjs:29` 要求它 PASS |

---

## 9. 片级效果预算 → 见 `motion-vocabulary.md` §7

本文只保留与颜色有关的一句：**「高光 / 脉冲 / 光环」这些效果能改的是出现与否和强度，不是色相**——色相永远来自 `PURPLE` / `PURPLE_LIGHT` 与 §2.3 的那两个紫光值，IR 里没有任何字段可以选择别的色。

---

## 10. 无执行者与已知破口

已修（写在这里是为了别把它当还在坏的东西）：

- ~~光环画不出来~~：`haloBack` / `haloFront` 现在两个分支都真渲染了（`src/shots/SemanticShots.jsx:206, 208` 与 `:223, 228`），并且有了专门的门：`scripts/verify-jsx-symbols.mjs`（`npm run verify:jsx-symbols`）抓「JSX 裸表达式容器引用本文件未声明的名」这类 `ReferenceError`，自带沙箱自检复刻当年 `{halo}` 的形状。
- ~~`SET_PIECE` 有两份~~：`src/remotion/Fx.jsx:3` 从 `field.mjs` import、`:371` 再导出，真源只有 `src/visual/field.mjs` 那一份。
- ~~测量层与渲染层脱节~~：判据现在走 `src/visual/{field,style,camera}.mjs` → `npm run export-visual-contracts` → `fixtures/visual_contracts.json` → Python 侧只读这份 JSON；`npm run verify:measure` 用合成 PNG 真跑一遍测量。换算按长度 ×k、面积 ×k²（`export-visual-contracts.mjs:146-200`）。

仍然成立的：

1. ⚠ `SUBJECT_SMALL`（`style.mjs:150`）与 `typographyIssues()`（`style.mjs:225-235`）**零调用者**。前者只作为 contracts 不变式的比较项存在（`export-visual-contracts.mjs:81` 断言 `EMPTY_FIELD.hero_min === SUBJECT_SMALL`、`:83` 断言 `SUBJECT_SMALL < HERO_MIN`）；后者整函数是死的，画面文字的下限实际由 §5 那几条各自守。
2. ⚠ `HERO_LARGE` / `HERO_HUGE` / `SHOT_MIN_FRAMES`（`style.mjs:147-148, 159`）只参与 contracts 不变式与导出（`export-visual-contracts.mjs:84-85`），不是画面参数。镜头最短 120 帧的真实执行者是 `scripts/selfcheck.py` 里的字面量与 `src/visual/grammar.mjs` 的 `minDuration = 4`（秒）。
3. ⚠ 段间/章间留白的真实执行者是 `scripts/tts_build.mjs` 的三个**环境变量默认值**（10 / 30 / 45），不是 `style.mjs:165-167` 的 `PARAGRAPH_GAP` / `PARA_END_GAP` / `CHAPTER_GAP`——后三者只被 `export-visual-contracts.mjs:272` 导出成记录。数值巧合相同，来源不同。
4. ⚠ `LABEL_SIZE` / `TITLE_SIZE` / `SAFE` / `safeArea` / `squeezeFor` / `textDyFor` / `PALETTE` / 四个 glow 常量 / `PURPLE_TECH` / `PURPLE_DEEP` / `PURPLE_PALE` / `GREY_LIGHT` / `ORANGE` / `CORAL` / `RED_DEEP` / `GREEN` / `MAGENTA` / `CYAN` / `GLITCH_TINT` 零引用；easing 侧的 17 个死导出见 `motion-vocabulary.md` §9。
5. ⚠ **不可达图元**：`Pill`、`TagBlock`、`MonoText`、`TitleCard`、`Sparkle`、`GradBall`、`DirBlur`、`Vignette` 都导出但没有任何渲染路径调用（`Root.jsx:3` 只装 `Backdrop / ChapterCard / EndingCredit / Hud / ProgressBar / Subtitle`）。所以 §2.1 里 Pill/TagBlock 的 active 紫、`TitleCard` 的 118px 片名与 `rgbSplit={4}`，目前在成片里都不出现。
6. ⚠ **9:16 未经真机核对**：竖屏分类阈值按面积换算（`export-visual-contracts.mjs:190-195` 自己带着这句待办），真机渲染前不能当已达标。
7. ⚠ **`.jsx` 没有被任何执行验证**：本仓库当前的授权是「先不执行，只写实现」，`npm` 安装、TTS、渲染都没跑过。JSX 的行号与逻辑全部来自读源码；纯 node 门（`npm run verify:fast`）能跑，但它们不执行 JSX。

---

## 可核对规则

1. 能用的颜色只有紫（`#6630F8` / `#A175F1`）、白、`#A0A0A1`/`#747474`/`#4A4A4A` 三档灰；橙红、深红、绿、`PURPLE_TECH`、`PURPLE_DEEP`、`PURPLE_PALE`、`GREY_LIGHT` 在渲染层零引用 —— `src/visual/style.mjs:30-46` 对照 `src/shots/SemanticShots.jsx:302-330, 363-380` + `src/remotion/Fx.jsx:32-205`。
2. 品红/青不是可调色：glitch 的错位由 `feColorMatrix` 实现（`src/remotion/Glitch.jsx:23-34`），`MAGENTA`/`CYAN`/`GLITCH_TINT` 零引用；语义引擎不传 `rgbSplit`（`SemanticShots.jsx:253`），镜头画面里不会出现这两色 —— `src/remotion/Glitch.jsx:43`。
3. 紫色光晕的色相 `(102,45,248)` 与 `PURPLE = #6630F8`（102,48,248）绿通道差 3，是刻意保留的现状而非笔误，且两个值都进了 contracts —— `src/visual/field.mjs:54-60` + `src/visual/style.mjs:88-106`。
4. 组件里存在 7 处手写字面色值 / 族串，改常量不会传导到它们，且没有任何门比对字面量与常量 —— 清单见 §2.4；`verify-visual-contracts.mjs:86-97` 冻的只是 `glowCss()` 的输出。
5. 画面文字 22px 下限只对「分镜显式写了 `size`」的元素产生 `text-below-min`；渲染层自身字号没有全局下限断言，`typographyIssues()` 是死代码 —— `src/shots/plan.mjs:431` + `src/visual/style.mjs:225-235`。
6. 大字型主角字号不得低于 96px，缩字号最多缩到基准的 78% —— `src/shots/plan.mjs:134` 的 `floor = max(BIG_TEXT_MIN, round(size × 0.78))`，断言在 `scripts/verify-render-layer.mjs:157`。
7. 主角高度下限 170px，逐镜头判定在 authored 门 —— `src/visual/style.mjs:146` + `scripts/verify-authored-shots.mjs:131`（尺寸公式与上限见 `composition-and-light.md` §5）。
8. 字幕标准 44px / 700 / 4px 黑描边 / 最大宽 1160，超预算先缩到 34px 再折两行，两行仍超宽不产生任何令牌 —— `src/visual/style.mjs:154-156` + `src/remotion/Primitives.jsx:502-533`。
9. 「每块中文 ≤16 字 / 英文 ≤48 字符」在代码里无人执行：`SUBTITLE_BUDGET`、`overflows()`、`wrapText()` 零调用，字幕折行走私有 `wrapTwoLines` —— `src/visual/textfit.mjs:61-72` + `src/remotion/Primitives.jsx:535`。
10. 中文才压窄 `scaleX 0.85`、`dy` 恒为 −2；`squeezeFor`/`textDyFor` 这两个「语言开关」零调用，英文片不会自动生效 —— `src/visual/style.mjs:142-143` + `src/shots/SemanticShots.jsx:87` + `src/remotion/Primitives.jsx:52`。
11. 字体只装载 4 个族（Noto Sans SC / Exo 2 Italic / Audiowide / Orbitron），`FONT_MONO`、`FONT_SERIF`、`FONT_EN` 未注册会掉系统字体；装载失败只打 console 不阻断渲染 —— `src/visual/style.mjs:126-139` + `src/remotion/Design.jsx:35-59`。
12. 整句解说词进不了画面：主角候选必须 `textEm ≤ 12` 才被采纳，配角 `textEm > 12` 的 box 直接丢弃；装不下就报 `hero-overlong` 并带差值数据，渲染层绝不省略号截断 —— `src/shots/plan.mjs:148-156, 190, 134-142` + `scripts/verify-render-layer.mjs:158`。
13. 一个镜头最多 1 个 active（紫）图元：第 2 个起被降级并记 `accent-overflow`，且该令牌可自修（直接改 IR） —— `src/shots/plan.mjs:412-420, 479-487` + `scripts/verify-render-layer.mjs:150`。
14. 紫色碎片已有执行者但只到 WARN：`purple_debris` 判据来自 contracts，severity 为 low，不进阻断集合 —— `scripts/frame_metrics.py:133, 188-193, 332` + `src/qc/flags.mjs:15`。
15. 效果配额常量（`SWEEP_WHITELIST_MAX` / `GLITCH_PER_CHAPTER…`）里只有扫光有真执行者，其余三行是常量自比 —— `src/visual/style.mjs:161-164` + `src/remotion/Root.jsx:52` + `scripts/verify-render-layer.mjs:192-194`。
16. `Math.random()` 与 `new Date()`/`Date.now()` 在 `src/remotion`、`src/shots`、`src/visual` 三个目录内一律 FAIL；确定性抖动只能用 `rnd(...seeds)` —— `scripts/verify-render-layer.mjs:211-232` + `src/visual/easing.mjs:111-121`。
17. `SAFE`/`safeArea()`/`PALETTE`/`LABEL_SIZE`/`TITLE_SIZE`/四个 glow 常量/八个不可达图元零引用，不要按「可用能力」引用它们 —— 检索见 §10 第 4、5 条。
18. 光环分支已被门覆盖：JSX 里「裸容器引用未声明名」由 `scripts/verify-jsx-symbols.mjs` 拦，`node --check` 拦不住这种合法语法 —— `src/shots/SemanticShots.jsx:206, 208, 223, 228`。
