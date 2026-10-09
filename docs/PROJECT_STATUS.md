# 项目当前状态

更新日期：2026-10-09

## 总体状态

**状态：基础生产链、双比例质量门禁、语义导演、TTS WordBoundary 主时间轴、镜头评分、画面文字出处门禁与 Skill CLI 已接入；44 镜全部 authored（17 种拓扑），每镜绑定组私有舞台。`verify:fast` 34/34 PASS。17 种拓扑已各渲一帧逐张核对并修掉 7 个真实缺陷（此前一帧都没渲过）。当前主要差距：画面审美水准、3 镜密度不达标、真实帧基准缺失、尚未引入语义视觉模型。**

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

### 7. 真渲染验证（补上「没看过画面」这个缺口）

上一轮结束时我写过「44 镜全绿、17 种拓扑」，但**那 44 镜一帧都没渲出来过** —— 当时盘上最新的真实渲染还是 10 月 8 日那次 4 镜 / 37.3s。本轮把 17 种拓扑各渲一帧（`artifacts/stills/k_*.png`，每种拓扑取镜头 62% 处），逐张看，发现并修掉 7 个真实缺陷：

| # | 缺陷 | 画面症状 | 静态门为什么放过 |
|---|---|---|---|
| 1 | `Primitives.jsx:594` `<SoftIn>` 开标签未闭合 | esbuild 报 3 个错，**整条渲染路径构建失败** | syntax / imports / jsx-symbols 都不解析 JSX |
| 2 | `Shot.jsx` / `stage-kit.jsx` 注释里写了 `shots_src/G*` + `/` | `*/` 提前闭合块注释，后半段被当代码 | 同上 |
| 3 | 图标组件返回 SVG `<g>`，被裸写在 `<div>` 里 | **19 处图标全部隐身**，主角成空框 | 无门检查「SVG 图元是否在 svg 容器内」 |
| 4 | `comparetable` wrapper 已定位、内部 `Box` 又写同样绝对值 | 左列框被推到中央、右列框出画，表头只剩一个 | 无门检查坐标是否重复定位 |
| 5 | 同上，`reshape` | 两个形整个消失，只剩一根箭头 | 同上 |
| 6 | `radial` / `orbit` 卫星起始角在 -90°、`ry` 过大 | 底部标签落进字幕带、主角副标被压 | 无门检查「合成后是否越过 cameraSafe」 |
| 7 | `beforeafter` 平面自带标题与 items 文案重复 | 「原文」和「原始报文」说同一件事还叠在一起 | 无门检查文案冗余 |

另外把结构框描边从 `GREY_LINE`(#4A4A4A) 提到 `GREY`(#A0A0A1) —— a2e 的规则是「图形 2–3px **白**描边黑填充」，`GREY_LINE` 是网格线层级，用在结构框上黑底几乎看不见（`comparetable` 左列框因此「像没画」）。

### 8. 两道新门（让上面 7 个不再复发）

- **`verify:syntax` 现在真解析 JSX**。它以前把 57 个 `.jsx` 跳过并打印 `jsx_not_parseable_locally: 57`，理由是「本机没有 esbuild」—— **这个前提早已不成立**，esbuild 就在 `node_modules` 里（Remotion 的依赖）。现在 72 个 JSX 全部走 esbuild 解析，解析不到就**判红**，不再降级成 caveat。
- **`verify:relative-coords`**：wrapper 原点非零时，内部子元素不得重复写同一个原点表达式。判据是「子坐标表达式 == wrapper 原点表达式」，所以对 `cx={s / 2}` 这类**正确**的相对坐标零误报（第一版按「出现绝对坐标」判，误报了 4 处；改成比对表达式后为 0）。

`verify:fast` 现为 **32/32 PASS**。

### 9. 画面密度实测（内容区亮像素占比，17 镜）

```text
comparetable 4.60%  ranked3 4.29%  dualpanel 3.50%  terminal 3.40%  rail4 3.39%
splitrows 3.31%     radial 3.24%   layerstack 3.20%  citeside 3.01%  orbit 2.70%
split2col 2.49%     ballot 2.46%   causechain 2.21%  ladder 1.61%    beforeafter 1.42%
reshape 1.10%       pipeline3 0.87%
```

`pipeline3` / `reshape` / `beforeafter` 明显偏空（a2e 硬规则：内容区最大物体 <110px 不得持续 >45 帧）。这三镜**还没达标**，需要加内容密度，不是靠改字号。

### 10. 时序单真源（a2e 对齐）+ TTS 提速

**A4生产门staleness**：`verify:production` 原来只查「文件在不在 / status 是不是 PASS」，**从不检查产物对不对应当前输入** —— 10-08 的 4 镜产物一路配着 44 镜的 IR 报 PASS。新增 `src/release/fingerprint.mjs`（覆盖双比例 IR 画面字段、44 个镜头源字节、解说词、字幕块、字面量白名单），`qc.mjs` 写入、`verify-production` 重算比对，算法两边共用一份。

**A2 TTS 的真正根因不是限流**：`fixtures/project.json` 的 `language` 一直是 `"en"`（旧英文样片遗留），于是 voice 解析成 `en-US-JunxiNeural` —— **英文声音念中文**，edge-tts 每句产不出音频，而报错是 `Please verify that your parameters are correct`，**把矛头指向参数**。先怀疑文本、再怀疑限流、再怀疑退避都不对。新增 `verify:language` 在合成前拦这类不一致。

**TTS 缓存不带文本指纹**（比过期产物更危险）：`edge.mjs` 只判断「文件存在且非空」就当命中。缓存里躺的是旧英文配音，而解说词早已换中文 —— 一旦跑完，**第 1 句是英文音频配中文字幕，而所有门都通过**。现在缓存键 = `sha256(文本+声音+语速)`；`native.mjs` 的用户 wav 通道同类漏洞（换词不换 wav）一并修了。

**TTS 提速约 10 倍**：原来串行 44 句 ≈ 45 分钟（每句一次 python 进程 + 联网合成）。改成**并发合成 + 串行装配**（合成彼此独立；游标与混音必须串行），200 秒完成 42 句。并发到 44 句会触发持续限流（实测连续 20 次 `NoAudioReceived`），所以加了**串行补齐**：失败的那几句单独串行重试 —— 限流是并发放大的，串行几乎总能过；且原写法下一句失败会让整轮作废。

**A1 时序单真源**：事故根源是这份仓库有**三份互不引用**的时序数据（IR 的 `start/duration`、`captions.json`、gitignore 的 `timeline.json`），实测 **IR 7657 帧 vs 真实配音 13235 帧 —— 成片比配音短 186 秒**，而没有任何门发现，因为没有第二个真源跟它 disagreement。
修法（对齐参照片「一份时间轴 + 按句 id 查表」）：
- `scripts/sync-script.mjs`：解说词 → `fixtures/script.json`（44 段，一段=一镜），并**用同一份数据**重写 `captions.json`
- `npm run materialize-ir` 从 `script/timeline.json` 派生双比例 IR
- 新增 `verify:timeline-source`：镜数==句数、每镜 start==句子 from（容差 1 帧）、字幕块必须落在句区间内、末端漂移

**结果**：`verify:timeline-source` PASS（44 镜 / 44 句 / 132 字幕块 / 13235 帧 / 441.17s），漂移从 **−186 秒 → 0**。

顺带修：IR 的 hero 元素原标`type:"card"`（=画面文案）却装着整段解说词，于是 provenance 判它「无出处」88 条—— **门没骂错，是类型标错了**。改成 `type:"narration"`（参照片规则：整句解说词不进画面），门跳过非画面元素。

**TTS 顺带暴露的事实**：真实 edge 云希在本机是**约 4.0 字/秒**（392s 语音 / 1575 字），不是 a2e 文档声称的 5.5 字/秒。所以同样文本成片是 **7.35 分钟**而非 a2e 样片的 4′35″。脚本规模本身没问题（1575 字 ≈ a2e 的 1490 字那一档），差的是语速。

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
- **补齐 `pipeline3` / `reshape` / `beforeafter` 三镜的画面密度**（实测内容区亮像素 0.87% / 1.10% / 1.42%，明显偏空）。
- **用 reel-forge 真实成片帧建 `examples/contrast/` 正反例**（参照片有 6 组，reel-forge 没有）—— 这是目前最缺的一块审美标尺。
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