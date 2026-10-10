# 构图与光（画面怎么分带、光给谁、QC 用什么数来量）

这份文件是**空间与光**的真源：设计空间与 band、内容区纵向划分、构图模式、变体几何、主角/配角尺寸、发光模型、QC 测量判据与取景区。每条规则后面跟着它的执行者；没有执行者的明确标「⚠ 无执行者」。

分工（一条规则只有一个真源，其余只链接）：

| 主题 | 真源文档 |
|---|---|
| 设计空间与 band、`layoutBands` 两条带、`composition.focus`、变体槽位几何、主角/配角尺寸、光模型、QC 测量判据与取景区、竖屏现状 | 本文 |
| 颜色与调色板、字体装载、字号阶梯、字幕、画面文案禁令 | `style-guide.md` |
| 画面文字出处门（A1/A2/B/C）判什么、不判什么 | `research-brief.md` §4 |
| 解说词与分镜表语法、`selfcheck` 判据 | `narration-and-storyboard.md` |
| Agent 收到什么、哪些约束没人执行 | `agent-protocol.md` |
| 帧号口径、帧数预算、曲线、节拍窗口、运镜词表、效果开关与配额、确定性随机 | `motion-vocabulary.md` |
| 生产顺序、人工确认点 | `SKILL.md` |
| 上游五部片里打在「空 / 小 / 暗 / 图元几何 / 覆盖层层序」上的返工逐条归属，含 `frame_metrics` 判据被真用还是被绕过、覆盖层层序与片尾联动缺口的现测 | `lessons.md` §3/§6/§7 |

契约链路（本文的数怎么走到 Python 侧）：

```
src/visual/field.mjs + src/visual/style.mjs + src/visual/camera.mjs
        │  npm run export-visual-contracts
        ▼
fixtures/visual_contracts.json        ← npm run verify:visual-contracts 校验它与真源一致
        │  只有这份 JSON 被读
        ▼
scripts/vision.py / frame_metrics.py / motion_check.py / visual_regression.py
                                        ← npm run verify:measure 用合成 PNG 真跑一遍
```

> ⚠ Python 侧不允许出现第二个判据数字。`scripts/verify-measure.mjs` 会检查测量脚本顶层没有阈值字面量（「判据没有退回成脚本字面量」），也检查它们只用标准库。

---

## 1. 设计空间：只有一套像素坐标

`design(width, height)`（`src/visual/style.mjs:173-200`）把**所有**覆盖层和镜头放进「1280 宽 × `logicalH` 高」的逻辑画布：`s = width/1280`，`logicalH = round(height/s)`，组件内一律写逻辑像素，由 `<Design>` 统一缩放（`src/remotion/Design.jsx:20-29`）。

| 画幅 | `s` | `logicalH` | 后果 |
|---|---|---|---|
| 1280×720（16:9） | 1 | 720 | 逻辑像素 = 设备像素，可与逐像素判据直接对齐 |
| 720×1280（9:16） | 0.5625 | 2276 | 按**宽度**归一，纵向只是变高；字号比例不变，但绝对像素 ×0.5625 |

bands 实测值与读取状态：

| band | 16:9 | 9:16 | 谁读 |
|---|---|---|---|
| `hudTop` 28 | 28 | 28 | ✅ `src/remotion/Primitives.jsx:437`（HUD 胶囊顶边） |
| `hudBottom` 79 | 79 | 79 | ⚠ 无读者：胶囊高度写死 51（`Primitives.jsx:221` 的 `abs(x, y, width, 51)`） |
| `railTop` 118 / `railBottom` 162 | 同左 | 同左 | ✅ `Primitives.jsx:472-473`（**片级流程轨** `Rail` 的条体上下沿，由 `Root.jsx:78` 装配）；`contentTop: 175` 的「有轨」前提由此成立 |
| `contentTop` 175 | 175 | 175 | ✅ `SemanticShots.jsx:36`（内容上界，恒用这一档）、`camera.mjs:130`（`scroll` 取景上界）、contracts 的 `qc_zone.with_rail`——注意后者由 `export-visual-contracts.mjs:233-240` **就地按同一份 bands 重算**，没有调用 `field.mjs:189` 那个同名 helper（见 §10） |
| `contentTopNoRail` 100 | 100 | 100 | ✅ `camera.mjs:203`（相机取景基准）、`field.mjs:186`（QC 取景区上界） |
| `contentBottom` `logicalH−100` | 620 | 2176 | ✅ `SemanticShots.jsx:37`、`camera.mjs:131, 204`、`field.mjs:186` |
| `subTop` `logicalH−83` | 637 | 2193 | ✅ `Primitives.jsx:516`（字幕带）、`:385`、`:405-406`（幕底渐变止于字幕上方）；`camera.mjs:215` 在 `cameraViewRect()` 内，而该函数零调用点 → 不算活读者 |
| `subBottom` `logicalH−30` | 690 | 2246 | ✅ `Primitives.jsx:517` |
| `barTop` `logicalH−33` | 687 | 2243 | ✅ `Primitives.jsx:459`（条体）、`:491`（当前位置白线）；`Fx.jsx:416, 420` 的 `Vignette` 底带止位（该图元未被装配） |
| `barBottom` | 720 | 2276 | ✅ `Primitives.jsx:456, 491`（都只用于算 `barBottom − barTop`） |
| `left` 60 / `right` 1220 | 同左 | 同左 | ✅ `plan.mjs:110`（主角可用宽 `right − left = 1160`） |
| `cameraSafe` x89–1191 / y122–607 | **不随 `logicalH` 变** | 同左 | ⚠ **无执行者**（见 §10） |

> ⚠ **字幕带 + 进度条带（16:9 的 y637–720）是画面内容禁放区**。执行者是 `layoutBands` 的 `contentBottom = logicalH − 100`（= `subTop − 17`）与 `scripts/verify-render-layer.mjs:169`（authored 元素 `y` 越出 `[contentTopNoRail−200, contentBottom+40]` 即 FAIL）。
>
> ⚠ `src/visual/style.mjs:203-210` 的 `SAFE` / `safeArea()` 是旧签名兼容层，全仓库零调用；构图只用上面的 bands。

---

## 2. 内容区纵向划分：主角带 / 机理带

`layoutBands(bands, logicalH)`（`src/shots/SemanticShots.jsx:35-49`）：

```
avail    = contentBottom − contentTop            （16:9: 445 / 9:16: 2001）
designH  = round(min(avail, max(445, logicalH × 0.35)))
offset   = round((avail − designH) / 2)           ← 垂直居中
full     = [ct, ct+designH]
hero     = [ct, ct + designH × 0.42]              ← 主角带（上 42%）
support  = [ct + designH × 0.42 + 12, ct+designH] ← 机理带
```

| | 16:9 | 9:16 |
|---|---|---|
| `designH` | 445（= avail，不缩） | 797（= `2276×0.35`） |
| 实际内容框 `full` | y175–620 | **y777–1574**（上下各空 602） |
| 主角带 `hero` | y175–362（187 高） | y777–1112（335 高） |
| 机理带 `support` | y374–620（246 高） | y1124–1574（450 高） |
| 光环中线 `haloCy` | 368 | 1118 |

主角带的 42% 与 `grammar.mjs:45` 的生产侧要求 `composition.hero_weight ≥ 0.45` 不是同一个量：前者是**画面上给主角的空间比例**（写死在 `layoutBands`），后者是**分镜声明里的一个权重数**（只被 lint 检查，渲染层不读，见 §3 注意栏）。

---

## 3. 构图模式：`composition.focus` 决定主角占多宽

| 值 | 主角可用宽 | 主角中心 `cx` | 机理带 | 轨道右界 |
|---|---|---|---|---|
| `single-hero` | `right − left = 1160`（`plan.mjs:110-112`） | 640（居中，`SemanticShots.jsx:86`） | `x 90–1190` | 1190 |
| `hero-plus-flow`（缺省） | `round(1160 × 0.6) = 696` | 408；`recipe.mirror` 时 872 | `x 720–1200`（宽 480） | 690 |

主角纵向中心 `cy`：`single-hero` 取整个内容框中心（16:9 → 398），双带取主角带中心（16:9 → 268）——`heroPos()`（`SemanticShots.jsx:82-88`）。

| 环节 | 执行者 |
|---|---|
| 模式取值只有两种 | `FOCUS_MODES = {single-hero, hero-plus-flow}`（`src/visual/grammar.mjs:23`），lint 报 `beat-v:invalid-focus-mode` |
| 宽度预算真的传进排版 | `plan.mjs:111-112`（`maxW`）→ `pickHero` 按 `textW` 实测宽度挑第一条装得下的候选 |
| `mirror` 有读者 | `plan.mjs:450` → `SemanticShots.jsx:86` |

> ⚠ **只有 `composition.focus` 被渲染层读走**。`composition.hero_weight` 没有任何渲染读者（`grammar.mjs:14-17` 已点名），它是「分镜写作要求」，改它画面不动。同理 `light.mode` / `light.accent` 也没有读者，光只有一个可写字段（§7）。

---

## 4. 变体几何：`itemSlots` 的 11 个 case

`itemSlots(plan, lb)`（`src/shots/SemanticShots.jsx:107-180`）。authored 的 `stage.items[].x/y/w/h` 存在就直接用（`:116-120`，槽位标 `authored: true`），其余按 `plan.variant` 选几何。

| `variant` | 几何 | 关键尺寸 | 连线 / 附加 |
|---|---|---|---|
| `network` | 椭圆环 | `rx = max(60, min(215, w/2 − 30))`，`ry = max(40, min(112, h/2 − 26))`，角度从 −90° 起等分 | 每槽带 `hub`；hub 向各槽画无箭头连线（`width 2/2.5`），hub 自身画两圈（`r = 16+8r` 实线 + `r = 30+6sin(...)` 灰圈，`SemanticShots.jsx:326-327`） |
| `comparison` | 栅格，列数 `max(1, min(2, n))` | `cw = floor(w/cols) − 14`，`ch = floor(h/ceil(n/cols)) − 10` | 画 `rect` 边框（`plan.mjs` 判 `variant === 'comparison'`） |
| `structured` | 行排（非 rowLike） | `h = max(40, rowH − 12)` | `list` 下划线 + `rect` 边框 |
| `code` | 行排 | 同上 | `code`：`Box` + 24px 等宽标签，并画 `rect` 边框 |
| `preference` | 行排（`row: true`） | `h = min(56, rowH − 10)` | `rect` 边框；骨架默认 `mark: check/cross` |
| `evidence` | 首件在上方，其余下方等分 | `cy = t + (i===0 ? h×0.16 : h×0.74)`，`h = round(h×0.42)`，`fan = i > 0` | `fan` 件向首件画汇聚箭头（head 8）；`variant === 'evidence'` 也触发 `rect` 边框 |
| `sequence` / `causal` / `split` / `transformation` | 栅格，列数 `min(3, max(1, n))` | 同 `comparison` | 单行时逐件 `chain` 箭头（head 9，active 时带 glow）；`transformation` 额外画 `TiltPlane`（cx 640 / w 520 / h 200 / skew −22 / sy .42，`SemanticShots.jsx:330`） |
| 其他（`generic` / `authored`） | 行排 `default` | `h = max(40, rowH − 12)` | — |
| `flow` 件（任何变体） | **横向轨道，不占配角名额** | `y = support.bottom − 24 − i×30`，`x` 从 90 到 `690/1190` | 虚线 + 3 颗匀速行进小球，周期 54 帧（`SemanticShots.jsx:345-356`） |

`plan.links`（`recipe.stage.links` 或 `scene.links`，`plan.mjs:438`）用图元 id 引用，两端都存在且都不是 rail 时才画 `ChainArrows`（`per = 6` 帧一段）。

| 环节 | 执行者 |
|---|---|
| variant 拼错会静默退化成行排 | `scripts/verify-authored-shots.mjs:41-52, 125`：从 `SemanticShots.jsx` 里**解析出 `switch (plan.variant)` 的真实 case 集合**，不在集合里就 FAIL（旧版只做 `source.includes('variant:"network"')` 子串比对，形同没判） |
| recipe 写了引擎不读的键 | 同上 `:118`：`CONSUMED` 白名单之外的键一律 FAIL，报「假开关」 |
| 必需键 | `:24, 119, 138-140`：`shot_id` / `variant` / `hero_size` / `camera` / `settle_frames` 必须存在，且与 `fixtures/reference-shot-blueprint.json` 逐字段一致；`:144-148` 反向检查盘上镜头文件都登记进 blueprint（否则新增一镜可以完全不过这道门） |

---

## 5. 主角：尺寸、文案出身、挤压

### 5.1 尺寸

`heroSizeOf(scene, recipe, logicalH)`（`src/shots/plan.mjs:159-164`）：

```
base  = recipe.hero_size ?? scene.hero_size ?? 190
scale = scene.hero_scale ?? recipe.hero_scale ?? 1     ← Repair 写回的就是这个字段
hi    = round(max(HERO_MIN+40, (logicalH − 200) × 0.52))   16:9 → 270 / 9:16 → 1080
size  = round(min(hi, max(HERO_MIN, base × scale)))
```

| 档 | 常量 | 值 | 状态 |
|---|---|---|---|
| 下限 | `HERO_MIN` | 170（`style.mjs:146`） | ✅ `heroSizeOf` 夹紧 + `verify-authored-shots.mjs:131` 逐镜头判 + QC 侧换算成设备像素 `thresholds_device.hero_min_px`（16:9 → 170，9:16 → 95.63） |
| 大字型主角字号下限 | `BIG_TEXT_MIN` | 96（`style.mjs:149`） | ✅ 作为 `fitSize` 的 `floor`（`plan.mjs:134`）；`verify-render-layer.mjs:157` 断言「`hero.size ≥ 96` 否则必须有 issue」 |
| 空场主体下限 | `SUBJECT_SMALL` | 110（`style.mjs:150`） | ✅ 经 `EMPTY_FIELD.hero_min` 进测量层（`export-visual-contracts.mjs:81` 断言两者相等） |
| `HERO_LARGE` 260 / `HERO_HUGE` 360 | `style.mjs:147-148` | — | ⚠ 渲染层不读，只参与不变式 `HERO_MIN < HERO_LARGE < HERO_HUGE`（`export-visual-contracts.mjs:84`）和导出 `limits_device`。分镜里写 `hero_size: 260` 是**基准值**，不是「按了大档」 |

数字主角的字号另行推导：`max(110, round(hero.size × 0.66))`（`SemanticShots.jsx:242`），配角数字则是 `min(96, max(54, round((slot.h || 90) × 0.72)))`（`:365`）。

### 5.2 画面文案的出身顺序（`plan.mjs:115-123`）

`recipe.hero.display` → `recipe.hero`（字符串）→ `scene.hero.display` → 画面元素文案（`DISPLAY_KEYS`：`display / headline / short / label_text / text`，且**宽度 ≤12 em 才采纳**，`:148-156`）→ `scene.key_terms[0]` → `matched_rules` 里最长的中文 2–6 字或英文词（`matchedTerm`，`:88-98`）→ `recipe.fallback_hero`。

一条都装不进 `maxW` 时报 `hero-overlong`，并带上 `{max_width, floor_size, candidates, longest_chars}`（`plan.mjs:142-145`）；画面退化成 `narrative_job` 串或 scene id。**渲染层绝不省略号截断**——`verify-render-layer.mjs:158` 专门断言主角文案不以 `…`/`...` 结尾。字号下限、压窄、字体角色见 `style-guide.md` §5 / §6。

---

## 6. 配角：kind、icon、mark、active

`pickSupport`（`plan.mjs:177-217`）：authored `stage.items` 存在就原样归一；否则从 `elements` / `visual.objects` 推。

| 判定 | 规则 | 出处 |
|---|---|---|
| `kindOf` | 先看声明 `kind/type`（`num|metric|counter|stat` → number，`icon|symbol|glyph` → icon，`code|snippet|json` → code，`term|chip|pill|tag|label` → term，`arrow|flow|link|edge|signal` → flow，`card|box|panel|block` → box）；没声明就看文字形状：`[{` 开头 → code，纯数字 → number，宽度 ≤6 em → term，否则 box | `plan.mjs:49-64` |
| 长句降级 | `textEm(text) > 12 && kind === 'box'` 的元素**不画**（解说词已在字幕带上）；`flow` 件不带文字 | `plan.mjs:190-192` |
| 骨架补齐 | 每种 variant 声明自己要几件什么件（`variantSkeleton`，`plan.mjs:243-260`：network 6 件、split 3、preference 3（accent 第 3 件）、structured 4、comparison 2、transformation 2、sequence/causal/evidence/code 3、generic 3），`recipe.support_count` / `labels` / `accent_index` 可覆盖 | `plan.mjs:207-215` |
| 图标 | 只认 `KNOWN_ICONS` 17 键（`doc db chunk chip lock shield key link person rack funnel gauge clock scale branch wave grid`，`plan.mjs:67`）；骨架里的图标也过一遍 `regIcon`，未登记的键会被换成 `null` 而不是留个假名 | `plan.mjs:242, 259` |
| `active` | `el.active \|\| el.focus`；同镜头第二个起被强制降级并记 `accent-overflow` | `plan.mjs:203, 412-420` |
| `mark` | `check` / `cross` 画在槽右端 `cx + (w \|\| 120)/2 − 22` | `SemanticShots.jsx:318-319` |
| 图标尺寸 | `round(min(132, max(86, s.w ? s.w × 0.5 : 110)))`（`SemanticShots.jsx:343`），带文字时图标上移 24px | — |

> ⚠ `props` 是唯一能透传进 `Icon` 的口子（`normalizeItem` 保留 `it.props`，`SemanticShots.jsx:297` `{...(it.props \|\| {})}`）；除此之外，分镜不能在 recipe 里改图元画法。

---

## 7. 光：只有主角发光，而且只有一种紫

| 档 | 图元 | 触发 | 参数 |
|---|---|---|---|
| 白 bloom（结构线常驻） | `<Svg>` 整幅 `filter: drop-shadow(0 0 3px rgba(255,255,255,.5))` | 每镜头的描边层都被 `<Svg>` 包住（`SemanticShots.jsx:209, 218, 220`） | ⚠ `BLOOM` 常量零引用，CSS 是内联字面量（`Primitives.jsx:278`） |
| 紫柔光（主角常亮 + 呼吸） | 文字/矩形主角 → `HeroGlow`（`boxW × (hero.size+28)`，位置 `cy − size/2 − 14`，强度 `k × 0.9`）；数字主角 → `GlowBlob`（径向渐变圆斑，`r = round(hero.size × 1.2)`） | `HeroLayer` 二选一（`SemanticShots.jsx:251`），**全片唯一的 glow 调用点** | `k = clamp01(plan.key) × softOp(N − hero.f0, BEAT.SOFT_IN)`；30 帧周期 ±15% 呼吸（`Fx.jsx:221, 232`） |
| 紫硬投影（主角大字） | `CText` 的 `shadow` | `k > 0.5` 才挂上（`SemanticShots.jsx:244`） | `0 0 34px rgba(102,45,248,.45)` 内联字面量 |
| 白闪（事件） | `StageLine` 三帧 `[.95, .7, .35]`（`Fx.jsx:114`） | 仅 `fx.set_piece` 镜头 | 白闪帧 = `plan.subFrom` |

**可写的光只有强度**：`scene.light.key_intensity` ∈ (0,1]，缺省 **0.82**（`keyLight`，`plan.mjs:359-362`；lint 报 `beat-v:invalid-key-light`，`grammar.mjs:47`）。

> ⚠ `light.mode`（`LIGHT_MODES = {hero-key, soft-key}`，`grammar.mjs:24`）与 `light.accent` 只被生产侧 lint 检查，**渲染层不读**：`keyLight` 只看 `key_intensity`。写 `mode: 'soft-key'` 不会有任何画面差别。
> ⚠ 配角不发光：`GLOW_PURPLE_S` / `GLOW_ORANGE` / `GLOW_RED` / `BLOOM` 四个 glow 常量零引用（`src/visual/style.mjs:101-106` 对照全仓检索），active 配角只换描边色与文字色。
> 光晕的色相是 `(102,45,248)`，与描边紫 `PURPLE = #6630F8` = `(102,48,248)` 绿通道差 3；这是样片实测值原样保留，不是笔误（`src/visual/field.mjs:54-57`，颜色语义规则归 `style-guide.md` §2.3）。
> 幕底只有两种：`bg:'dots'`（`DOT_FIELD`，step 48 / x0 32 / y0 24 / r 2.5 / sweepPeriod 279 帧 / halo 220 / grain .06）与 `bg:'stars'`（`STAR_FIELD`，80 点、seed 7）。两者都由 `Primitives.jsx` 读、由 `export-visual-contracts.mjs` 导出，QC 侧按 `dot_field_device` 网格先把点抠掉（不抠的话波前亮点会被数成背景碎屑，见 `frame_metrics.py:22` 注释）。

---

## 8. QC 怎么量这块画面：取景区与判据

### 8.1 取景区

`qcZone(bands) = {top: contentTopNoRail(100), bottom: contentBottom}`（`src/visual/field.mjs:186`）——HUD、字幕、进度条**都不进统计**。rail 型镜头另取 `qcZoneWithRail`（上界 `contentTop` 175）。

`qcZoneScaled(bands, deviceWidth, deviceHeight)`（`:195-215`）把设计单位的取景区换算成**设备像素**与**采样像素**两套坐标（`s = deviceWidth/1280`，`k = deviceHeight/logicalH`）；`export-visual-contracts.mjs:122-128` 逐画幅写进 `qc_zone`。判据换算规则：**长度 ×k、面积 ×k²**（`measureDevice`，`export-visual-contracts.mjs:146-200`）。

> ⚠ 相机取景的画面和 QC 量的画面必须是同一块：两者都从同一份 bands 推导（`camera.mjs:201-206` 的 `camCenterY` 与 `field.mjs:186` 的 `qcZone` 都取 `contentTopNoRail` / `contentBottom`）。这个同源靠**共用常量**实现，没有门去比对两个值；门只校验换算结果本身——`export-visual-contracts.mjs:295-301` 判 `qc_zone` 的设备/采样坐标自上而下有效、含轨上界高于无上界，`scripts/verify-visual-contracts.mjs:103` 要求两种画幅都带取景区。

### 8.2 主体尺度怎么算（`HERO_MEASURE`，`field.mjs:124-133`）

| 参数 | 值 | 含义 |
|---|---|---|
| `struct` | 41 × 13 | 形态学膨胀元（横 41 / 纵 13）：把一行大字的字距（≤40px）并成一个物体，但不会把间距 ≥50 的胶囊行并起来 |
| `min_ink_px` | 30 | 少于 30 个亮像素的是星点/噪点，不成物体 |
| `bright_luma` | 120 | 亮像素判据 `luma > 120`；`luma = (r×299 + g×587 + b×114)/1000`（Rec.601 整数近似，`LUMA`，`field.mjs:119`） |
| `small_box` | 60 | `h < 60 && w < 60` → 记背景碎屑，不是主体 |
| 尺度公式 | `size = max(h, min(w, 4h) / 2.5)` | 一行大字按整行计，细线几乎不加分 |
| `no_content_bright_px` | 200 | 整帧亮像素 < 200 → 这帧没内容，主角尺度记 0，**不掺进中位数** |
| `glow_pad_px` | 30 | 统计「主角区柔光」时向主角框外扩 30px |

### 8.3 柔光 / 紫色碎片 / 空场

| 判据 | 值 | 报出的令牌 | severity |
|---|---|---|---|
| 柔光区间 | `sat_min .25`、`lum_max 110`、`lum_min 10`（点阵幕底下抬到 `lum_min_dots 22`，否则 `#0b0c11` 自带蓝会整屏误判） | — | — |
| 主角区柔光中位 | `< hero_area_min 800px²` | `glow_missing` | low（警告，不阻断） |
| 内容区柔光 | `≥ activity_px 10000px²` = 大面积光活动，该帧**不算空场** | — | — |
| 紫色实心碎片 | 规则 `b>r>g`、`sat_min .45`、`lum_min 45`、元 25×7、`min_area 80px`，中位 `≥ median_max 8` 块 | `purple_debris` | low |
| 背景碎屑 | 小团块中位 `≥ 10` | `background_debris` | medium（阻断） |
| 空场 | 主体 `< hero_min 110px` **且** 光活动 `< activity_px`，持续 `> sustained_frames_max 45` 帧 | `hero_too_small` | 空场期内主体中位 `< severe_hero_px 80` → **high**；否则 **medium** |
| 主角偏小（非空场） | 有效帧主体中位 `< thresholds_device.hero_min_px`（= `HERO_MIN` 换算值） | `hero_too_small` | low |

**只有 `high` / `medium` 阻断**（`src/qc/flags.mjs:15` `BLOCKING_SEVERITIES`）：`low` 进报告但不进修复循环。镜头 `status` 由 Python 侧算（`frame_metrics.py:354`），`reportToIssues` 只翻译不重判——两处各判一次迟早给出两个结论。

### 8.4 运动与停留（`MOTION`，`field.mjs:164-180`）

| 参数 | 值 | 作用 |
|---|---|---|
| `sample_width` | 320 | 灰度采样统一宽度，高度按比例推（别把 9:16 压成 16:9） |
| `step` / `analysis_step` | 3 / 4 | 帧差步长 / 全分辨率构图分析步长；纯 stdlib 没有 PIL 的 jpeg draft 解码，**步长就是成本旋钮**，命令行可覆盖但默认必须来自 contracts（`frame_metrics.py:39-68`） |
| `still_thr` | 0.35 | 采样图逐帧平均差 < 0.35 = 静止帧 |
| `still_max_seconds` | 3.0 | 完全静止 > 3 s 才报 `freeze`。**不为凑指标给静止物体加漂浮** |
| `hold_thr` | 1.5 | 「无大面积变化」：落位后的动词动作 0.4–1.2，入场/运镜 2.5+ |
| `hold_min_frames` | 30 | 离场前必须停这么久；`export-visual-contracts.mjs:80` 断言它 `== CAMERA_LIMITS.clear` |
| `exit_brightness_k` / `exit_tail_frames` | 0.9 / 20 | 区亮度掉到尾段中位数的这个比例以下 = 已在离场（`motion_check.py:201-206`） |
| `glow_off_frames` | 6 | 已离场时 hold 先扣掉这 6 帧（`motion_check.py:216`） |
| `diff_px_thr` | 25 | 全分辨率逐像素差 > 25 才算变化像素 |
| `class_true_static` / `class_small_motion` | 800 / 2500 | 变化像素中位 `<800` → 真静；`800–2500` → 小面积动作；`>2500` → 其实有动作（采样太粗）。⚠ 换算按**面积 ×k²**，不按取景区占比——设计里 30×30 的脉动图元在 9:16 上是 285 设备像素，按占比折算会被判成「真静」，于是「给动词动作」的建议永远发不出来（`export-visual-contracts.mjs:190-195`）；9:16 的两个阈值仍需真机复核 |

`motion_too_low` 附带 `classification` + `changed_px_median` + `repair_hint`（`motion_check.py:224-231`）；`hold_too_short` 的建议明确是「离场/前挂末拍/并镜头，不是加动作」（`:233`）。路由与「为什么 `motion_too_low` 不算自动修复」归 `motion-vocabulary.md` §8。

---

## 9. 竖屏（9:16）的真实现状

**已做到**：按宽度归一到 1280 逻辑宽（`s = 0.5625`），字号比例不变；`layoutBands` 把内容框纵向放宽（`designH = 2276×0.35 = 797`）；HUD 在顶、字幕在底；QC 判据逐画幅换算成设备像素（170px 主角下限在 9:16 上是 95.63px）。

**没做到**：真竖屏构图。当前竖屏只在逻辑画布中间那 797px 里画画，上下各空 600+ 像素，主体仍是横屏那套两条带（`SemanticShots.jsx:29-31` 自己写明）。`cameraSafe` 的底边还停在 607，不随 `logicalH` 变——所以竖屏的「运镜把元素推出安全区」这件事既没实现也没校验。纵向堆叠、字号按设备像素下限重算是后续独立一步，**现在不要当已达标**。

---

## 10. 无执行者与已知破口

1. ⚠ **`cameraSafe` 零读者，`cameraViewRect()` 零调用点**：`camera.mjs:10` 声明的硬约束「位移量必须让所有元素留在 cameraSafe 内」没有任何代码执行；`Fx.jsx:310` 只是 re-export，没调用。加上它是硬编码的 16:9 数（`style.mjs:198`），竖屏下会把 2/3 画面判成出界。分镜里不要引用它。
2. ⚠ `hudBottom` 无读者（HUD 胶囊高度在 `Primitives.jsx:221` 写死 51）。`railTop`/`railBottom` 已有读者（**片级** `Primitives.Rail`，`Primitives.jsx:467-473` + `Root.jsx:78`），`contentTop: 175` 的「有轨」前提成立（§1）。
3. ⚠ `composition.hero_weight`、`light.mode`、`light.accent` 只被生产侧 lint 看，渲染层不读——改它们不构成一次修复（§3、§7）。
4. ⚠ `HERO_LARGE` / `HERO_HUGE` / `SET_PIECE.minLen` / `SHOT_MIN_FRAMES` 只参与 contracts 不变式与导出，不是画面参数（§5.1；`style-guide.md` §10 记着同源项）。
5. ⚠ **`qcZoneWithRail` 与 `glowOuterRadius` 零调用**：contracts 里的 `qc_zone.with_rail` 由 `export-visual-contracts.mjs:233-240` 就地用同一份 bands 重算，**没走** `field.mjs:189` 那个 helper——同一个规则两句实现，将来改上界只改一处就会分叉（这是已知重复，不是已实现的双保险）。`glowOuterRadius`（`:97`，只被 `style.mjs:98` 再导出）本意是给 QC 问「柔光外接半径多大」，实际测量用 `glow_pad_px` + 面积，所以没人读它。
6. ⚠ `MOTION.glow_off_frames` 的前提（先灭光再离场）在渲染侧没有实现，见 `motion-vocabulary.md` §4。
7. ⚠ 竖屏判据的 `class_true_static` / `class_small_motion` 换算系数是按面积推的，**未经真机渲染核对**（`export-visual-contracts.mjs:190-195` 的注释里带着这句）。
8. ⚠ `.jsx` 文件无法用 `node --check` 校验，本文引用的 JSX 行号靠读源码而非执行验证；JSX 里「裸表达式容器引用未声明名」这类崩溃由 `scripts/verify-jsx-symbols.mjs` 拦（`npm run verify:jsx-symbols`），其余 JSX 逻辑仍未被任何门执行。

---

## 可核对规则

1. 所有画面层写在「1280 宽 × `logicalH` 高」的逻辑画布里：16:9 `s=1 / 720`，9:16 `s=0.5625 / 2276` —— `src/visual/style.mjs:173-200`，缩放由 `src/remotion/Design.jsx:24` 施加，对齐断言在 `scripts/verify-render-layer.mjs:28-42`。
2. 内容区上界恒取 `contentTop = 175`，下界 `logicalH − 100`；字幕带与进度条带是禁放区，越界由 `scripts/verify-render-layer.mjs:169` 判 —— `src/shots/SemanticShots.jsx:36-37`。
3. 内容框高度 `designH = round(min(avail, max(445, logicalH × 0.35)))` 且**垂直居中**；主角带吃上 42%，机理带吃其余并留 12px —— `src/shots/SemanticShots.jsx:39-48`。
4. 主角可用宽只有两档：`single-hero` 1160px、`hero-plus-flow` 696px；机理带相应是 `x90–1190` 或 `x720–1200`，轨道右界 1190 或 690 —— `src/shots/plan.mjs:110-112` + `src/shots/SemanticShots.jsx:86, 112, 178`。
5. `recipe.mirror` 会把主角从 x408 换到 x872 —— `src/shots/plan.mjs:450` + `src/shots/SemanticShots.jsx:86`。
6. variant 只有渲染层 `switch` 里出现过的 case 才有效，拼错会静默退回行排；这道门从 `SemanticShots.jsx` 反解 case 集合，不维护第二份名单 —— `scripts/verify-authored-shots.mjs:41-52, 125`。
7. authored recipe 里出现引擎不读的键一律 FAIL，必需键为 `shot_id/variant/hero_size/camera/settle_frames`，且必须与 `fixtures/reference-shot-blueprint.json` 逐字段一致、盘上镜头不得有孤儿 —— `scripts/verify-authored-shots.mjs:25-26, 121-122, 141-143, 147-151`。
8. 主角高度 `round(min(hi, max(170, base × hero_scale)))`，`hi = round(max(210, (logicalH−200) × 0.52))`（16:9 → 270，9:16 → 1080）；`hero_scale` 是 Repair 唯一能改主角尺寸的字段 —— `src/shots/plan.mjs:159-164`。
9. 画面文案最多 12 个宽度单位才可能被采纳为主角，装不下就报 `hero-overlong` 并带差值数据，渲染层不截断、不加省略号 —— `src/shots/plan.mjs:148-156` + `scripts/verify-render-layer.mjs:157-158`。
10. 配角图标只认 `KNOWN_ICONS` 17 键，骨架图标也过 `regIcon` 过滤；未登记键记 `icon-unregistered` 且那块静默缺失 —— `src/shots/plan.mjs:67, 242` + `src/remotion/Icons.jsx`。
11. 一个镜头最多 1 个 active 图元，第 2 个起降级为白/灰并记 `accent-overflow`（可自修） —— `src/shots/plan.mjs:412-420, 482`。
12. 全片唯一的 glow 调用点在 `HeroLayer`：数字主角 `GlowBlob r = hero.size × 1.2`，文字主角 `HeroGlow`，强度 `k = clamp01(light.key_intensity 缺省 .82) × softOp(...)` —— `src/shots/SemanticShots.jsx:239, 251` + `src/shots/plan.mjs:359-362`。
13. `light.mode` / `light.accent` / `composition.hero_weight` 无渲染读者，写它们不动画面 —— `src/visual/grammar.mjs:13-17`。
14. QC 取景区 = `contentTopNoRail(100) … contentBottom`，与相机取景基准同源；HUD/字幕/进度条不进统计 —— `src/visual/field.mjs:186` + `src/visual/camera.mjs:201-206`。
15. 主体尺度 `size = max(h, min(w, 4h)/2.5)`，元 41×13，亮像素 `luma > 120`，整帧亮像素 < 200 记 0 —— `src/visual/field.mjs:124-133`，实现 `scripts/vision.py` / `scripts/frame_metrics.py`。
16. 空场 = 主体 <110px 且光活动 <10000px² 持续 >45 帧 → `hero_too_small`（更严重的中位 <80px 时升 high）；主角区柔光中位 <800px² → `glow_missing`（low，不阻断） —— `src/visual/field.mjs:136-161` + `scripts/frame_metrics.py:306-335`。
17. 紫色实心碎片（`b>r>g`、元 25×7、≥80px）中位 ≥8 块报 `purple_debris` —— 判据 `src/visual/field.mjs:146-153`，执行者 `scripts/frame_metrics.py:133, 190-193, 332`（`style-guide.md` 旧版说这条「无执行者」，现已成立）。
18. 只有 `high`/`medium` 令牌阻断，`low` 是警告；镜头 `status` 由 Python 侧算，翻译层不重判 —— `src/qc/flags.mjs:15, 60-70`。
19. 静止 >3.0 s 报 `freeze`；`motion_too_low` 带三档分类与 `repair_hint`；`hold < 30` 帧报 `hold_too_short` —— `src/visual/field.mjs:164-180` + `scripts/motion_check.py:196-233`。
20. 判据数字只有一份真源且经契约走到 Python：`field.mjs` → `export-visual-contracts` → `fixtures/visual_contracts.json` → 测量层；长度 ×k、面积 ×k² —— `scripts/export-visual-contracts.mjs:110-195`，一致性由 `npm run verify:visual-contracts` 与 `npm run verify:measure` 执行。
21. 竖屏不是另一套构图：目前只放宽内容框并换算判据，纵向堆叠未实现，`cameraSafe` 在竖屏下失真 —— `src/shots/SemanticShots.jsx:29-31` + 本文 §9 / §10.1。
