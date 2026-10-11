# 验收报告 · reel-forge ↔ anything2explainer 对齐

> 本报告只记录**真实执行结果**。未跑的命令写未跑，跑不过的写 FAIL/BLOCKED，不用「应该没问题」代替实测。
> 生成时间：2026-10-11（Asia/Shanghai）。本版取代 2026-10-10 的 BLOCKED 版（生产门已实测转 PASS）。

## 1. 版本与基线

| 项 | 值 |
|---|---|
| commit SHA | `cd452ddc3c17bd9dd460f941bcb7ef6ebf14d8e3`（分支 `main`，含本轮 93 个未提交文件——本轮改动即工作区内容） |
| Node / npm | v23.6.1 / 11.16.0 |
| Python | 3.12.14（测量层纯 stdlib） |
| FFmpeg | 9.0.2（完整版；精简构建跑不了 `npm run tts`） |
| Remotion / React | 4.0.534 / 19.3.0 |
| 参照片 | `/Users/juxiu/Desktop/github/anything2explainer`（工程真源 `template/`，样片 `examples/rag/`） |
| 样片规模 | 44 镜 / 8 构建组 / 4 章 / `script/timeline.json` total_frames=**10179**（**339.3s**）@30fps / 146 字幕块 |
| 成片 | `artifacts/render/reel-forge-16x9.mp4`（37.9MB）+ `reel-forge-9x16.mp4`（35.0MB），1280×720/720×1280，H.264 crf16 |
| 验收范围 | **`ACCEPT_RATIOS=16x9`**（用户决策，2026-10-10 起有效：验收与对标以 16:9 为对象；9:16 保持双画幅能力，不投入质量打磨。机制见 §6，范围外比例照跑照记、显式降级，不是静默跳过） |

## 2. 16:9 终验主链（全部实测，2026-10-11）

| # | 命令 | 结果 |
|---|---|---|
| 1 | `sh scripts/render.sh`（后台） | **PASS** — 10179 帧 ×2 比例重渲，job 全程 6.7 分钟（含抽帧 + `sheet-gen` 总表） |
| 2 | `frame_metrics.py / motion_check.py / visual_regression.py` ×双比例 | motion_16x9：**PASS** — `blocking:0, warnings:0, 44/44 镜`，mean_change 0.8504（**修前 5 条阻断，见 §7-E**）；frame_metrics_16x9：**PASS** — `blocking:0, warnings:25`（全部 low，不阻断）；visual_regression ×2：`gate:"advisory"`（按设计非阻断） |
| 3 | `contact-sheet.mjs` | **PASS** — 44 镜 / 264 计划帧 / 无缺口 |
| 4 | `verify-shot-score.mjs` | **PASS** — 双比例全镜 score 0.774–0.9（≥0.72 阈），不变量断言通过 |
| 5 | `plan-audit.mjs` | **PASS** — `{scenes:88, issues:0}` |
| 6 | `ACCEPT_RATIOS=16x9 npm run qc` | **PASS** — `issues:0, warnings:45`（16:9 的 25 条 low + 9:16 降级标注 18 条 + 其他 low），`accept_ratios:["16x9"]` 入 report |
| 7 | `ACCEPT_RATIOS=16x9 npm run repair-cycle` | **PASS** — `repair SKIP: QC already PASS`，`repair_audit:"not-needed"` |
| 8 | `ACCEPT_RATIOS=16x9 npm run verify:qc` | **PASS** — 媒体探测双 mp4 PASS（339.307s，motion 帧 ≥2），text_provenance PASS（真上画面的文字 308 / 无出处 0） |
| 9 | `ACCEPT_RATIOS=16x9 npm run deliver` | **PASS** — v0.3，29 文件，manifest 新增 `render_hashes`（两支成片 sha256）+ `input_fingerprint`（§7-H） |
| 10 | `ACCEPT_RATIOS=16x9 npm run verify:delivery` | **PASS** — 29 文件逐个 sha256/size 对账 |
| 11 | `ACCEPT_RATIOS=16x9 npm run verify:production` | **PASS** — `production gate PASS {qc:"PASS", input_fingerprint:"6d2dded74b42fb6a", scenes:44, shot_sources:44, text_provenance:"PASS", delivery_files:29, out_of_scope:[{ratio:"9x16",frame:"PASS",motion:"FAIL"}]}` |
| 12 | `npm run verify:fast` | **PASS** — `{checks:36, passed:36, failed:0}` |

## 3. 负向实验（证明门有牙，全部实测）

| 实验 | 操作 | 预期 | 实测 |
|---|---|---|---|
| 测量新鲜度（t5） | `touch artifacts/frames/16x9` 后 `npm run qc` | 报 stale 并 FAIL | **✓** `stale_frame_metrics` + `stale_motion` + `visual_record_missing`，status FAIL；还原测量文件 mtime 后恢复 PASS |
| 打包对账 A | 删除 manifest `metadata.render_hashes` 后 `verify:production` | 拒绝旧版清单 | **✓** `delivery manifest 未记录 render_hashes（旧版清单），重跑 npm run deliver` |
| 打包对账 B | 翻转交付源 mp4 第 1000 字节后 `verify:production` | 渲染与包不一致即拦 | **✓** `交付包与当前渲染不一致：artifacts/render/reel-forge-16x9.mp4 在打包后被更新`；还原字节后恢复 PASS |
| 契约门 | qc report 新增 `accept_ratios` 未登记 | `verify:contracts` 拦截 | **✓** `契约里没有的字段 "accept_ratios"` → 登记进 `contracts/qc.schema.json` 后 36/36 恢复（§7-I） |
| 净室 fail-fast | 净室 9:16 motion FAIL | 一键链停在测量门 | **✓** `motion_check.py … failed with status 1`（§8） |

## 4. 门禁状态总表（Gate 1–10，总任务书 §12）

| Gate | 内容 | 状态 | 依据（全部为本轮实测） |
|---|---|---|---|
| 1 | 安装与基础运行 | **PASS** | `verify:env`/`verify:runtime`/`verify:build` 在 `verify:fast` 36/36 内绿；版本见 §1 |
| 2 | 内容生产（Research） | **PASS** | 净室新主题实测：MDN 联网抓取、指令过滤 `claims_kept:13/dropped:3/judged:16`（§8）；主仓 `verify:instruction-filter`（fast 内） |
| 3 | 音频与时间轴 | **PASS** | `tts-word-boundary` 唯一时间轴；`verify:timeline-source`（44 镜区间/146 字幕与 timeline 同源）、`verify:asr`、`verify:tts-parity` 绿；音频链 wav + 两遍峰值归一 0.89 |
| 4 | Storyboard 与 Authored Shot | **PASS** | `verify:storyboard`/`verify:authored-shots`（44 镜/8 组/17 拓扑/最大占比 9.1%）/`verify:shots`/`verify:jsx-symbols`/`verify:relative-coords` 全绿 |
| 5 | Pilot 与并行构建 | **PASS** | checkpoint 审批链（length-language/narration-signoff/voiceover/pilot-preview）+ `verify:approval`/`verify:scheduler`/`verify:build` |
| 6 | Still 与测试渲染 | **PASS** | `verify:still-benchmark` 绿；`perf:probe` 8.10fps（≥3fps） |
| 7 | 正式渲染（双比例） | **PASS** | 10179 帧 ×2 重渲实测（§2#1）；1280×720@30fps H.264 crf16 AAC，参数与 a2e 基准一致 |
| 8 | QC | **PASS（16:9）** | motion/frame_metrics/visual/plan_audit/text_provenance 全绿，覆盖度 44/44，新鲜度负向实验 ✓（§3） |
| 9 | Repair 与 Recheck | **PASS** | `repair-cycle` 实跑：QC PASS → `not-needed`；`verify:repair`（pixel + storyboard 分类 + 记账链真跑）绿 |
| 10 | Delivery | **PASS** | `deliver` v0.3 29 文件 + sha256 manifest + render_hashes 对账；`verify:delivery`/`verify:production` 实测 PASS（§2#9–11） |

## 5. 生产完成门（verify:production）断言清单（当前实测通过项）

输入指纹一致（`6d2dded74b42fb6a…`）· 测量覆盖度 44/44 镜且区间与 IR 无漂移 · motion/frame_metrics 16:9 PASS ·
visual 双比例 advisory · text_provenance PASS · asr 三字段 `tts-word-boundary` · repair `not-needed` 且 `source-repair.entries` 合法 ·
交付 manifest 逐文件 sha256/size · **打包对账（render_hashes + 包指纹，§7-H 新增）** · 16:9 必在验收范围内（硬性）。

## 6. 验收范围机制（ACCEPT_RATIOS，用户决策的实现）

`qc.mjs / verify-qc.mjs / verify-production.mjs / deliver.mjs / verify-delivery.mjs` 五个门文件统一口径：

- 默认 `16x9,9x16`（标准不降）；设 `ACCEPT_RATIOS=16x9` 时，范围外比例**测量照跑照进包**（审计可查），
  blocking 降级为带 `[验收范围外]` 标注的 warning，报告与生产门输出**显式列出**（如 `out_of_scope:[{ratio:"9x16",frame:"PASS",motion:"FAIL"}]`）。
- `16x9` 不可移出范围（代码硬性）；范围外仍强制：成片在位、测量文件在位、覆盖度/区间与 IR 一致、visual 仍 advisory。
- 本轮实测：9:16 `frame_metrics PASS / motion FAIL（18 条 blocking）`，按决策记录不阻断，**未掩盖**。

## 7. 本轮（2026-10-11）修复的真实缺陷

| 编号 | 缺陷 | 修前实测 | 修后实测 | 验证 |
|---|---|---|---|---|
| **E** | 5 条 motion 阻断：scene-007/008/034/039 `hold_too_short`（hold 18–27<30）+ scene-012 `motion_too_low`（静止 4.5s） | `tileFocus` 末拍上限 = `exitAt−EXIT_HOLD_MIN(30)`，未预留焦点爬坡 11 帧与 motion_check 灭光 6 帧 → hold≈13–19；SplitRows 的 focus 由 winner 列恒定决定、不消费 `focusWalk` 的 `k[idx]` → 紫色从未交接，4.5s 真静 | 新增 `BEAT.FOCUS_RISE=11` 单真源（easing.mjs + stage-kit.jsx + plan.mjs 三处共用）；末拍上限改 `exitAt−EXIT_HOLD_MAX(45)−FOCUS_RISE(11)`；SplitRows 照 CompareTable 消费 `k[idx]`（winner 列做底色、每拍整行翻紫） | 全 44 镜静态推导 `stillRegion∈[45,86]`；重渲后 motion_16x9 **PASS blocking 0**；文档真源 `motion-vocabulary.md` 三处同步 |
| **F** | `run-production` 误食**上一项目**遗留的 `fixtures/script.json`（project_id 不校验） | 净室新主题在 run-production 处报 `script project_id mismatch` | 只消费 project_id 匹配的作者稿，否则按缺失处理并打印说明 | 净室重跑：作者稿正确注入，TTS→asr 一路绿 |
| **G** | `skill.mjs` 写出的 `narration.txt` 是单换行拼接，而 `sync-script` 按空行分段、`\|` 切字幕块 → 新主题整篇解说被压成 **1 个镜头** | 净室 `verify:asr` 报 `segment-count-mismatch` | 按参考片形状写 `# CHAPTER n` + 穨行分段 + `\|` 字幕块 | 净室重跑：8 段 8 镜，`verify:asr` PASS |
| **H** | 交付包陈旧假绿：渲染更新后旧包照样过生产门（门只验包内 sha256 自洽，不问包里 mp4 是不是 QC 量的那一版） | 终验实测：盘上交付包还是 09:42 的旧渲染 mp4，`verify:production` 却 PASS | `deliver` 把两支成片 sha256 + 打包时输入指纹写进 manifest；`verify:production` 回验（渲染更新/输入变更 → 拒绝并要求重 deliver；旧版清单无字段直接判失败） | 负向 A/B 实测 ✓（§3）；正常链重 deliver 后 PASS |
| **I** | qc report 新字段 `accept_ratios` 未登记契约 | `verify:contracts` 拦截（契约门按设计工作） | `contracts/qc.schema.json` 登记后 36/36 恢复 | `verify:fast` PASS |

改动文件：`src/visual/easing.mjs`、`src/shots/stage-kit.jsx`、`src/shots/plan.mjs`、`scripts/qc.mjs`、
`scripts/verify-qc.mjs`、`scripts/verify-production.mjs`、`scripts/verify-delivery.mjs`、`scripts/deliver.mjs`、
`scripts/run-production.mjs`、`scripts/skill.mjs`、`contracts/qc.schema.json`、`docs/knowledge/motion-vocabulary.md`、`README.md`、`SKILL.md`。

## 8. §12 净室新主题实测（HTTP caching，源=MDN）

隔离副本 `/tmp/rf-cleanroom`，`npm run skill -- "HTTP caching" --source … --auto-approve`：

| Gate | 结果 |
|---|---|
| 1 安装 | **PASS**（一键入口可运行；本轮还修了它的两个链上缺陷 F/G） |
| 2 Research | **PASS** — 联网抓取 MDN，指令过滤 13 kept / 3 dropped |
| 3 音频时间轴 | **PASS** — TTS（含退避重试）→ sync 8 段 → `verify:asr` PASS |
| 4 Storyboard/IR | **PASS** — 8 镜 IR / build-groups / materialize-shots / `verify-authored-shots` |
| 5 Pilot | **PASS** — checkpoint + preview |
| 6 Still | **PASS** — still-benchmark |
| 7 正式渲染 | **PASS** — 8 镜 ×2 比例（≈2100 帧/比例） |
| 8 QC | **部分** — 16:9 测量完成；9:16 motion FAIL（scene-001 静止 5.6s）→ 一键链**停在该门**（fail-fast 生效，符合「未修复的问题保持失败」） |
| 9–10 Repair/Delivery | **未在净室走通**（停在 Gate 8；且链退出时 skill.mjs 按设计自动还原 demo fixtures，手动续跑会对上错配的旧 fixture，不能算数——不冒充完成） |

**净室结论（诚实记录）**：
1. 新主题能走到「真实渲染 + 真实测量」，链上两个真实缺陷（F/G）已修；fail-fast 生效。
2. **authored 镜头没有生成器**：44 个镜头是按 demo 主题手写的创作产物，净室复用它们渲染了新主题（`verify-authored-shots` 只对蓝图、不对当前 IR 的画面语义）。**换主题必须重做镜头**——已在 `README.md` 与 `SKILL.md` 声明为适用边界。
3. `AGENT_COMMAND`（外部 Agent 服务）在本环境不可用，run-production 走「作者稿注入」路径——环境阻塞，非代码缺陷。
4. `SKILL COMPLETE` 未达成，不宣称。

## 9. 剩余边界与风险（诚实记录，全部为已知且已声明）

1. **9:16 画面质量**：motion 18 条 blocking（scene-001 静止 5.6s 等）。按用户决策出验收范围；方向是测量层尺度敏感性复核 + 纵向重排（PARITY §2.3），未投入。
2. **authored 镜头无生成器**：见 §8.2。这是与 a2e「agent 生成镜头源码」差距的最大单点。
3. **净室 SKILL COMPLETE 未达成**：见 §8。
4. **视觉审美**：门禁全绿只证明链路完整/结构自洽/指标达标/文案有出处/可复现，**不等于**画面审美等同 a2e `rag_v4.mp4`；仍需人工/QC agent 逐镜复核。
5. **visual regression**：保持 advisory（参考资产 64×36 合成图、描述子非语义模型），不计入完成定义。
6. **agent provider**：qc-agent / repair-agent 无外部服务时按 NO-OP 记录（`agents=0`），不是「看过画面」。

## 10. 交付文件对照（总任务书 §11）

| 要求 | 文件 | 状态 |
|---|---|---|
| 11.1 README | [README.md](../README.md) | 已更新（含净室边界声明） |
| 11.2 SKILL.md | [SKILL.md](../SKILL.md) | 已更新（含 agent/作者稿依赖 + 镜头需重做边界） |
| 11.3 架构说明 | [docs/ARCHITECTURE.md](ARCHITECTURE.md) | 已存在并核对 |
| 11.4 生产方法 | [docs/PRODUCTION_METHOD.md](PRODUCTION_METHOD.md) | 已存在 |
| 11.5 能力对照表 | [docs/ANYTHING2EXPLAINER_PARITY.md](ANYTHING2EXPLAINER_PARITY.md) | 本轮同步（2026-10-11 修复行 + 终验数字） |
| 11.6 视觉语法与质量基准 | [docs/VISUAL_GRAMMAR.md](VISUAL_GRAMMAR.md) + `docs/knowledge/*` | `motion-vocabulary.md` 本轮同步（FOCUS_RISE 行） |
| 11.7 验收报告 | 本文件 | 本轮重写（实测 PASS 版） |
