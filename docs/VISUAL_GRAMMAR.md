# 视觉语法与质量基线（索引页）

> 这一页**不是真源**，只是一张「规则 → 谁在执行」的入口表。任何一条规则的细节、常量、行号都在 `docs/knowledge/` 那三篇里；这里只写「这条现在有没有机器执行者、执行到哪一步」，以免同一个规则出现第四份说法。
>
> 真源分工：**空间与光** → [`knowledge/composition-and-light.md`](knowledge/composition-and-light.md)；**帧号、节拍、运镜、效果开关与修复路由** → [`knowledge/motion-vocabulary.md`](knowledge/motion-vocabulary.md)；**颜色、字号、字体、画面文案准入** → [`knowledge/style-guide.md`](knowledge/style-guide.md)；生产顺序与人工确认点 → [`../SKILL.md`](../SKILL.md)。

## 1. 镜头语法（每个 beat 必须具备什么）

| 规则 | 执行状态 | 执行者 |
|---|---|---|
| 主角存在、尺寸至少 `large` | ✅ 生产侧 lint | `HERO_SIZES = {large, xlarge}` + `beat:hero-too-small`（`src/visual/grammar.mjs:20, 32`）。⚠ `hero.size` 本身**渲染层不读**，画面主角尺度只由 `hero_size`（px）决定 → `composition-and-light.md` §5 |
| 可识别的视觉意图（`asset_need`） | ⚠ 只有 lint | `beat:missing-visual-intent`（`grammar.mjs:37`）；`asset_need` 无渲染读者（`grammar.mjs:14-17` 已点名） |
| 状态变化 `enter → transform → settle` | ⚠ 只有 lint | `MOTION_STATES` 三缺一即报（`grammar.mjs:21, 35`）；`state_change` 无渲染读者 |
| 真实运镜类型 | ✅ 同源词表 | 词表只有渲染层那一份：`CAMERA_PRESETS`（`src/visual/camera.mjs:82`）= `push / slow_push / slowPush / pull / pan / scroll / handoff / parallax / static / none`，查表一律走 `isCameraPreset()`（`:95`）。**旧版这一页写的 `push/pan/slide/parallax/orbit/zoom` 是错的**：`slide`/`orbit`/`zoom` 渲染层没有实现，写了只会被 `plan` 判成 `camera-unknown-preset` 或静默退化成慢推。`static`/`none` 是「显式不运镜」，与「没声明才走兜底慢推」不同 → `motion-vocabulary.md` §5 |
| 正值运镜幅度 | ✅ 两道 | lint `camera-motion-missing`（`grammar.mjs:32`）+ 帧数与末拍约束在 `scripts/verify-render-layer.mjs:44-73`（结束帧 ≤ `len − CAMERA_LIMITS.clear`、推近 ≤ `maxScale`、`scroll` 取景不越内容区） |
| ≥4 秒的画面单元 | ⚠ 半 | lint `minDuration = 4`（秒，`grammar.mjs:26` 参数默认值、`:36` 判定）；`SHOT_MIN_FRAMES = 120` 这个常量本身只参与 contracts 不变式 → `style-guide.md` §10 |

## 2. 持续动作与稳定期

| 规则 | 执行状态 | 执行者 |
|---|---|---|
| 入场后不得 >3 秒无变化 | ✅ 已下沉到像素 | `MOTION.still_max_seconds = 3.0` → `frame_metrics.py` 报 `freeze`（medium，阻断）；逐镜头节奏另由 `motion_check.py` 报 `motion_too_low`，**并附三分类**（真静 / 小面积动作 / 有动作）+ `repair_hint` → `composition-and-light.md` §8.4 |
| 末拍 ≥30 帧稳定期 | ✅ | `MOTION.hold_min_frames`，且 `export-visual-contracts.mjs:80` 断言它 `== CAMERA_LIMITS.clear`；违规报 `hold_too_short`（medium）。⚠ 它的建议是「离场/前挂末拍/并镜头」，**不是「加动作」** |
| 运镜结束后才进稳定期 | ✅ | `cameraSettlesBeforeExit()`（`src/visual/camera.mjs:220-227`），在 `verify-render-layer.mjs:60, 95` 逐预设断言 |
| Glitch / LightSweep 白名单与次数 | ⚠ 只有扫光是硬上限 | `Root.jsx:52` 把白名单截到 `SWEEP_WHITELIST_MAX`；glitch/高光/每章运镜三行的「门」只比对常量自身（恒真）→ `motion-vocabulary.md` §7 |
| 字幕与 HUD 用公共层 | ✅ 结构上如此 | 只有 `Primitives.jsx` 的 `Subtitle` / `Hud` / `ProgressBar` 被 `Root.jsx:76-79` 装配，镜头源码不画它们 |

## 3. 构图与光（一句话 + 指针）

黑底幕底、主角独占柔光、紫只给当前重点、单一焦点——这四条的**数值与执行者**在 `composition-and-light.md` §3（`composition.focus` 两档宽）、§6（`accent-overflow` 降级）、§7（全片唯一的 glow 调用点）、§1（band）。跨章承接是**分镜写作要求**，无执行者。

## 4. 事实与叙事

| 规则 | 执行者 |
|---|---|
| 画面数字/术语/组织名必须有出处 | `scripts/verify-text-provenance.mjs`（阻断；`verify-production.mjs` 要求它 PASS）→ `style-guide.md` §8 |
| Narration / Storyboard / RenderIR 同一时间轴 | `scripts/verify-contracts.mjs`、`scripts/verify-timeline.mjs`、`scripts/verify-storyboard.mjs`；镜头帧号口径见 `motion-vocabulary.md` §0 |
| 真实音频 / WordBoundary 是时间基准 | `scripts/verify-word-boundary.mjs`、`scripts/verify-asr.mjs`。⚠ 需要网络 TTS 的这几道在当前授权（只写实现、不执行生产）下打印 `skip`，未跑通 |

## 5. 自动验收怎么跑

日常一条命令：`npm run verify:fast`（把下面这些门串起来，含沙箱自检）。逐项：

| 命令 | 管什么 |
|---|---|
| `verify:visual-grammar` | beat 层 lint（§1 那六行的生产侧） |
| `verify:visual` | motion lint（`MOTION_PRIMITIVES` 词汇与 PPT 式动作） |
| `verify:render-layer` | 相机 / 节拍 / 离场 / authored fixture / 确定性（源码禁 `Math.random`、禁墙上时钟） |
| `verify:authored-shots` | authored recipe：必需键、引擎不读的键（假开关）、variant 反解渲染层 case 集合、`hero_size`、`settle_frames`、`accent_index`、与 blueprint 逐字段一致、盘上无孤儿镜头 |
| `verify:visual-contracts` / `export-visual-contracts` | 视觉常量 → `fixtures/visual_contracts.json` 的一致性；测量层只读这份 JSON |
| `verify:measure` | 用合成 PNG **真跑**测量脚本，证明判据不是写在 Python 里的第二套数 |
| `verify:jsx-symbols` | JSX 里「裸表达式容器引用本文件未声明的名」这类 `ReferenceError`（`node --check` 抓不到） |
| `verify:repair` / `verify:plan` | 修复路由是否为真改 IR、文档与代码是否同源 |
| `verify:text-provenance` | 画面文案可溯源 |
| `verify:limits` | 分组与 still 数量的真源（`src/build/limits.mjs`）：A 真源自算、B 两种分组算法 9408 格对账、C 八个调用点禁本地字面量且必须真的调用取值函数、D 采样点数与 `STILL_FRAMES_PER_SCENE` 一致、E 高光 still 下限（`SHOT_RECIPE.highlight === true` → ≥10，用临时假镜头文件跑）→ `agent-protocol.md` §3.1、§4 |
| `verify:reference-sample` | 参考片蓝图自洽：`shot_count`/`group_count` 与 `shots[]` 逐项一致、每条 `group` 等于分组公式、每组条数等于公式期望、`settle_frames` 与 `still_kinds` 跟着常量走 |
| `verify:qc` / `verify:delivery` / `verify:production` / `verify:e2e` | 需要真实渲染产物；当前命名缺失工件（`artifacts/render/*.mp4`、delivery manifest、`research.json`、`script/timeline.json`）而失败 |

> ⚠ 本仓库当前的授权是「先不执行，只写实现」：没有 `npm install`、没有网络 TTS、没有渲染。所以**所有 `.jsx` 的逻辑与本文引用的 JSX 行号只经过阅读核实，未经执行验证**；能跑的只有纯 node 门与纯标准库 Python（`verify:fast` 29/29 PASS）。
