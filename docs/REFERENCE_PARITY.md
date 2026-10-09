# anything2explainer 对齐矩阵

> 本页记录「参照片的每个能力，在reel-forge 里由谁执行、是真实现还是有声明」。
> 数字均为实测：`npm run verify:fast` 31/31 PASS，44 镜全部 authored。

| 参考阶段 | reel-forge 实现 | 状态 |
|---|---|---|
| Scaffold | package.json + Remotion Composition（双比例） | 完成 |
| Research | src/providers/research + src/research/claim-graph + 指令过滤 | 完成 |
| Narration | `script/narration.txt`（4 章 44 段）+ `fixtures/script.json` contract | 完成 |
| TTS / Timeline | `scripts/tts_build.mjs` + WordBoundary（唯一生产时间轴口径） | 完成 |
| TTS provider 矩阵 | edge / kokoro / piper / kokoro_onnx / 用户 wav |完成，且**有门真跑**（`verify:tts-native` 用 stub 跑 dispatch + 坏输出拒绝；原先只有一份名单常量，删掉实现照样绿） |
| Storyboard | `script/storyboard_src.md` → `render_storyboard.py` → 分镜表 + selfcheck（44 镜全过） | 完成 |
| 组私有舞台 | `src/shots/stage-kit.jsx`（17 种拓扑）+ 各组 `stage.jsx` 清单 |完成（**本仓库超出参照片**：参照片按组重复私有模块，本仓库抽成一套 kit + 组清单） |
| Overlay / Primitives | `src/remotion/Primitives.jsx` + `Fx.jsx` + `Icons.jsx` + `src/visual/style.mjs` | 完成 |
| Visual Benchmark | `fixtures/visual-benchmark.json` + positive/anti reference assets | 完成 |
| G1 Pilot | preview + pilot approval + checkpoint（render 硬门禁） | 完成 |
| Parallel Build | build-groups（8 组）+ materialize-shots + scheduler/pool | 完成 |
| Render | Remotion 16:9 / 9:16 + audio | 完成 |
| Quantitative QC | media probe + frame metrics + motion check | 完成 |
| Visual Regression | scene/ratio 帧采样 + visual-pixel cosine + anti-reference | 完成，但**降级为非阻断回归信号**（参考资产为 64×36 合成图，实测与画面质量反向相关）；测量层已改纯 stdlib 并有合成帧自测覆盖 |
| Text Provenance | elements[].text溯源 + 硬编码字面量白名单（215 条）+ 双比例一致 | 完成（阻断门，对应 a2e 硬性原则 2） |
| Shot Score | semantic/hero/motion/composition/light/safety + 五个视觉维度 | 完成（reference_similarity 仅作维度，不作硬门） |
| Repair / Recheck | repair engine + repair plan + rerender hook | 完成 |
| Delivery | checksum delivery manifest | 完成 |
| Paper trail | `artifacts/<project>/{research,script,beats,scene,render-ir,qc,repair,runtime}` | 完成 |

## 质量基线

- 帧率：30fps。主画布 1280×720；竖版 720×1280。
- 样片规模：**44 镜 / 8 构建组 / 4 章 / 255.2s / 132 个字幕块**（`fixtures/render-ir-16x9.json`）。
- 真实媒体时间优先于按字数估算。
- 字幕与主体使用独立安全区。
- 镜头组件独立，公共图元统一；**每镜声明自己的拓扑**（`stage.kind`）。
- Pilot 审批后才能进入完整渲染。
- QC 失败进入有限次数的 scoped repair，再重新验证。
- Delivery 必须包含 checksum manifest。

## 与参考仓库的差异

reel-forge 保留了更偏工程化的 Typed Artifact Contract、项目锁、外部 Agent provider 和 HyperFrames contract。这些属于扩展能力，不会改变 anything2explainer 的基础生产顺序。

有意保留的三处差异：

1. **视觉 embedding**：仓库内置的 visual-pixel 描述符是确定性的视觉特征 embedding，不冒充 CLIP/SigLIP；provider contract 后续可替换为真正的语义视觉模型。
2. **组私有舞台的实现形态**：参照片每组自带一份私有图元模块（G1 `layout.tsx`、G3 `g3ui.tsx`、G8 `shared.tsx` 等，8 组合计一千多行，其中大半是重复的槽位/轨道/焦点爬坡）。reel-forge 把这些抽成 `src/shots/stage-kit.jsx` 一份，各组 `stage.jsx` 只留**拓扑清单与镜头映射**。理由：重复八份的真正代价是漂移 —— 八份 `focusWalk` 会各自演进，于是「紫只给当前重点」在第 5 组悄悄失效没人知道。
3. **竖屏**：参照片只有 1280×720，**没有竖屏参照物**。reel-forge 的 9:16 已能保证双比例**时长/顺序/拓扑/文案完全一致**（`verify:text-provenance` C 段在判），画面是**同一块 16:9 构图居中**到竖屏内容区；真正的纵向重排（双栏改单栏、字号按设备像素下限重算）**没有做**，不写成「已支持竖屏」。

## 当前验收说明

`verify:fast` **31/31 PASS**，其中与本轮对齐直接相关的：

- `verify:authored-shots` — 44 镜 / 8 组 / **17 种拓扑** / 单一拓扑最大占比 **9.1%**；无 `stage.kind`、组内同拓扑、`components` 映射缺镜、声明了不传 `stage` 四类问题一律 FAIL。
- `verify:storyboard` — 14 个用例，基准为**44 镜**合规分镜，13 条判据逐条变异。
- `verify:tts-native` — 4 个引擎 dispatch + 4 类坏输出拒绝。
- `verify:text-provenance` — 溯源元素 8 / 登记字面量 215 / 无出处画面文案 0。

需要注意：`verify:fast` PASS 证明的是**链路完整、镜头各有构图、指标达标、画面文字有出处、可复现**，不证明画面已达到 a2e 样片的审美水准 —— 后者仍依赖真实帧基准与人工／QC agent 复核。