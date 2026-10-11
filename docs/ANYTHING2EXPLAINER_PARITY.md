# anything2explainer 能力对照表

> 真源位置：`/Users/juxiu/Desktop/github/anything2explainer`。参照片的**工程真源**在 `template/`（脚本 `scripts/*.py|sh`、
> 渲染 `src/*.tsx`），**样片产物**在 `examples/rag/`（`分镜表.md`、`交付说明.md`、`qc/`、`frames/`）。
>
> 本页是**阶段 / 能力级对照**：每条列出「参照片功能 → 源代码证据 → 本仓库对应实现 → 差距与补齐方式 → 当前状态 → 测试证据」。
> 更细的 40 项能力级逐条表（ID / 证据 / 状态 / 验证方法）在 [`.trae/documents/a2e-creation-gap.md`](../.trae/documents/a2e-creation-gap.md) A–I 节，
> 两者**不重复列项**：本文管「阶段对齐」，那份管「能力缺口」。
>
> 记录口径：状态只写**实测**结果。`npm run verify:fast` = **36/36 PASS**（2026-10-11）。
> 生产门 `verify:production` 已于 2026-10-11 实测 **PASS**（`ACCEPT_RATIOS=16x9`；全链重渲→测量→QC→repair→deliver→生产门，
> 见 `docs/ACCEPTANCE_REPORT.md` §2/§4。9:16 按用户决策在验收范围外、照跑照记）。

---

## 1. 阶段级对照

| 参照片阶段/能力 | a2e 源代码证据 | reel-forge 对应实现 | 差距 / 补齐方式 | 状态 | 测试证据 |
|---|---|---|---|---|---|
| Scaffold | `template/package.json`、`remotion.config.ts`、`src/Root.tsx`（双 Composition） | `package.json` + `src/remotion/Root.jsx`（双比例 16:9 / 9:16） | 无 | 完成 | `verify:runtime` / `verify:build` |
| Research | `reference/research-brief.md`（prompt 规约） | `src/providers/research/` + `src/research/claim-graph` + 指令过滤 | 补齐：claims 必须带 source，抓回文本的**指令性句子**要过滤（否则网页命令变成"事实"） | 完成 | `verify:research`（联网，不在 fast）、`verify:instruction-filter`（fast，9 正 5 负 16 判定） |
| Narration | `template/script/narration.txt`、`reference/narration-guidance.md` | `script/narration.txt`（4 章 44 段）+ `fixtures/script.json` 契约 | 无（段落=画面单元） | 完成 | `verify:plan`、`verify:narrative` |
| TTS / Timeline | `template/scripts/tts_build.py`（edge-tts WordBoundary → `timeline.ts` + `subs.ts`） | `scripts/tts_build.mjs`（WordBoundary → `script/timeline.json` + `fixtures/captions.json`） | 已对齐：唯一时间基准是真实词边界；本仓库额外做**串行 6 次退避重试**与 `cache_key` 区分文本/语速 | 完成 | `verify:timeline-source`（镜区间/字幕必须由 timeline 派生）、`verify:word-boundary`、`verify:tts-parity` |
| TTS provider 矩阵 | `tts_build.py` 单一 edge-tts | edge / kokoro / piper / kokoro_onnx / 用户 wav 五通道 | 补齐：provider 名单是常量时「删掉实现照样绿」→ 加门**真跑 dispatch + 拒绝坏输出** | 完成（本仓库超出参照片） | `verify:tts-native`（4 引擎 dispatch + 4 类坏输出拒绝） |
| 字幕预算硬门 | `reference/narration-storyboard.md`「每块中文 ≤16 字」 | `verify:subtitle-budget` 入 fast | 补齐：超标修法是回 `narration.txt` 调 `|` 切分，不是缩字号硬塞 | 完成（2026-10-10） | `verify:subtitle-budget` |
| 声明式内容配置 | `template/src/config.ts`（hud / credit / chapterTech） | `fixtures/project.json` 声明 + `tts_build` 透传 | 补齐：config 里的三块内容以前只在参照片有消费端，本仓库已接线（HUD 12 条 / credit / chapterTech 章序） | 完成（2026-10-10） | `verify:contracts`、`verify:timeline-source`（rails 解帧 + 冲突） |
| 音频后处理链 | `tts_build.py`：48k f32 → peak 0.89 → 16bit wav | `mixAudio` 两遍峰值归一 0.89 + `pcm_s16le` wav | 补齐：替换掉原来的 `alimiter` + mp3 双代有损；产物契约统一为 `public/audio.wav` | 完成（2026-10-10） | `verify:tts-parity`、`verify:asr` |
| Storyboard | `template/scripts/render_storyboard.py` + `selfcheck.py` | `scripts/render_storyboard.py` + `storyboard:gen`（从 IR 生成人可读分镜表） | 补齐：分镜表以前是手写，现在从 IR 自动生成，杜绝表与片子漂移 | 完成（2026-10-10） | `verify:storyboard`（14 用例逐条变异）、`verify:storyboard`-selfcheck |
| 镜头衔接规则 | `examples/rag/分镜表.md`：镜区间 = [本句 from−8, 末句 to+2]，相邻镜头首尾相接 | `src/visual/easing.mjs` `BEAT.SHOT_LEAD/SHOT_TAIL` → `beat-graph.mjs` 的镜区间 | **本轮修复**：旧实现取「segment 自身跨度」，44 镜之间留下 43 处空隙、14.7% 内容区空白 → 改为 a2e 首尾相接口径，空白降到 1.4%（仅 3 处章界，由 ChapterCard 覆盖） | 完成（2026-10-10） | `verify:timeline-source`（镜区间必须由 timeline + SHOT_LEAD/SHOT_TAIL 派生）、`verify:render-layer` |
| 离场 / 入场 | `template/src/ui.tsx`：`exitOp(N,to,len=8)`、`exitFade` 6.7%/帧、`glowOffK` 提前 6 帧灭光 | `src/shots/plan.mjs` `exitPlan`（`exitAt = len − EXIT_TAIL`）+ `SemanticShots.jsx` + `src/visual/camera.mjs` | **本轮修复**：旧实现 `exitAt = len − hold(30..45)` 而 `exitDrop` 只有 12 帧 → 每镜末尾 18–33 帧纯幕底。改为离场动画结束在镜头末帧 | 完成（2026-10-10） | `verify:render-layer`（`exitAt+exitTail==len`）、`test_measurement.py` 案例 14 |
| Storyboard 视觉语法 | `template/src/common/*`（DotFieldBg / Fog / StarField / Glitch / easing）、`reference/style-guide.md` | `src/remotion/Primitives.jsx` + `Fx.jsx` + `Icons.jsx` + `src/visual/style.mjs` + `docs/VISUAL_GRAMMAR.md` | 无（本仓库把视觉常量收进 `field.mjs` 单真源，导出 `fixtures/visual_contracts.json`） | 完成 | `verify:visual`、`verify:visual-contracts`、`verify:visual-grammar`（`verify:measure:quick` 复核单一真源） |
| Visual Primitive / Authored Shot | `template/src/shots/G1..G8/*.tsx`（每组私有图元模块） | `src/shots/G1..G8/SC*.jsx` + 共用 `src/shots/stage-kit.jsx` | **有意差异**：参照片每组重复私有模块（8 组合计千行、大半重复），本仓库抽成一套 kit + 组清单，理由是「重复的代价是漂移」 | 完成 | `verify:authored-shots`（44 镜 / 8 组 / 17 拓扑 / 单拓扑占比 ≤9.1%）、`verify:shots`、`verify:jsx-symbols`、`verify:relative-coords` |
| Pilot / Preview | `template/scripts/preview.sh` | `scripts/render-preview.mjs` + `pilot.mjs` + checkpoint 硬门禁 | 无 | 完成 | `verify:approval`、`verify:scheduler` |
| Parallel Build | `reference/agent-build-rules.md`（分组并行） | `build-groups.mjs`(8 组) + `materialize-shots` + `scheduler/pool` | 无 | 完成 | `verify:scheduler`、`verify:build` |
| Render | `template/scripts/render.sh`（1280×720@30fps H.264 crf16 AAC） | `scripts/render.sh`（同参 + 双比例 + 帧导出 + `sheet-gen`） | 参数对齐 a2e 基准；9:16 为扩展不作验收基准 | 完成 | `perf:probe`（30 帧测渲 ≥3fps） |
| 成片缩略总表 | `template/scripts/sheet.py` | `scripts/sheet-gen.mjs`（60 帧绑字幕，接 `render.sh` 尾部） | 补齐：QC 通读全片的第一入口 | 完成（2026-10-10） | `verify:skill` 第 4 节（顺序断言） |
| 定量 QC | `template/scripts/frame_metrics.py`、`motion_check.py` | `scripts/frame_metrics.py`、`motion_check.py`（纯 stdlib） | 已对齐；本仓库把阈值收进 `field.mjs` → `visual_contracts.json`，脚本不内联阈值 | 完成 | `test:measurement`（含合成帧自检）、`verify:measure:quick` |
| 节奏体检（hold/离场） | `motion_check.py`：亮度法定位离场起点后往回数 hold | `motion_check.py` 末拍稳定期定位 | **本轮修复**：旧口径只认亮度定位，落在「离场已开始但亮度仍高」的帧上 → 每个正常离场镜头被误报 `hold_too_short`（假阳性）。加有上限（`EXIT_TAIL`）的高变化跳过校准 + 反例自检 | 完成（2026-10-10） | `test:measurement` 案例 14（真缺陷不得被校准洗掉） |
| 测量覆盖度门 | `verify:production.sh` / QC rules | `scripts/qc.mjs` + `scripts/verify-production.mjs` | **本轮修复**：旧实现缺测量文件 `continue` 静默跳过；生产门只查 `summary.status==="PASS"` 不查**覆盖了哪些镜头** → 4 镜旧测量配 44 镜新 IR 报 PASS。改为缺失即阻断 + 覆盖度/区间漂移断言 | 完成（2026-10-10） | 反例实测：陈旧 4 镜产物 → `verify:production` 报「测量覆盖不足…量了 4 个镜头，IR 有 44 个」 |
| Visual Regression | `agent-qc-rules.md` 的视觉回归 | `scripts/visual_regression.py`（visual-pixel 描述符） | **有意降级**：参考资产是 64×36 合成图、描述子是确定性像素特征非语义模型，实测与画面质量反向相关 → 只作 run-to-run 漂移记录，不进完成定义 | 完成但**非阻断**（advisory） | `verify:visual-regression`、`verify:production` 强制断言 `gate==="advisory"` |
| Text Provenance | 硬性原则 2「事实有出处」 | `elements[].text` 溯源 + 硬编码字面量白名单（215 条）+ 双比例一致 | 无（阻断门） | 完成 | `verify:text-provenance`（溯源 8 / 登记 215 / 无出处 0） |
| Shot Score | `agent-qc-rules.md` 的多维评分 | 阻断分 = semantic/hero/motion/composition/light/safety（IR 结构，确定性）；视觉回归 5 维度只随报告记录 | **本轮修复**：旧实现把 `visual_regression` 的 5 个 advisory 维度折进阻断加权分，于是「盘上有/没有该报告」会给出相反判定（同一 IR：无报告全 PASS；有报告 22 个 generic 镜掉到 0.693–0.719 < 0.72 FAIL）。改为结构分独立、视觉维度不进 score，并加不变量断言 | 完成（2026-10-11） | `verify:shot-score`（含不变量断言 + 反例自检）、`verify:shot-sample` |
| QC → Repair → Recheck | `reference/agent-qc-rules.md`、`agent-build-rules.md` | `src/repair/engine.mjs` + `src/qc/flags.mjs` + `repair.mjs` + `repair-cycle.mjs` | 无；本仓库额外要求 `source-repair.json` 记录**改了什么源码**，杜绝「只改报告状态」假通过 | 完成 | `verify:repair`（pixel + storyboard 分类 + 记账链真跑） |
| Delivery | `reference/agent-qc-rules.md` 的交付清单 | `scripts/deliver.mjs` + `src/delivery/package.mjs`（sha256 + size manifest） | 无 | 完成 | `verify:delivery`、`verify:production`（逐文件 sha256/size） |
| Paper trail | — | `artifacts/<pid>/{research,script,beats,scene,render-ir,qc,repair,runtime}` | 本仓库扩展 | 完成 | `verify:store` |
| 生产完成门 | — | `scripts/verify-production.mjs`（指纹比对 + 媒体属性 + 覆盖度 + 阻断门 + 交付完整性） | 补齐：原门在「片子刚改过」时给假绿，现加输入指纹 + 覆盖度两道 | 完成（2026-10-10） | 反例实测见上 |
| 性能测渲门 | `agent-build-rules.md`：30 帧测渲 ≥3fps | `scripts/perf-probe.mjs` | 无 | 完成 | `perf:probe`（实测 8.10fps ≥ 3fps） |

---

## 2. 有意保留的差异（不是缺口）

1. **视觉 embedding**：内置 visual-pixel 描述符是确定性像素特征，不冒充 CLIP/SigLIP；provider contract 后续可替换为真正的语义视觉模型。
2. **组私有舞台的实现形态**：参照片每组自带一份私有图元模块（G1 `layout.tsx`、G3 `g3ui.tsx`、G8 `shared.tsx` 等，8 组合计千行、大半是重复的槽位/轨道/焦点爬坡）。本仓库抽成 `src/shots/stage-kit.jsx` 一份，各组 `stage.jsx` 只留**拓扑清单与镜头映射**。理由：重复八份的代价是漂移 —— 八份 `focusWalk` 会各自演进，「紫只给当前重点」在第 5 组悄悄失效没人发现。
3. **竖屏**：参照片只有 1280×720，**没有竖屏参照物**。本仓库 9:16 已保证双比例**时长/顺序/拓扑/文案完全一致**（`verify:text-provenance` C 段判），画面是**同一块 16:9 构图居中**到竖屏内容区；真正的纵向重排（双栏改单栏、字号按设备像素下限重算）**没有做**，不写成「已支持竖屏」。
4. **Typed Artifact Contract / 项目锁 / 外部 Agent provider / HyperFrames contract**：本仓库的工程化扩展，不改变 a2e 的基础生产顺序。

---

## 3. 质量基线（实测数字）

- 帧率 30fps；主画布 1280×720，竖版 720×1280。
- 样片规模：**44 镜 / 8 构建组 / 4 章 / 339.3s / 146 个字幕块**（`fixtures/render-ir-16x9.json` + `script/timeline.json` 的 `total_frames=10179`，2026-10-11 终验重渲后实测）。
- 真实媒体时间（`script/timeline.json` 的 WordBoundary）优先于按字数估算。
- 字幕与主体使用独立安全区；镜头组件独立，公共图元统一，**每镜声明自己的拓扑**（`stage.kind`）。
- 镜区间 = `[本句 from − SHOT_LEAD(8), 同章下一句 from − 9]`，章末/片末 = `末句 to + SHOT_TAIL(2)`；离场动画结束在镜头末帧。
- Pilot 审批后才进入完整渲染；QC 失败进入有限次数 scoped repair 再重验；Delivery 必须含 checksum manifest。

---

## 4. 剩余缺口（诚实记录，2026-10-11 终验后）

1. **9:16 画面质量**：终验实测 motion_9x16 FAIL（18 条 blocking，如 scene-001 静止 5.6s）。
   按用户决策在验收范围外（`ACCEPT_RATIOS=16x9`，范围外照跑照记、显式降级），未投入修复；
   方向是测量层尺度敏感性复核 + 竖屏纵向重排（§2.3）。
2. **authored 镜头没有生成器**：44 个镜头是按 demo 主题手写的创作产物，净室新主题实测复用了它们
   （`verify-authored-shots` 只对蓝图、不对当前 IR 的画面语义）。**换主题必须重做镜头**——与 a2e
   「agent 生成镜头源码」差距的最大单点。已在 README/SKILL 声明为适用边界。
3. **净室 `SKILL COMPLETE` 未达成**：新主题一键链实测走到「真实渲染 + 真实测量」（HTTP caching / MDN，
   13 claims，8 镜 ×2 比例），停在其 9:16 motion 测量门（fail-fast 生效）；且链退出时按设计自动还原
   demo fixtures，Gate 9–10 未在净室走通。详见 `docs/ACCEPTANCE_REPORT.md` §8。
4. **`AGENT_COMMAND` 环境阻塞**：外部 Agent 服务在本环境不可用，新主题走「作者稿注入」路径（实测可行）。
5. **画面审美水准**：门禁全绿不证明画面已等同 a2e `examples/rag/rag_v4.mp4` 的审美；仍需真实帧基准 + 人工/QC agent 复核。
6. **visual regression**：保持 advisory（参考资产 64×36 合成图、描述子非语义模型），不作为质量判据。

---

## 5. 本轮（2026-10-10）修复的 4 项真实缺陷

| 编号 | 缺陷 | 修前实测 | 修后实测 | 验证 |
|---|---|---|---|---|
| A | 镜区间不连续 → 内容区空白 | 43 处空隙、`{32:2,33:38,58:3}`、合计 **1492/10117 = 14.7%** | `{0:40,48:3}`、合计 **144 帧 = 1.4%**（仅 3 处章界，ChapterCard 覆盖） | `verify:timeline-source`、`verify:render-layer` |
| B | 每镜末尾空舞台 | `exitAt=len−hold(30..45)`，`exitDrop` 仅 12 帧 → 末尾 18–33 帧纯幕底 | `exitAt=len−EXIT_TAIL(8)`，离场动画结束在镜头末帧 | `verify:render-layer`、`test:measurement` 案例 14 |
| C | motion_check `hold` 假阳性 | 亮度定位落在「离场已开始」的帧上 → 每个正常离场镜头报 `hold_too_short` | 加有上限的高变化跳过校准；「内容一路动到末帧」仍报真缺陷 | `test:measurement`（含反例自检） |
| D | QC 覆盖度无门 | 缺测量文件 `continue`；生产门只查 status → 4 镜旧产物配 44 镜新 IR 报 PASS | 缺失即阻断 + 覆盖度/区间漂移断言 | 反例实测：陈旧产物 → 报「测量覆盖不足」 |

## 6. 终验轮（2026-10-11）修复的 5 项真实缺陷

| 编号 | 缺陷 | 修前实测 | 修后实测 | 验证 |
|---|---|---|---|---|
| E | 5 条 motion 阻断（4×`hold_too_short` hold 18–27<30 + scene-012 `motion_too_low` 静止 4.5s） | `tileFocus` 末拍上限少预留 FOCUS_RISE(11)+灭光(6)；SplitRows focus 恒定不消费 `k[idx]` | `BEAT.FOCUS_RISE=11` 单真源；末拍上限 = `exitAt−EXIT_HOLD_MAX−FOCUS_RISE`；SplitRows 照 CompareTable 消费 `k[idx]` | 重渲后 motion_16x9 **PASS blocking 0 / 44 镜**；`motion-vocabulary.md` 真源同步 |
| F | `run-production` 误食上一项目遗留的 `fixtures/script.json` | 净室新主题报 `script project_id mismatch` | 按 project_id 过滤作者稿，否则按缺失处理 | 净室重跑作者稿正确注入 |
| G | `skill.mjs` 的 narration 写出格式不符（无空行分段/`\|`）→ 新主题被压成 1 镜 | 净室 `verify:asr` 报 `segment-count-mismatch` | 按 `# CHAPTER` + 空行分段 + `\|` 字幕块写出 | 净室 8 段 8 镜 asr PASS |
| H | 交付包陈旧假绿：渲染更新后旧包照样过生产门 | 终验实测旧包（旧渲染 mp4）过门 | `deliver` 写入 `render_hashes`+包指纹，`verify:production` 回验 | 负向实验：删字段/翻字节均被拦（ACCEPTANCE §3） |
| I | qc report 新字段 `accept_ratios` 未登记契约 | `verify:contracts` 拦截 | 登记进 `contracts/qc.schema.json` | `verify:fast` 36/36 |