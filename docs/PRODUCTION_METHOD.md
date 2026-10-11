# 完整生产方法

> **临时运行模式（2026-10-11）**：GitHub Actions CI 工作流已移除。当前只注册、渲染、QC、Repair 和交付 16:9；9:16 暂停，关联 IR 保留但不参与当前放行。

> 本文记录 reel-forge 的**每一个生产阶段**：输入、输出、执行机制、判断标准、失败路径、验证方法。
> 与 [ARCHITECTURE.md](ARCHITECTURE.md) 的分工：架构文档讲「系统长什么样、谁调谁」，本文讲「每个阶段怎么做、怎么算过、卡住了怎么办」。
>
> 一键入口是 `npm run skill -- "<TOPIC>" --source <URL> …`（[scripts/skill.mjs](../scripts/skill.mjs)）。它会按本文顺序推进，
> 在四个人工确认点（`length-language` / `narration-signoff` / `voiceover` / `pilot-preview`）停下等审批。
> 阶段常量真源：[src/pipeline/stages.mjs](../src/pipeline/stages.mjs)（`scaffold → research → narration → storyboard → primitives → pilot → parallel-build → render → qc → repair → delivery`）。

---

## 0. 一次性前置：环境与 scaffold

| 项 | 内容 |
|---|---|
| 输入 | 主题 + 来源 URL + 语言 + 目标时长 + 画幅（当前默认 `16:9`；9:16 暂停） |
| 输出 | `fixtures/project.json`（作者源）、Remotion Composition（仅 16:9） |
| 执行机制 | `npm install`；`scripts/skill.mjs` 写 `project.json`；[src/remotion/Root.jsx](../src/remotion/Root.jsx) 注册 16:9 Composition |
| 判断标准 | `project_id` 一致、`duration ≥ 5`、`source` 非空（首跑）；Node 22 / Python 3.11 / **完整版 FFmpeg**（精简构建跑不了 `npm run tts`） |
| 失败路径 | 缺 source → 直接抛错；`_notice` 类环境缺失 → `verify:env` 报出 |
| 验证方法 | `npm run verify:env`、`npm run verify:runtime`、`npm run verify:build` |

---

## 1. Research

| 项 | 内容 |
|---|---|
| 输入 | `fixtures/project.json` 的 `request` + `source_urls` |
| 输出 | `artifacts/<pid>/research.json`（claims 带 source）、`research.md`、`artifacts/<pid>/script.json` |
| 执行机制 | [scripts/run-production.mjs](../scripts/run-production.mjs) 调 [src/providers/research/](../src/providers/research/) 抓取；[src/research/claim-graph](../src/research/) 建 claim 图；**指令过滤门先于生产**（[verify-instruction-filter.mjs](../scripts/verify-instruction-filter.mjs)）—— 注入句子一旦进了 `research.json` 就成了下游所有环节的"事实" |
| 判断标准 | 每条 claim 必须挂 source；抓回文本里的**指令性句子**（"忽略以上""执行…"）必须被过滤，不进 claims |
| 失败路径 | 抓不到 → provider 报错，链停；过滤门 RED → 生产不启动 |
| 验证方法 | `npm run verify:research`（联网，不在 fast）、`npm run verify:instruction-filter`（fast：9 正 / 5 负 / 16 判定） |

---

## 2. Narration

| 项 | 内容 |
|---|---|
| 输入 | `script.json` 的 `segments`（句 / 段，1:1 于镜头） |
| 输出 | `script/narration.txt`（4 章 44 段）、`script/storyboard_src.md` 骨架 |
| 执行机制 | `skill.mjs` 把 `segments[].text` 逐行写成 `narration.txt`；段落 = 画面单元 |
| 判断标准 | 段落数与句数一致；每块字幕中文 **≤16 字**（超出必须回 `narration.txt` 调 `|` 切分，不是缩字号硬塞） |
| 失败路径 | 字幕超预算 → `verify:subtitle-budget` RED；段落/句数错配 → `verify:plan` / `verify:narrative` RED |
| 验证方法 | `npm run verify:plan`、`npm run verify:narrative`、`npm run verify:subtitle-budget` |

---

## 3. TTS

| 项 | 内容 |
|---|---|
| 输入 | `script/narration.txt` |
| 输出 | `public/audio.wav`（两遍峰值归一至 0.89 + `pcm_s16le`）；每句缓存 `cache_key.json` |
| 执行机制 | [scripts/tts_build.mjs](../scripts/tts_build.mjs)：edge-tts / kokoro / piper / kokoro_onnx / 用户 wav 五通道 dispatch；edge 通道串行 + 最多 6 次退避重试；`cache_key` 区分文本/语速 |
| 判断标准 | 逐词时间轴（WordBoundary）必须完整；换词必须换 wav（缓存按文本+语速区分）；坏输出（无逐词轴 / 空轴 / 无音频路径 / 非 JSON）必须被拒 |
| 失败路径 | 引擎参数错 / 限流 / 语言字段与实际字符集不符（`project.language` 写成 `en` 而解说词是中文 → edge 每句 `NoAudioReceived`）→ `verify:language` 在合成前拦下 |
| 验证方法 | `npm run verify:tts-native`（stub 真跑 dispatch + 4 类坏输出拒绝）、`npm run verify:tts-parity`、`npm run verify:language`、`npm run verify:word-boundary` |

---

## 4. Timeline（唯一时间基准）

| 项 | 内容 |
|---|---|
| 输入 | 音频 + WordBoundary |
| 输出 | `script/timeline.json`（`sentences[].{id,chapter,from,to,subs}`，帧号 1-based）、`fixtures/captions.json` |
| 执行机制 | `tts_build.mjs` 解出句级帧号；`npm run sync-script` 把自动分组字幕**按句内对齐重写**（少了这步字幕会跨句界） |
| 判断标准 | 镜区间、字幕块、HUD、流程轨、章卡**全部**由「句 id → 帧号」派生；镜区间 = `[本句 from − SHOT_LEAD(8), 同章下一句 from − 9]`，章末/片末 = `末句 to + SHOT_TAIL(2)` |
| 失败路径 | 没跑 TTS → 无真源；`sync-script` 漏跑 → 字幕跨句界 → `verify:timeline-source` RED（"字幕块不落在任何句子区间内"） |
| 验证方法 | `npm run verify:timeline-source`（镜数==句数、镜区间由 timeline + SHOT_LEAD/SHOT_TAIL 派生、字幕落句内、末端漂移 == SHOT_TAIL、rails 解帧与窗口冲突）、`npm run verify:asr` |

> ⚠ 真源纪律：`script/timeline.json` 是**唯一**时间基准。历史事故是仓库里有三份互不引用的时序数据（IR / captions / timeline），
> 结果成片比配音短 186 秒而没有任何门发现 —— 因为**没有第二个真源跟它 disagreement**。`verify:timeline-source` 就是把"同源"变成可执行断言的那道门。

---

## 5. Storyboard

| 项 | 内容 |
|---|---|
| 输入 | `script/storyboard_src.md`（令牌）+ `script/timeline.json` |
| 输出 | `分镜表.md`（真实帧号）、`artifacts/<pid>/storyboard.md` |
| 执行机制 | `npm run storyboard`（[render_storyboard.py](../scripts/render_storyboard.py)）把 `{Sxx.from}–{Sxx.to}` 换成真实帧号；`npm run selfcheck` 判合规；`storyboard:gen` 从 IR 生成人可读表 |
| 判断标准 | 每镜 ≥120 帧、`hold: ≥30`；`continuous:` / `hold:` 标签必须存在；闪烁/扫光效果必须在白名单里才允许 |
| 失败路径 | 帧数不足 / 缺标签 / 效果未登记 → `selfcheck` 非零；表与 IR 漂移 → `verify:storyboard` RED |
| 验证方法 | `npm run verify:storyboard`（14 用例逐条变异）、`npm run selfcheck` |

---

## 6. Visual Language（图元 / 语法 / 镜头源）

| 项 | 内容 |
|---|---|
| 输入 | IR 的 `variant / topology / composition / light / motion`；视觉常量 |
| 输出 | `src/shots/G1..G8/SC*.jsx`（44 镜，每镜一份源码）、`src/shots/stage-kit.jsx`（共用拓扑）、`registry.jsx` |
| 执行机制 | `npm run build-groups`（8 组）→ `npm run materialize-shots` → `registry.jsx`；共用拓扑抽成一份 kit，避免八份 `focusWalk` 各自漂移 |
| 判断标准 | 44 镜全部 authored / 8 组 / ≥17 种拓扑 / 单一拓扑占比 ≤9.1%；每镜有独立 `SHOT_RECIPE`、variant、hero size、camera、settle ≥ 30 帧；字号下限钳 `max(22, size*0.78)`；**紫只给当前重点** |
| 失败路径 | 用了本文件没有的名（`{halo}`）→ ReferenceError（44 镜全黑而语法门全绿）→ `verify:jsx-symbols`；wrapper 内外重复写绝对坐标 → `verify:relative-coords`；镜头字段与蓝图不一致 → `verify:authored-shots` |
| 验证方法 | `npm run verify:authored-shots`、`npm run verify:shots`、`npm run verify:shot-score`、`verify:jsx-symbols`、`verify:relative-coords`、`verify:visual`、`verify:visual-contracts`、`verify:visual-grammar`、`verify:still-benchmark` |

---

## 7. Pilot / Preview

| 项 | 内容 |
|---|---|
| 输入 | 已渲染的前 30 秒（`render-preview`） |
| 输出 | `artifacts/<pid>/preview/*`、pilot 审批记录 |
| 执行机制 | `npm run preview` → `npm run pilot` → checkpoint `pilot-preview`（**硬门禁**，未审批不进全片渲染） |
| 判断标准 | 风格 / 字号 / 语速 / 节奏确认；`pilot.mjs` 的判据全过 |
| 失败路径 | 审批不通过 → checkpoint 保持 pending，`skill.mjs` 停在确认点、保留 workspace，等 `--resume` |
| 验证方法 | `npm run verify:approval`、`npm run verify:scheduler` |

---

## 8. Parallel Build

| 项 | 内容 |
|---|---|
| 输入 | 分组蓝图 + 44 镜 recipe |
| 输出 | 各组镜头源码、`fixtures/build-groups.json`、`still-manifest.json` |
| 执行机制 | `build-groups.mjs`（8 组）+ scheduler / pool 并行；build-agent 按 `buildTaskBrief` 拿任务 |
| 判断标准 | 分组数与 still 数量符合真源（基础 6 / 高光 ≥10 / 44 镜）；四类问题（无 `stage.kind`、组内同拓扑、`components` 映射缺镜、声明了不传 `stage`）一律 FAIL |
| 失败路径 | 分组常量被写死 → `verify:limits` RED；镜头漏进蓝图 → `verify:authored-shots` RED |
| 验证方法 | `npm run verify:limits`、`npm run verify:shots`、`npm run verify:scheduler`、`npm run verify:still-benchmark` |

---

## 9. Render

| 项 | 内容 |
|---|---|
| 输入 | `fixtures/render-ir-{16x9,9x16}.json` + `public/audio.wav` |
| 输出 | `artifacts/render/reel-forge-16x9.mp4`、`artifacts/frames/16x9/f_%04d.png`、`artifacts/deliver/sheet-*.html`（成片缩略总表） |
| 执行机制 | [scripts/render.sh](../scripts/render.sh)：Remotion 单比例渲染（16:9，1280×720@30fps H.264 crf16 + AAC）→ 抽帧 → `sheet-gen` 绑字幕（**QC 通读全片第一入口**） |
| 判断标准 | 帧数 = `ceil(duration×fps)`；离场动画结束在镜头末帧；`perf:probe` 30 帧测渲 ≥3fps |
| 失败路径 | 重口味效果拖慢渲染 10–50 倍 → `perf:probe` RED；IR 与 timeline 不同源 → 音画不同步（属于第 4 阶段的门，应在渲染前拦下） |
| 验证方法 | `npm run perf:probe`、`npm run verify:render-layer`、`npm run verify:footage` |

> ⚠ 顺序坑：直接跑 `render.sh` 不会生成 `plan_audit.json`，`qc` 会报 `plan_audit_missing` —— 必须先 `npm run plan-audit`。

---

## 10. QC

| 项 | 内容 |
|---|---|
| 输入 | 16:9 mp4 + 帧 + IR + `plan_audit.json` + `text_provenance` |
| 输出 | `qc/{frame_metrics,motion,visual_regression,text_provenance,plan_audit}.json`、`qc/report.json`（含 `input_fingerprint`）、`qc/report.md` |
| 执行机制 | `npm run plan-audit`（分镜合规，缺失即阻断）→ 三个 python 测量脚本 → `npm run contact-sheet`（计划帧 ↔ 盘上真图对账，给 qc-agent 图像通道）→ `npm run qc`（汇总 issues / warnings / agent 复核） |
| 判断标准 | **测量覆盖度**：量到的镜头集必须 == IR 镜头集、区间不得漂移（缺测量文件即阻断，不再静默 `continue`）；frame_metrics / motion `status==PASS`；visual_regression 必须 `advisory`；`text_provenance==PASS` |
| 失败路径 | 4 镜旧产物配 44 镜新 IR → 覆盖度断言拦下（"测量覆盖不足"）；`plan_audit` 缺失 → `plan_audit_missing`（阻断） |
| 验证方法 | `npm run verify:qc`、`npm run verify:measure:quick`、`npm run test:measurement`（合成帧自检，含 hold 反例）、`npm run verify:visual-regression`、`npm run verify:text-provenance` |

**测量层口径**（阈值真源 [src/visual/field.mjs](../src/visual/field.mjs) → `fixtures/visual_contracts.json`，脚本不内联阈值）：
`hold` = 落位后**无大面积变化**（< `hold_thr`）的连续帧数，判据 ≥ `hold_min_frames`；离场前先灭光的帧、以及有上限的高变化离场帧已从 hold 里扣掉。

---

## 11. Repair

| 项 | 内容 |
|---|---|
| 输入 | `qc/report.json` 的 issues / warnings |
| 输出 | `repair/{status,repair-plan,source-repair}.json`、必要时 `rerender` hook |
| 执行机制 | [src/qc/flags.mjs](../src/qc/flags.mjs) 把 flag token 翻译成 issue（决定往哪动手）→ [src/repair/engine.mjs](../src/repair/engine.mjs) 按 node/ratio 分级路由 → [scripts/repair.mjs](../scripts/repair.mjs) / [repair-cycle.mjs](../scripts/repair-cycle.mjs) 执行 |
| 判断标准 | `status ∈ {patched, not-needed}`；`source-repair.json` 必须记录**改了什么源码** —— 杜绝"只改报告状态、不改画面"的假通过 |
| 失败路径 | 标记 patched 却没写 `source-repair` 条目 → `verify:production` RED（`source repair audit malformed`） |
| 验证方法 | `npm run verify:repair`（pixel + storyboard 分类 + 记账链真跑） |

---

## 12. Recheck

| 项 | 内容 |
|---|---|
| 输入 | repair 后的帧 / IR |
| 输出 | 二轮 QC 产物 |
| 执行机制 | `repair-cycle.mjs` 在 scoped repair 后重跑测量与 QC；`plan-audit` 软跑（审计非零不终止生产链，交给 repair 消化） |
| 判断标准 | 修复后 QC 必须回到 PASS；scoped（只重渲受影响镜头，不是全片重来） |
| 失败路径 | 修完仍 RED → 有限次数内继续，或按 needs_source 转人工 |
| 验证方法 | `npm run verify:qc`、`npm run verify:repair` |

---

## 13. Delivery

| 项 | 内容 |
|---|---|
| 输入 | 全部上游产物 |
| 输出 | `artifacts/delivery/<pid>/`（成片 + manifest）、`delivery-manifest.json`（逐文件 sha256 + size） |
| 执行机制 | [scripts/deliver.mjs](../scripts/deliver.mjs) + [src/delivery/package.mjs](../src/delivery/package.mjs)；[src/release/fingerprint.mjs](../src/release/fingerprint.mjs) 算输入指纹 |
| 判断标准 | 交付件齐全且 sha256/size 与 manifest 一致；`metadata.qc_status == PASS`；`verify:production` 全过 |
| 失败路径 | 交付件缺失 / 校验和不符 → `verify:production` RED；**产物过期**（QC 记的 `input_fingerprint` ≠ 当前 `releaseFingerprint()`）→ RED（"产物已过期：重跑 render → QC → repair → delivery"） |
| 验证方法 | `npm run verify:delivery`、`npm run verify:production` |

> **完成定义**：`verify:fast PASS` **不等于** `Production PASS`。当前临时模式要求 16:9 成片 + 对应 QC 产物 + repair 记账 +
> tts-word-boundary + delivery checksum，并且 `verify:production` 在**当前输入指纹**下通过，才叫生产完成。

---

## 附：三人门的强度对照

| 门 | 需要运行产物 | 判什么 | 绿色意味着 |
|---|---|---|---|
| `verify:fast`（36 项，~7s） | 否 | 契约、源码自洽、分组公式、镜头拓扑、字幕预算、TTS dispatch、溯源字面量、画面语法 | 链路完整、结构自洽（**不代表成片达标**） |
| `verify:production` | 是（mp4 + 全套 QC） | 媒体属性 + 覆盖度 + 阻断门 + `input_fingerprint` 比对 + 交付完整性 | 这份产物对应当前输入，且该量的都量了 |
| `perf:probe` | 30 帧测渲 | ≥3fps | 渲染不会慢到不可用 |