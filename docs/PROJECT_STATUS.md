# 项目当前状态

更新日期：2026-10-09

## 总体状态

**状态：基础生产链、双比例质量门禁、语义导演、TTS WordBoundary 主时间轴、镜头评分、画面文字出处门禁与 Skill CLI 已接入；44 镜全部 authored（17 种拓扑），每镜绑定组私有舞台。`verify:fast` 31/31 PASS。当前主要差距是画面审美水准与真实帧基准，尚未引入语义视觉模型。**

当前主干已经覆盖：

Research → Narration / Timeline → Storyboard → 组私有舞台 → G1 Pilot → Parallel Build → Render → Quantitative QC → Visual Regression → Repair / Recheck → Delivery。

## 本轮（2026-10-09）做的事

### 1. 修复基线

`verify:fast` 从 28/30 恢复到 30/30。根因是 `artifacts/digest-explainer/research.json`（本地运行残留、`artifacts/` 已 gitignore，早于 `instruction_filter` 进 research schema）；`verify:spawn` 只是因为它 spawn 了 `verify:contracts` 才连带失败。用真实调研流程重新生成，没有手改产物。

### 2. 镜头层：从 44 个同构空壳到 44 个真构图

**这是本轮最大的一处。** 之前 44 个 `SCxx.jsx` 只有 `variant / hero_size / camera / mirror / labels` 之差，全部委托给 `SemanticShot`，再套**同一条固定的两带布局**（主角带占上 42% + 自动排布的机理带）。它们全塌进通用版式里，画面差别只来自 `hero_size` 那几个数字。

关键发现：`plan.mjs` **早就内置了 authored 通路**（`recipe.stage.items` 带 x/y/w/h → `itemSlots` 置 `authored:true` 并跳过自动布局），门禁的 `CONSUMED` 也允许 `stage` 键 —— 但 44 个镜头**没有一个用它**。这是 44 镜塌成一套版式的机制性原因。

做法：

- `src/shots/Shot.jsx` / `SemanticShots.jsx` 新增 `stage` prop：按组注入私有舞台。**刻意收窄** —— 舞台只画画面内容，离场归零、运镜、扫光白名单、setPiece 时序仍由外层统一施加，否则组里就能私开扫光、`SWEEP_WHITELIST_MAX` 当场失效；`plan` 照旧构建，所以 `plan.issues` / `repairs` 不会被绕过。
- `src/shots/stage-kit.jsx`：共用语汇 + **17 种拓扑**（radial / split2col / ranked3 / rail4 / dualpanel / beforeafter / pipeline3 / causechain / citeside / terminal / orbit / splitrows / ballot / layerstack / comparetable / reshape / ladder）。每种骨架结构不同，不存在两种能靠同一套排版函数渲染出来。
- 各组 `stage.jsx` 只留**拓扑清单与镜头映射**；几何、文案、焦点拍写在各自镜头的 `recipe.stage` 里。
- 入场帧一律取 `plan.hero.f0`（由 `buildPlan` 从字幕块推出，锚在 −6…+3 窗口），`focus` 存**相对入场帧的偏移** —— 换片子、换字幕块时整组焦点交接自动跟着首句走。

顺带修了两处会「以错的名目报错」的地方：`pickHero` 对 authored 舞台镜不再误报 `hero-overlong`（舞台的主角是画出来的，本来就不是一段文案）；`verify-authored-shots` 的「一行一个键」检查改成**深度感知**扫描（否则任何带嵌套的 recipe 都误报）。

### 3. 门禁硬化（让上面这件事不可回退）

`verify:authored-shots` 原来只能验证「variant 名在不在渲染层 switch 里」，因此 44 个空壳一样报 PASS —— 它无法分辨真构图和复制粘贴。新增四类判据 + 一个全局约束：

1. 每个镜头必须声明 `stage.kind`，没有就是空壳 → FAIL；
2. `stage.kind` 在**组内**互不相同（同组两镜同拓扑 = 复制粘贴）→ FAIL；
3. 组私有 `stage.jsx` 必须真导出该镜组件（查 `components` 映射），且镜头文件必须把 `stage={...}` 传下去（声明了不接 = 假开关）→ FAIL；
4. `stage.jsx` 的 `topologies` 清单与组内实际用到的 kind 必须不多不少；
5. 全片任何一种 kind 占比 ≤15%（挡住「一种版式铺满全片」）。

实测：**44 镜 / 8 组 / 17 种拓扑 / 单一拓扑最大占比 9.1%**。

### 4. 44 镜全链闭环

此前提交态是「蓝图 44 镜，但 IR 只有 4 镜、registry 只注册 4 个」，SC05–SC44 是孤儿，`Root.jsx:68` 会抛。现在从**同一张表**生成 IR（16:9 + 9:16）、132 个字幕块、解说词（4 章 44 段）、分镜源、构建组（8 组），三者不可能漂移；`materialize-shots` 重建 registry → **44 entries**。样片规格：44 镜 / 8 组 / 4 章 / 255.2s。

顺带修了 `verify:storyboard` 的自测：它用**写死的 4 句合成时间轴**，样片一改大，三条用例（镜头过短 / 帧号漂移 / 覆盖不符）全部退化成「时间轴没有句子 S05」—— 判据没被执行，而失败信息看着像分镜坏了。现在句数与章节**由分镜源推导**，三条用例只声明「改哪一句、改成什么」。

### 5. 竖屏（9:16）

- `cameraSafe` 改为**按画幅推导**。原来写死 16:9 的 `x89–1191 / y122–607`，而竖屏逻辑画布高 2276 —— 相机在竖屏里按「只覆盖顶部四分之一」的边界限位，慢推推到画面中部就被判出界。画面没问题，是判据坐标系错了。现在 16:9 仍精确还原样片实测值，9:16 得到 `122–2163`。
- 构图块**居中**到竖屏内容区。原来钉在画布顶部，只占竖屏内容区的 22%，下面 1700px 全空。
- ⚠ **边界要说清楚**：真正的竖屏重构（纵向堆叠、双栏改单栏、字号按设备像素下限重算）**没有做**。参照片本身也只有 1280×720，没有竖屏参照物。现在能保证的是双比例**时长/顺序/拓扑/文案完全一致**，画面是同一块 16:9 构图居中，不做纵向重排。

### 6. TTS provider：从「声明」变成「有门真跑」

四个引擎（kokoro / piper / kokoro_onnx / 用户 wav）的实现本来就是齐的。但 `verify:tts-parity` 只比对**一份硬编码的名单常量**，与 dispatch 层没有任何连线 —— 把 `native.mjs` 里 kokoro 的分支删掉，它照样绿。这正是本仓库反复记过的「假开关」。

新增 `verify:tts-native`：用 stub provider 真调 dispatch（读同样的 stdin JSON、吐同样的返回形状），检查 audio + word-timings + manifest 都写出且 `timing_mode` 仍是 `tts-word-boundary`；再喂四类坏输出（缺时间轴 / 空时间轴 / 缺音频路径 / 非 JSON），确认它**拒绝**而不是照单全收。`requirements.txt` 补上三个可选引擎的装法与模型参数，并写明「无论用哪个引擎，生产时间轴口径只有 `tts-word-boundary`，没有词边界的引擎必须逐块合成并给出真实块边界，禁止伪装成 external ASR」。

## 已完成

### 生产链

- Research：真实 source fetch；多来源 claim graph 与 claim → source → evidence 追踪；script claim_id 证据校验；指令性文字过滤（9 条规则，判据单一真源）。
- 逐句真实 TTS、WordBoundary、最终音轨；中英文字幕分块与真实时间对齐；timeline JSON/Markdown 归档。
- Storyboard token → 分镜表；selfcheck：帧号、时间轴覆盖、镜头时长、持续动作、末拍稳定期、Glitch/扫光白名单。
- Overlay / Primitives：背景、HUD、章节卡、进度条、字幕安全区、片尾。
- **44 镜组私有舞台，17 种拓扑**，每镜独立组件 + 组清单。
- 构建组 manifest 与并行 worker；16:9 / 9:16 双比例渲染入口。
- Pilot preview、approval artifact、pilot-preview 硬门禁；Runtime 状态持久化、恢复、项目锁、外部 Agent JSON provider。
- frame metrics / motion check 支持逐镜头质量范围；QC 把问题映射到具体镜头与 ratio。
- Repair 只作用于匹配 ratio 与命中的 node，且要求实际产生变更后才算成功；Repair plan / status 审计。
- Delivery checksum manifest（`verify:delivery` 重算交付目录里实际 SHA-256 与 size）。
- Visual Benchmark（positive / anti-reference PPM 资产、阈值）；Visual Regression（按 scene/ratio 采样，visual-pixel v2，纯 stdlib）。
- Shot Score：11 维加权（semantic / hero / motion / composition / light / safety + 五个视觉维度）。
- `npm run skill -- "TOPIC" --source URL --auto-approve` 一键入口。

### 当前阻塞项

**当前没有 P0 阻塞。**

视觉 embedding 采用仓库内置的确定性 visual-pixel 描述符（v2），不是 CLIP/SigLIP 语义模型；其参考资产（`fixtures/visual-references/`，64×36 合成图）与画面质量**反向相关** —— 画面更密更实则分数更低。因此它已降级为**非阻断回归信号**（`gate: "advisory"`）。后续要恢复阻断能力，需先用 reel-forge 自己的真实成片帧重建正例/反例基准。

## 后续增强

- 用 reel-forge 真实成片帧重建 visual benchmark，替换 64×36 合成图；再考虑 CLIP / SigLIP。
- **真正的 9:16 纵向重排**（当前是同一块 16:9 构图居中）。
- 更多语义视觉变体与组私有拓扑；继续减少对通用引擎的依赖。
- 更多真实人工精选 reference / anti-reference 帧。
- Repair patch 与 BeatGraph / 源节点的真实回写。
- 对象存储、分布式 worker / lock；HyperFrames runtime render backend。
- 历史版本视觉回归与自动挑选最佳修复方案。

## 时间轴口径

当前唯一生产时间轴仍为 TTS WordBoundary。二次校验结果必须标记为 `tts-word-boundary`；仓库不再设置 external ASR 作为第二套生产时间轴或额外 Production Gate。

## CI 验证策略

- **快速验证**：push / PR 默认触发 `.github/workflows/verify-fast.yml`，跑 31 项轻量验收（含 authored-shots、storyboard 变异、tts-native dispatch、文字出处），不联网、不渲染、不跑 TTS。
- **完整验收**：`.github/workflows/verify.yml` 手动或每日运行，完整执行 Research → TTS → ASR → Preview → Render → Frame Metrics → Motion → Visual Regression → Shot Score → QC → Repair → Delivery → Production Gate。
- 两级均采用并发取消旧 run，避免连续提交堆积。