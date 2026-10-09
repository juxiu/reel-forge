# Reel Forge 生产化实施计划

执行顺序固定为：

Research -> Narration/Timeline -> Storyboard -> Overlay/Primitives -> G1 Pilot -> Parallel Build -> Render -> Frame/Motion -> Visual Regression -> Quantitative QC -> Repair/Recheck -> Delivery。

## P1 Agent Runtime

- 持久化执行状态：src/core/runtime.mjs。
- 项目级跨进程文件锁：src/runtime/lock.mjs。
- 外部智能体 JSON provider：src/providers/agent/command.mjs + index.mjs。
- 失败与暂停事件写入 runtime state，避免生产链丢失上下文。

## P2 Research

- 所有 source URL 真实抓取。
- 多来源统一 claim graph。
- claim -> source -> evidence 可追溯。
- narration/script 的 claim_id 在导演入口强制校验。

## P3 Narration / Timeline

- 按句真实 TTS。
- WordBoundary 为真实时间源。
- 逐句音频带 gap 混音成最终音轨。
- 中英文字幕分预算，支持 | 精细切块。
- 生成 timeline JSON/Markdown 和 timeline-source。

## P4 Storyboard / Primitives

- storyboard token 根据真实时间轴解析。
- 统一背景、HUD、章节卡、进度条、字幕安全区。
- 每个镜头有独立源码入口，公共视觉图元保持单一实现。

## P5 Pilot Gate

- 自动生成 30 秒以内可用 preview。
- Pilot 写入 approval artifact。
- pilot-preview 是完整渲染的硬门禁。

## P6 Parallel Build

- G1...Gn manifest。
- 并行 worker 按构建组执行。
- 构建组会物化为 src/shots/Gn/SCxx.jsx 独立镜头文件和 BUILD_NOTES。

## P7 Persistent Production

- run-flow 将全链串联并在 Pilot 停止。
- checkpoint 文件持久化四个人工确认点：长度语言、文案、配音、Pilot。
- render 不允许绕过 Pilot 审批；CI 可用显式 AUTO_APPROVE=1。

## P8 Render

- Remotion 真实渲染。
- 16:9 / 9:16 双比例。
- H.264 输出。
- 渲染前强制检查 Pilot checkpoint。
- 渲染前强制跑 `npm run plan-audit`：buildPlan 在渲染前就知道的分镜违规必须在这儿停下，而不是渲完再看截图反推。

## P9 Quantitative QC

- 判据单一真源：src/visual/field.mjs 同时给渲染层（Primitives.jsx 的幕底、Fx.jsx 的高光时序都从它 re-export）
  和测量层使用；`npm run export-visual-contracts` 把它连同 src/visual/style.mjs 的尺寸档、
  src/visual/camera.mjs 的运镜上限一起导出成 fixtures/visual_contracts.json，
  并按画幅给出设计单位 / 设备像素 / 320 宽采样坐标三套换算后的数。
  QC 脚本只允许从这份 JSON 取数，不在 Python 里另抄一份阈值。
- `npm run verify:visual-contracts` 守住三件事：contracts 与代码不漂移、迁走的常量没有第二处定义、
  光晕改成数据驱动后 CSS 字符串逐字符不变。
- media probe：duration / video / audio / dimensions / motion / black frame。
- frame metrics：主角尺度（最大物体高度，宽物体按宽折算）、空场最长连续帧、柔光面积（主角区 / 全区）、
  紫色碎片数、背景碎屑数、亮度占比、黑场占比、帧差、最长低变化区间。
- motion check：连续低变化区间和均值，外加末拍稳定期 hold（离场前最后一段「无大面积变化」的连续帧数）。
- visual regression：每个 scene/ratio 采样 20% / 50% / 80% 位置帧，与 positive / anti-reference benchmark 做 visual-pixel cosine similarity（当前 v2：纯 stdlib 双线性 + 面积平均，与 v1 的 PIL 读数不可比）。
- 视觉回归输出 reference_similarity、anti_similarity、visual_complexity、text_density、hero_consistency、layout_stability。
- Shot Score 将以上五个视觉维度与 semantic / hero / motion / composition / light / safety 统一加权。
- QC 结果 JSON + Markdown 落盘。

## Scoped Repair

- src/repair/engine.mjs 按 node 局部修改 RenderIR，并用 `repair_trace` 区分「画面真变了」和「只留了痕」。
- 确定性修复（IR 上真改）：hero_too_small / camera-unknown-preset / accent-overflow
- 像素层的自动修只有一条：`hero_too_small` → 抬 `hero_scale`。
  `motion_too_low` 以前按 Python 分类放行「小面积动作」，把该镜头元素条目的 `motion[].amount`
  从 0.04 抬到 0.075 并记成一次画面改动 —— 但渲染层只读 `motion[type==='camera']` 的
  `preset`/`amount`（见 src/shots/plan.mjs 里 cameraKeysFromMotion 的取用），元素条目上的
  `amount` 没有读者，重渲染后画面逐像素相同，报告却写着「修过了」。这就是假的确定性修复，
  所以它现在不进自动修名单。
- `motion_too_low` / `freeze` / `hold_too_short` / `glow_missing` / `purple_debris` / `background_debris` /
  `motion_sample_too_sparse` / `frame_metrics_missing` 在 RenderIR 里没有对应开关（在素材、幕底掩膜、
  镜头时长、抽帧配置和分镜的动作编排上），一律只写 trace 并 escalated，绝不冒充「已修」。
  `motion_too_low` 的三档分类（真静 / 有动作 / 小面积动作）与 Python 给的 `repair_hint`
  会原样出现在 escalations 和 `repair_trace` 里：升级到分镜层时要知道是「没动作」还是「动作太小」，
  这两件事在分镜里改的是不同的东西。
- `visual_regression_fail` 是 advisory（reference_similarity 与画面质量反向相关）：不进修复循环、
  不写 trace、不升级。
- 分镜层问题由 src/shots/plan.mjs 的 REPAIR_ACTIONS 单独分类，和上面那几类**不能混在一路处理**：
  - `camera-unknown-preset`、`accent-overflow`：真值就在 RenderIR 里（`camera`、`elements[].active`），可以自修；
  - `hero-overlong`：缺的是另写的画面文案，改 RenderIR 只会把长句放得更大更挤，必须回分镜；
  - `beat-window-overflow`、`beat-after-exit`：入场帧 `f0` 写在镜头源文件 `src/shots/Gn/SCnn.jsx` 的 recipe 里，IR 表达不了；
  - `icon-unregistered`、`text-below-min`：要先注册图元或改字号/文案。
- 后五类只写 repair_trace 并把 status 记为 escalated：本轮没有影响画面的 IR 改动时 repair-cycle 直接停，不再重渲染去「观察」一个已经知道的结果。
- Repair 后禁止重新 materialize 覆盖修复后的 RenderIR；直接重新渲染，并重新跑 frame metrics / motion / visual regression。
- 修复计划与状态归档。
- 修复后重新 render + 全质量层 QC，限制重试次数。

## P10 Delivery

- 归档成片、时间轴、分镜、研究、脚本、QC、Visual Regression。
- 每个交付文件生成 SHA-256 checksum。
- delivery-manifest 可机器校验。
- Production Gate 强制 visual regression PASS。

## P11 Visual Benchmark / Skill CLI

- fixtures/visual-benchmark.json：positive / anti reference manifest 与阈值。
- fixtures/visual-references/：仓库内置原创 PPM golden frames。
- scripts/visual_regression.py：确定性 visual embedding + cosine similarity + scene-level visual metrics。
- scripts/verify-visual-regression.mjs：双比例 visual regression contract。
- scripts/skill.mjs：npm run skill -- "TOPIC" --source URL [--auto-approve]。
- Skill CLI 在 Pilot 前后沿用现有 artifact / checkpoint contract，不创建第二套生产流程。

## 完成标准

功能完整度以 anything2explainer 的公开生产链为基线：完整 artifact 链、30 秒 Pilot gate、逐镜头源码、双比例渲染、量化 QC、视觉 benchmark、修复重检和 checksum delivery 均必须可以独立运行。

后续优化包括：CLIP/SigLIP provider、真实人工 golden-frame 数据集、对象存储、分布式调度、更多视觉原语、历史版本回归、自动最佳修复方案。
