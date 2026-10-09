# 动效词汇表（本引擎真能画出来的那套）

这份文件只管一件事：**某个动效名字 / 某个帧数，在这个仓库里到底有没有人执行**。每条规则后面跟着它的执行者（常量、代码路径或门禁）；没有执行者的写成「⚠ 无执行者」，死表单独列一节。不要在这里找「理论上该怎么做」——那在 `docs/REFERENCE_PROCESS.md` 与 `docs/REFERENCE_QUALITY.md`（上游 anything2explainer 的方法文档**不在本仓库内**，仓库地址与吸收范围见 `docs/REFERENCES.md`；凡是提到 `reference/…` 的地方都是外部路径，本仓库没有这个目录）。

分工（一条规则只有一个真源，其余只链接）：

| 主题 | 真源文档 |
|---|---|
| 帧号口径、帧数预算、曲线、节拍窗口、离场、运镜词表与限制、高光时刻时序、效果开关与片级配额、确定性随机 | 本文 |
| 颜色、字体、字号阶梯、字幕、画面文案禁令 | `style-guide.md` |
| 画面文字出处门（A1/A2/B/C）判什么、hero 兜底为什么出声不阻断 | `research-brief.md` §4/§6 |
| 设计空间与 band、纵向两条带、构图模式、变体几何、光模型、QC 测量判据 | `composition-and-light.md` |
| 生产顺序与人工确认点 | `SKILL.md` |
| Agent 收到什么、必须交付什么、哪些约束只是任务书没有执行者 | `agent-protocol.md` |
| 解说词与分镜表语法、`selfcheck` 九判据 | `narration-and-storyboard.md` |
| IR 字段能不能改画面（整改路由） | `src/repair/engine.mjs` + `src/shots/plan.mjs` 的表，见本文 §8 |
| 上游五部片里打在**帧时序**上的返工逐条归属（入场即停、离场归零、`kf` 首值、`fadeIn(0)=0`、末拍溢出、glitch 吃掉可读帧），含本文各判据「上片后真被踩没有」的对照 | `lessons.md` §2/§7 |

---

## 0. 帧号口径（先统一坐标，否则每条规则都差一帧）

| 量 | 定义 | 出处 |
|---|---|---|
| `N` | **镜头内 1-based** 帧号。Remotion 的 `useCurrentFrame()` 是 0-based | `src/shots/SemanticShots.jsx:59` |
| `len` | 镜头总帧数 = `round(duration × fps)`，`duration` 缺省 4 秒 | `src/shots/plan.mjs:26-29` `shotFrames` |
| `globalF0` | 镜头首帧在整片时间轴上的 0-based 帧号 | 同上 |
| `f0` | 某元素的入场帧（相对镜头，1-based） | `src/shots/plan.mjs:279` `beatFrames` |
| `subFrom` | 本镜头**首块字幕**的相对起始帧 | `src/shots/plan.mjs:314-332` `shotCaptions` / `firstSubLocal` |
| `exitAt` | 离场开始帧 = `max(1, len − hold)` | `src/shots/plan.mjs:35-40` `exitPlan` |

执行者：字幕块与镜头帧号同源这件事由 `scripts/verify-render-layer.mjs:179-188`（§5 字幕块与镜头帧号同源）钉住——它断言 5 件元素配 2 块字幕时全部落进 `BEAT_WINDOW`、入场帧不为负、跨到第二块后仍逐件错峰。

> ⚠ 分镜表、字幕帧号、`f0` 全部是 1-based。写 0-based 会让每个入场拍子整体早一帧，而这个错在截图上看不出来。

---

## 1. 帧数预算：`BEAT` 表里哪些数真在画面里

`src/visual/easing.mjs:124-145` 是唯一一张帧预算表。**但它只是表**：一个键只有在被 `BEAT.X` 读到时才影响画面。逐键核对结果：

| 键 | 值 | 谁读它 | 门禁 |
|---|---|---|---|
| `SOFT_IN` | 8 | `src/shots/SemanticShots.jsx:239`（主角光 `softOp` 时长）、`:253`（`SoftIn len`）、`:276`、`:346` | `verify-render-layer.mjs` §4 间接（夹具跑 `buildPlan`） |
| `STAGGER` | 2 | `src/shots/plan.mjs:305`（逐元素错峰 `anchor + j * BEAT.STAGGER`） | `verify-render-layer.mjs:188` 断言跨块仍错峰 |
| `DRAW_ON` | 22 | `src/shots/SemanticShots.jsx:278`（描边 `drawOn`） | — |
| `COUNTER` | 20 | `:242`（数字主角 `countTo`）、`:365`（配角数字） | — |
| `EXIT_HOLD_MIN` / `EXIT_HOLD_MAX` | 30 / 45 | `src/shots/plan.mjs:36-37`（夹紧）、`:284`（入场帧不得晚于 `len − EXIT_HOLD_MIN`） | `verify-render-layer.mjs:122` 断言缺省停留落在 30–45 |
| `EXIT_ACCEL_P` | 1.6 | `exitDrop` 的**默认参数** `p = BEAT.EXIT_ACCEL_P`（`easing.mjs:165`），两个调用点都只传 `len`，所以确实生效：`SemanticShots.jsx:65`、`Primitives.jsx:581` | — |
| `CAMERA_MIN` | 20 | ⚠ 运镜长度用的是 `CAMERA_LIMITS.min`（`src/visual/camera.mjs:15`），不是这个键。`BEAT.CAMERA_MIN` 目前只出现在 `verify-render-layer.mjs:240` 的 PASS 输出字段里 | 无实质执行者 |
| `CAMERA_MAX` / `CAMERA_CLEAR` | 45 / 30 | `CAMERA_CLEAR` 只在 `verify-render-layer.mjs:70` 用作兜底慢推的断言上界；真正的清场约束是 `CAMERA_LIMITS.clear` | 见 §5 |
| `FADE_IN` | 12 | 只作为 `fadeIn(n, len = BEAT.FADE_IN)` 的默认值存在（`easing.mjs:148`）。`Primitives.jsx:387/433/511/558/582/603` 六处调用**全部显式传 len**（12/10/6/18/10/18），默认值走不到 | ⚠ 现状：写分镜时「标准淡入 12 帧」只是文档 |
| `FADE_OUT` | 15 | ⚠ 无执行者（`exitFade` 本身零调用，见 §9） | — |
| `GLITCH_IN` | 12 | ⚠ 无执行者。glitch 的逐帧 alpha 由 `GLITCH_SEQ`（12 项序列，`src/remotion/Glitch.jsx:14`，`glitchOpacity` 索引它）决定；`BEAT.GLITCH_IN` 与它**数值相同但没有关系** | — |
| `SLIDE_UP` / `LATERAL` / `SCALE_IN` | 22 / 18 / 21 | ⚠ 无执行者。`slideIn` 的调用点自己传 `(22, 2.5)`、`(20, 2.5)`、`per*3` | — |
| `TYPEWRITER_PER_CHAR` | 2 | ⚠ 无执行者（`typedCount` 零调用） | — |
| `GLOW_ON` / `GLOW_OFF` | 8 / 6 | ⚠ 无执行者。主角灯的淡入实际用 `softOp(N − hero.f0, BEAT.SOFT_IN)`；离场是整层 `exitDrop` 一起淡出，**没有「先灭光再淡出」的实现**（`SemanticShots.jsx:65`） | — |
| `STILL_MAX_FRAMES` | 90 | ⚠ 无执行者。测量层用的是 `MOTION.still_max_seconds = 3.0`（`src/visual/field.mjs:172`，经 `fixtures/visual_contracts.json` 传给 `scripts/frame_metrics.py:336`）。两个数换算后同为 90 帧，**执行的那份在 field.mjs** | `export-visual-contracts.mjs:95` 断言 `3.0×30 ≤ SHOT_MIN_FRAMES` |

**结论给作者**：能靠分镜改变的只有 `STAGGER`（错峰）和 `EXIT_HOLD_*`（停留）；其余帧数是渲染层写死的，分镜里写「淡入 20 帧」不会生效。

---

## 2. 入场：起点比时长更要命

| 函数 | 定义 | 状态 |
|---|---|---|
| `softOp(n, len = 8, from = 0.25)` | `easing.mjs:160`。n=0 直接给 0.25，随 n 单调不降 | ✅ 引擎里所有配角/标签/主角灯的淡入（`SemanticShots` 四处、`Primitives` 多处） |
| `firstOp(n, len = 6, from = 0.57)` | `easing.mjs:161`。需要「首帧就明显」时用，起点 57% | ❌ 零调用（备用件） |
| `fadeIn(n, len)` | 线性 0→1，`fadeIn(0) = 0` | ✅ 只用于覆盖层（HUD / 字幕 / 章节卡），**不要用于主角** |
| `slideIn(n, N = 22, p = 2.5)` | `1 − (1 − n/N)^p` | ✅ `SemanticShots.jsx:325`（hub 环）、`Primitives.jsx:309` |
| `drawOn(n, len = BEAT.DRAW_ON)` | 幂 2 缓出描线进度 | ✅ `SemanticShots.jsx:190, 278` |
| `emphasisPulse(n, {peak 1.11, up 13, hold 4, down 13})` | 缩放脉冲，不改透明度 | ✅ `SemanticShots.jsx:185` |
| `keyframes(t, kf)` / `kf(t, pairs, ease)` | 分段插值 | ✅ `camera.mjs` 之外由 `Primitives`/`Fx` 使用 |

> ⚠ **首值陷阱（两处，都会静默吃掉镜头前半段）**
> 1. `keyframes/kf` 在 `t < 首关键帧` 时返回**首值**而不是 0（`easing.mjs:77-84` 注释点名）。中段才生效的曲线必须以「镜头起始帧 + 起始值」开头。
> 2. `camAt(N, keys)` 同样在 `N <= keys[0].f` 时返回 `keys[0]`（`camera.mjs:21-23`），所以 `keys[0].f` 必须等于镜头首帧，否则入场半段相机一直停在第一个关键帧的位姿上。
>
> ⚠ **主角不能用 `fadeIn`**：`fadeIn(0)=0` 使首帧全黑，而测量层按「整帧亮像素 < `HERO_MEASURE.no_content_bright_px`(200)」判定这帧没内容、主角尺度记 0，接着被 `EMPTY_FIELD` 判成空场缺陷（`src/visual/field.mjs:131`、`scripts/frame_metrics.py`）。即使起点只有 25%，仍可能低于 `bright_luma`(120) / `SOFT_GLOW` 的可见下限。这条因果写在 `easing.mjs:151-159` 的注释里，判据数字本身只在 `field.mjs` 有一份。

---

## 3. 节拍窗口：元素出现必须贴着它那一句话

| 规则 | 值 | 执行者 | 违规后果 |
|---|---|---|---|
| 元素入场帧落在**它对应字幕块**起始帧 −6…+3 | `BEAT_WINDOW = [-6, 3]`（`src/visual/style.mjs:160`） | `src/shots/plan.mjs:422-425` 按 `it.beat` 判并记 `beat-window-overflow`；`verify-render-layer.mjs:144` 夹具断言全部落窗 | 令牌 `beat-window-overflow`，`auto: false`（`plan.mjs:480`）——  authored 的 `f0` 写在镜头源文件里，IR 表达不了 |
| 多元素逐件错峰 2 帧 | `BEAT.STAGGER` | `plan.mjs:305` | — |
| 每块字幕最多配 4 件 | `BEAT_PER_BLOCK_MAX = 4`（`plan.mjs:278`；窗口 10 帧 ÷ 2 帧错峰） | `beatFrames` 排不下时溢出到下一块，最后一块不够就钳到 `len − EXIT_HOLD_MIN` 并留下出窗 beat | 报 `beat-window-overflow`，即「一块字幕配七件画面」本身是分镜缺陷 |
| 主角同样守窗，且不早于解说登场 | `hero.f0 = max(1, subFrom + BEAT_WINDOW[0] + 2)` | `plan.mjs:410`；`verify-render-layer.mjs:163` | 旧写法写死 `f0=1`，镜头比首句字幕早开时主角会先于解说登场 |

> 锚是「本元素对应的字幕块」，不是整镜头第一块。这个坑修过：以前 7 件配角全锚首块，按 2 帧错峰排到 +8，等于第 5 件之后全部违规，画面上表现为「解说说第三句时画面还在演第一句的东西」（`plan.mjs:269-276`）。

---

## 4. 离场与停留

| 规则 | 值 | 执行者 |
|---|---|---|
| 末拍落位后必须停 30–45 帧再走 | `BEAT.EXIT_HOLD_MIN/MAX` | `exitPlan`（`plan.mjs:35-40`）夹紧 `settle_frames`；`scripts/verify-repair.mjs` 与 `verify-render-layer.mjs:120-124` 断言 |
| 离场动画：α = 1 − t^1.6，Δ = 440·(n/11)² | `exitDrop(n, 12)` | `SemanticShots.jsx:65`（整层包在离场 div 里）、`Primitives.jsx:581` |
| 入场帧不得晚于离场起点 | `exitAt` | `plan.mjs:426-429` 记 `beat-after-exit` |
| 离场前必须停住的**测量口径** | `MOTION.hold_min_frames = 30`、`hold_thr = 1.5`、`exit_brightness_k = 0.9`、`glow_off_frames = 6`（`src/visual/field.mjs:164-180`） | `scripts/motion_check.py` 报 `hold_too_short`；`export-visual-contracts.mjs:80` 断言 `hold_min_frames == CAMERA_LIMITS.clear` |

⚠ `glow_off_frames = 6` 的语义是「离场前先灭光这 6 帧算离场、不算 hold」。渲染侧没有先灭光（§1 `GLOW_OFF`），所以这条测量口径目前是按「亮度掉到 `exit_brightness_k`」间接生效的。

---

## 5. 运镜：词表只有一份，9 个名字都要有画面实现

**词表真源**：`src/visual/camera.mjs:82` `CAMERA_PRESETS = ['push','slow_push','slowPush','pull','pan','scroll','handoff','parallax','static','none']`。
**唯一查询入口**：`isCameraPreset(name)` / `cameraVocabulary()`（`camera.mjs:94-96`，按小写归一）。所有查表方——渲染层 `plan.mjs:388`、authored 门 `scripts/verify-authored-shots.mjs`、生产侧 lint `src/visual/grammar.mjs:19`——都必须走它。

> ⚠ 为什么不能写 `CAMERA_PRESETS.includes(presetName)`：渲染层把声明名 `toLowerCase()` 后查表，而表里留着驼峰项 `'slowPush'` → 归一成 `'slowpush'` 查不到 → 给一个**本来正确**的字段派整改项；同一份声明在 authored 门里用原样字符串查同一张表却判合法。`camera.mjs:84-93` 把这件事的因果写在了函数注释里，`verify-render-layer.mjs:81` 钉住「两个写法都必须在表内」。

### 5.1 名字 → 轨迹的映射（只写在 `cameraKeysFromPreset` 一处，`camera.mjs:146-177`）

| 声明名 | 轨迹 | 关键帧来源 | 备注 |
|---|---|---|---|
| `push` | 定点推近 | `CAMERA.push`，`s: 1 → min(1.4, 1.05 + amount×0.22)` | `camera.mjs:37-40` 的默认 `to=1.33` 是样片实测上限 |
| `pull` | 定点拉远 | `CAMERA.pull`，`s: min(1.4, 1.2 + amount×0.1) → 1` | |
| `pan` | 横向平移 | `CAMERA.pan`，`x0/x1` 随 `amount` 外扩，`s = 1.08 + amount×0.06` | |
| `scroll` | 纵向整页扫 | `CAMERA.scroll` + `scrollRange()`（`camera.mjs:129-135`）：只在**内容区**内扫，两端各留 60px | 取景基准仍是 `camCenterY` |
| `handoff` | 承接（右入中停） | `CAMERA.handoff`，默认 `x 980→640`，16 帧 | 词表里有名，authored 44 镜头里无人用 |
| `parallax` | 平缓横移 + 分层深度 | `CAMERA.pan(s=1.04)`，深度系数交给 `plan.camera.depths` → `ParallaxLayer` | `presetHasParallax()`（`camera.mjs:180`）只认这一个名字 |
| `slow_push` / `slowPush` | 1.0 → 1.05 慢推 | `CAMERA.slowPush`，45 帧 | 两种写法同一条轨迹 |
| `static` / `none` | **不运镜** | `staticKeys()`（`camera.mjs:188`）：单关键帧、`s=1`、对准内容区中心 | ⚠ 这两个名字必须是真实现。「没声明」才走兜底慢推；声明了 `static` 却退回慢推 = 词表里有一个名字是假的。`cameraKeysFromPreset:148`、`cameraKeysFromMotion:112`、`plan.mjs:391-392` 三处都拦了；`verify-render-layer.mjs:82, 91` 逐名验证「不运镜就不动」 |

### 5.2 硬约束

| 约束 | 值 / 出处 | 执行者 |
|---|---|---|
| 运镜长度 20–45 帧 | `CAMERA_LIMITS.min/max`（`camera.mjs:15`） | `cameraKeysFromPreset:155`、`cameraKeysFromMotion:119` 夹紧 |
| 运镜结束 ≤ 镜头末帧 − 30 | `CAMERA_LIMITS.clear = 30` | `camera.mjs:116-117`（太短直接不运镜）、`cameraSettlesBeforeExit`（`camera.mjs:220-227`）；`verify-render-layer.mjs:52, 95` |
| **镜头太短就不运镜，不硬塞** | `usable = duration − clear`，`usable < 20` 返回 `null` | `camera.mjs:113-117`、`148-150`；`verify-render-layer.mjs:64-66` 用 34 帧镜头钉住「兜底机位必须是静止的」 |
| 缩放上限 1.4 | `CAMERA_LIMITS.maxScale`（样片实测最大 1.33；box-shadow 与描边同样被放大） | `camera.mjs:125, 160, 162`；`verify-render-layer.mjs:53` |
| 相机对准**内容区中心**，不是画布中心 | `camCenterY(bands) = (contentTopNoRail + contentBottom)/2`（`camera.mjs:201-206`） | `verify-render-layer.mjs:58` 逐预设断言 `|last.y − camCenterY| ≤ 1` |
| `scroll` 取景不出内容区 | `scrollRange` 上下各留 20px | `verify-render-layer.mjs:56` |
| 位移必须让**所有元素留在 cameraSafe 内** | 声明在 `camera.mjs:10`，常量在 `src/visual/style.mjs:198`（x89–1191 / y122–607） | ⚠ **无执行者**。`cameraViewRect()`（`camera.mjs:212-217`）全仓库没有调用点（`Fx.jsx:310` 只是 re-export）；`cameraSafe` 也没有代码读，只被 `export-visual-contracts.mjs:120-121` 导出。而且它是硬编码的 16:9 数，不随 `logicalH` 缩放 |
| `slow_push` 兜底 | 无声明时 `slowPushKeys(1, len, bands)`；短镜头自动降级为 `staticKeys` | `plan.mjs:391-394`、`camera.mjs:191-197`；`verify-render-layer.mjs:70` |

### 5.3 `amount` 到底管什么

`amount` 是 **0–0.12 的位移强度**，`clamp01(amount / 0.12)` 归一后驱动 `len`、`pan` 的行程、`push/pull` 的目标缩放（`camera.mjs:118-125`、`153-170`）。

- **来源分工**（`plan.mjs:379-389`）：**预设名**取 authored 声明 `recipe.camera` → IR `scene.camera` → `motion[].preset`；**位移强度**始终取 IR 的 `motion[type==='camera'].amount`（缺省 0.06）。director 按解说密度算它，Repair 也会改写它。
- ⚠ 只有 `type === 'camera'` 的 `motion` 项有读者：`plan.mjs:378` 是 `motion.find(m => m.type === 'camera')`，`cameraKeysFromMotion` 还额外要求 `target === 'stage'`（`camera.mjs:108`）。`enter` / `transform` 预设与它们的 `amount` **写进 IR 也不会改变画面**——这正是 `motion_too_low` 不能算自动修复的原因（§8）。

### 5.4 视差

`PARALLAX` 实测速度 front 12.8 / mid 9.6 / back 6.4×0.43 px 帧，换算成相对系数 `PARALLAX_DEPTH = {front: 1.333…, mid: 1, back: 0.283…}`（`camera.mjs:63-74`）。渲染侧：`SceneContent` 只在 `plan.camera.depths` 存在时把描边层放进 `ParallaxLayer(depth=back)`、主角层放进 `ParallaxLayer(depth=front)`（`SemanticShots.jsx:216-231`）；**层不自己加动画**，位移一律由同一份相机 keys 的增量 `camDelta()`（`camera.mjs:99-104`）乘 `(depth − 1)` 得到——否则 QC 判的位移和画面看到的位移不是同一件事。`export-visual-contracts.mjs:89` 钉住 `PARALLAX_DEPTH.mid === 1`。

---

## 6. 高光时刻（set piece）的标准时序

真源：`src/visual/field.mjs:101-109` `SET_PIECE`。**只有一份**——`src/remotion/Fx.jsx:3, 371` 是 import + re-export，渲染层读的就是 field.mjs 那份（这条曾经有两份相同表，是本文档旧版点名的破口，现已合流）。

`setPiece(T0, T1)`（`Fx.jsx:372-380`）把常量摊成绝对帧：`T0` = 镜头清场帧（渲染层传 1），`T1` = `plan.subFrom`（主角节拍帧）。

| 事件 | 相对帧 | 锚 | 渲染点 |
|---|---|---|---|
| 三轮紫光横扫 `LightSweep` | `sweeps = [4, 22, 40]` | T0 | `SemanticShots.jsx:72`，`dy = pos.cy − 335` |
| 舞台线 `StageLine` | `line = 18` | T0 | `:73`；白闪帧 `flash = T1`，三帧 `[.95, .7, .35]`（`Fx.jsx:114`） |
| 幽灵字 `GhostText` | `ghost = 37` | T0 | `:74` → `GhostHero`（数字主角不画，`SemanticShots.jsx:92`），脉冲起撤掉 |
| 强调脉冲 `emphasisPulse` | `pulse = 12` | T1 | `:185` |
| 中文副标 slideUp | `sub = 16` | T1 | `HeroLayer` 的 `hero.sub`（`:256`，实际用 `subFrom + 16`） |
| 拆词/标签 SoftIn 错峰 | `pills = 24` | T1 | ⚠ 该键无渲染层读者（配角节拍走 §3 的 `beatFrames`） |
| 镜头最短帧数 | `minLen = 90` | — | ⚠ 无执行者，只在 `export-visual-contracts.mjs:85` 参与不变式 `SET_PIECE.minLen ≤ SHOT_MIN_FRAMES` |

---

## 7. 效果开关：声明入口与片级配额

声明入口（`src/shots/plan.mjs:341-355` `effectsOf`）合并 `scene.effects[]` + `recipe.effects[]` + `scene.fx{}` + `recipe.fx{}`，全部小写归一：

| 效果 | 认的写法 | 渲染点 | 配额执行者 |
|---|---|---|---|
| `glitch` | `fx.glitch` truthy 或 effects 含 `glitch` | `SemanticShots.jsx:253`（`FocusIn` 只包主角一层） | 结构上不可能有第 2 处；`GLITCH_PER_SHOT_MAX`（`style.mjs:162`）只被 `verify-render-layer.mjs:193` 断言常量本身 |
| `sweep` 三轮紫光 | `fx.sweep` / `lightsweep` / `sweep` | `:67, 72` | ✅ **两层硬上限**：装配层把白名单 `slice(0, SWEEP_WHITELIST_MAX)` 截到 2 条（`src/remotion/Root.jsx:51-52`），镜头侧再判「我在不在名单里」。名单来源 `timeline.fx.sweep_scenes` 或 `filmFx.sweepScenes` |
| `setPiece` | `fx.set_piece` / `fx.setPiece` / effects 含 `setpiece` / `recipe.highlight === true` | `:73-74` + 光环、脉冲联动 | ⚠ 无片级计数。`HIGHLIGHT_PER_CHAPTER_MAX`（`style.mjs:163`）只被 `verify-render-layer.mjs:194` 断言常量本身 |
| `halo` | `fx.halo` 或 setPiece | `:188-197, 206-208, 223-228`（`haloOn = plan.fx.halo \|\| plan.fx.setPiece`，`drawOn` 26 帧，前/后两层） | 生效。曾经这里渲染的是未声明标识符 `{halo}`，ESM 严格模式下直接 `ReferenceError`；现在由 `scripts/verify-jsx-symbols.mjs` 逐文件扫「JSX 裸表达式容器引用了未声明的名」并带沙箱端到端自测（`npm run verify:jsx-symbols`） |
| `pulse` | **只认显式** `fx.pulse === true` / effects 含 `pulse` / setPiece | `:185` | ⚠ 旧写法 `fx.pulse !== false` 缺省即开，导致每一镜主角都在 1→1.11→1 呼吸，最该被看出来的一句和其余十几句一样（`plan.mjs:350-353` 注释） |
| 每章运镜 ≥3 种 | `CAMERA_PER_CHAPTER_MIN`（`style.mjs:164`） | — | ⚠ **无任何代码读这个常量**，也不进 contracts。现状：44 个 authored 镜头按 `pan 15 / parallax 15 / push 14` 分布，每组 6 镜覆盖 3 个预设，但这只是巧合，不是被保证的 |

**现状（本次核实）**：44 个 authored 镜头文件（`src/shots/G1..G8/SC*.jsx`）**没有任何一个**声明 `fx:`、`effects:` 或 `highlight:`（逐文件检索命中 0），`camera` 声明 44/44 命中，`settle_frames` 44/44 = 30。所以全片扫光 0 处、set piece 0 处、glitch 0 处、脉冲 0 处——上面的配额目前都是「尚未用满」，不是「已用满」。

---

## 8. 动效类问题谁来修（整改路由）

判据来自测量层，路由来自两张表，两边由 `scripts/verify-repair.mjs` 双向对齐（每个 `FLAG_TOKENS` 有路由、每条路由有人报、`PIXEL_REPAIRS` 必须给 `fix`）。

| 令牌 | 报出者 | `ir` | 实际动作 |
|---|---|---|---|
| `motion_too_low` | `scripts/motion_check.py:225-230`（带 `classification` + `repair_hint`） | `false` | 一律 escalate。三档分类（真静 / 小面积动作 / 有动作）与 `repair_hint` **原样进 escalations 和 `repair_trace`**：改分镜时「补动词动作」和「剪短镜头/改运镜」是不同的动作，丢掉分类就等于把该回分镜的问题送去加大运镜 |
| `freeze` | `frame_metrics.py:337` | `false` | escalate：`add-verb-action-or-cut-in-storyboard` |
| `hold_too_short` | `motion_check.py:233` | `false` | escalate：`extend-hold-before-exit-or-merge-shots` |
| `beat-window-overflow` / `beat-after-exit` | `plan.mjs:424, 428` | `auto: false` | authored `f0` 写在 `src/shots/Gn/SCnn.jsx` 的 recipe 里，IR 表达不了 |
| `camera-unknown-preset` | `plan.mjs:408` | `auto: true` | ✅ 真改画面：把 IR 里的坏预设名换成词表内的名字（`REPAIR_ACTIONS`，`plan.mjs:486`） |
| `accent-overflow` | `plan.mjs:418` | `auto: true` | ✅ 真改画面：清掉 IR 里多余的 `elements[].active` |

> ⚠ `motion[].amount` 在 `type ≠ camera` 的项上**不是可修字段**：它在 IR 里有位置，但渲染层没有读者（§5.3）。以前修复器按 Python 分类放行「小面积动作」，把 `amount` 0.04→0.075 并记成一次画面改动——重渲染后画面逐像素相同，报告却写着「修过了」，`repair-cycle` 白烧一轮。现在 `PIXEL_REPAIRS.motion_too_low = {ir: false}`，`scripts/verify-repair.mjs` 会直接断言「三类分类都不许产生 `changed_nodes`」。判据：**一个改动算不算修复，看它改的字段渲染层读不读**，不看报告里写了什么。

---

## 9. 死表：导出了但没人调用

`src/visual/easing.mjs` 的 17 个零调用导出（对 `src/`、`scripts/` 全量检索，除 `easing.mjs` 自身外命中 0）：

`lerp`、`expOut`、`powIn`、`easeOutCubic`、`easeInOutCubic`、`easeOutQuad`、`cubicBezier`、`BEZ_SCALE_IN`、`stepHold`、`stepKf`、`softIn`、`firstOp`、`exitFade`、`exitRise`、`stagger`、`typedCount`、`beatN`

（`cubicBezier` 只被同为死项的 `BEZ_SCALE_IN` 用到，等于一起死。）

其他没读者的动效相关键：`BEAT.FADE_OUT`、`BEAT.GLITCH_IN`、`BEAT.SLIDE_UP`、`BEAT.LATERAL`、`BEAT.SCALE_IN`、`BEAT.TYPEWRITER_PER_CHAR`、`BEAT.GLOW_ON`、`BEAT.GLOW_OFF`、`BEAT.STILL_MAX_FRAMES`、`SET_PIECE.pills`、`SET_PIECE.minLen`、`CAMERA_PER_CHAPTER_MIN`、`cameraViewRect`、`glowOuterRadius`、`qcZoneWithRail`、IR 里 `motion[].preset/amount`（`enter` / `transform` 两类）、`src/visual/motion.mjs` 的 `MOTION_PRIMITIVES`（`lintMotion` 有 `scripts/verify-visual.mjs` 调用，但没用到这张表）、`src/visual/field.mjs` 的 `SATURATION`（不进 contracts，Python 侧 `vision.sat_row` 自己实现同一条公式）。

**这些键不是「等等就会生效」**：要么删掉，要么显式标成「分镜写作要求，改它不动画面」。想留就要给出读者，否则它就是下一个假门禁。

---

## 10. 确定性

画面层禁用 `Math.random()`、`new Date()`、`Date.now()`——同一帧每次渲染不同会让 QC 复测和视觉回归全部失去意义。

- 唯一允许伪随机处：`rnd(...seeds)`（`src/visual/easing.mjs:111-121`，FNV 风格整数哈希，同输入同输出）。
- 执行者：`scripts/verify-render-layer.mjs:211-232` 逐文件扫 `src/remotion`、`src/shots`、`src/visual`（剥掉注释行后匹配），命中即 FAIL；`scripts/verify-authored-shots.mjs:27-31` 对每个镜头源文件再扫一遍。
- ⚠ `clock` 是 `KNOWN_ICONS` 里注册过的**图标名**（`plan.mjs:67`），与本禁令无关，分镜里可以照常用。

---

## 可核对规则

1. 镜头内帧号一律 1-based：`N = useCurrentFrame() + 1`，`len = round(duration × fps)` —— `src/shots/SemanticShots.jsx:59` + `src/shots/plan.mjs:26-29`。
2. 全仓库只有一张帧预算表 `BEAT`，但只有 `SOFT_IN`/`STAGGER`/`DRAW_ON`/`COUNTER`/`EXIT_HOLD_MIN`/`EXIT_HOLD_MAX`/`EXIT_ACCEL_P` 被渲染层读到；分镜里写「淡入 20 帧」不会生效 —— `src/visual/easing.mjs:124-145` 对照 §1 的读取列。
3. 配角与主角灯的淡入用 `softOp`（起点 25%）而不是 `fadeIn(0)=0`，否则首帧被测量层判成无内容进而判空场 —— `src/visual/easing.mjs:151-160` + `src/visual/field.mjs:131`。
4. 元素入场帧相对**它自己那条字幕块**必须落在 −6…+3，逐件错峰 2 帧，每块最多 4 件 —— `src/visual/style.mjs:160` + `src/shots/plan.mjs:278-310`，违规令牌 `beat-window-overflow`（`plan.mjs:424`），不可自修。
5. 主角入场帧不写死 1：`hero.f0 = max(1, subFrom − 4)` —— `src/shots/plan.mjs:410`，断言在 `scripts/verify-render-layer.mjs:163`。
6. 末拍落位后停 30–45 帧再离场，且任何入场帧不得晚于 `exitAt` —— `src/shots/plan.mjs:35-40`、`:426-429`。
7. 相机名只有一个真源集合，查表必须走 `isCameraPreset()`/`cameraVocabulary()`，`slowPush` 与 `slow_push` 归一后等价 —— `src/visual/camera.mjs:82-96`，同源门在 `scripts/verify-render-layer.mjs:75-111`（§2b）。
8. 词表 9 名都有画面实现；`static`/`none` 必须产生**不动**的相机，「没声明」才退回 1.0→1.05 慢推 —— `src/visual/camera.mjs:148, 188-197` + `src/shots/plan.mjs:391-394`。
9. 镜头短到 `duration − 30 < 20` 就不运镜（返回静止机位），绝不把运镜压缩进末拍 —— `src/visual/camera.mjs:113-117, 148-150`，夹具在 `scripts/verify-render-layer.mjs:64-66`。
10. 缩放上限 1.4、相机对准内容区中心 `(contentTopNoRail + contentBottom)/2`、`scroll` 只在内容区内扫且两端留 20px —— `src/visual/camera.mjs:15, 129-135, 201-206`。
11. 「所有元素留在 cameraSafe 内」目前无执行者：`cameraViewRect()` 零调用、`cameraSafe` 零读者且是硬编码 16:9 数 —— `src/visual/camera.mjs:10, 212-217` 对照全仓检索。
12. `amount` 是 0–0.12 的位移强度，归一后驱动长度与行程；预设名取 authored→IR→`motion.preset`，强度始终取 IR —— `src/visual/camera.mjs:118-125` + `src/shots/plan.mjs:379-389`。
13. 只有 `type === 'camera'`（且 `target === 'stage'`）的 motion 项有读者；`enter`/`transform` 的 preset 与 amount 写进 IR 不改画面 —— `src/shots/plan.mjs:378` + `src/visual/camera.mjs:108`。
14. 视差只在声明 `parallax` 时启用，位移由同一份相机 keys 的增量乘 `(depth − 1)`，层不自己加动画 —— `src/visual/camera.mjs:63-74, 180` + `src/shots/SemanticShots.jsx:216-231`。
15. 高光时刻时序表只有一份 `SET_PIECE`，`Fx.jsx` 是 re-export；`T0` 是清场帧、`T1 = plan.subFrom` —— `src/visual/field.mjs:101-109` + `src/remotion/Fx.jsx:3, 371-380`。
16. 全片扫光硬上限 2 处：装配层截断白名单 + 镜头侧自查名单 —— `src/visual/style.mjs:161` + `src/remotion/Root.jsx:51-52` + `src/shots/SemanticShots.jsx:67`。
17. 强调脉冲不是每镜头默认动作，只认 `fx.pulse === true` / effects 含 `pulse` / 登场型高光 —— `src/shots/plan.mjs:347-354`。
18. `fx.halo` 现在是真开关：光环分前后两层，setPiece 时按舞台线帧起，否则第 8 帧起 —— `src/shots/plan.mjs:346` + `src/shots/SemanticShots.jsx:188-197`，坏在曾经的 `{halo}` 未声明引用已由 `scripts/verify-jsx-symbols.mjs` 拦住。
19. `motion_too_low` 不是自动修复：三档分类与 `repair_hint` 全部 escalate 回分镜，任何 `changed_nodes` 都算回归 —— `src/repair/engine.mjs` 的 `PIXEL_REPAIRS` + `scripts/verify-repair.mjs`。
20. 44 个 authored 镜头零 `fx/effects/highlight` 声明、44/44 `settle_frames:30`、`camera` 分布 `pan 15 / parallax 15 / push 14` —— 逐文件检索 `src/shots/G*/SC*.jsx`。
21. 17 个 easing 导出与 §9 列出的动效键都没有读者，不是「等会生效」的能力 —— 对 `src/`、`scripts/` 全量检索命中 0。
22. 渲染层禁用随机数与墙上时钟，抖动只能用 `rnd(...seeds)`，两道门分别扫三个目录与每个镜头源文件 —— `scripts/verify-render-layer.mjs:211-232` + `scripts/verify-authored-shots.mjs:27-31`。
23. 每章运镜 ≥3 只有常量，没有任何计数者 —— `src/visual/style.mjs:164` 对照全仓检索。
