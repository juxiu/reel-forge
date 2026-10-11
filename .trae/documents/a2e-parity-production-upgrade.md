# 向 a2e 补齐：生产力 + 审美对齐（v4 精简版）

## Context

以 a2e 成片为样本，补齐 reel-forge 生产力与审美，**但不过度设计**。

根因已定位：`src/remotion/timeline.gen.mjs` 仍是 null 占位 → 成片无音轨、无章节、无步骤轨。`npm run tts` 重跑即修（全量缓存命中）。画面缺陷均已定位到行级（stage-kit.jsx / G1/stage.jsx）。

**防过度设计约束**（本轮红线）：
- 每项改动必须对应一个实测缺陷或 a2e 样片的明确特征，不为「以后可能用」加东西
- 不新增脚本、不新增配置项、不新增抽象层；复用 `still.mjs` / `pngio.py` / `textfit.mjs` / `frame_metrics.py` 现有接口
- BigNumber 只在 narration 已有数字锚点的镜头接入；找不到自然锚点就不做，不强塞
- 正反例对照就是「图片 + README」，不建新工具链
- 改动后不重复跑全套验证，按节点批量验

---

## Phase 1 — 画面修复 + 审美补齐（全部在终渲前，指纹约束）

一批做完，用 `npm run still -- <帧> <输出>` 抽查核对，最后跑一次 `npm run verify:fast`：

1. radial/orbit 卫星连线移到主角层之下（stage-kit.jsx / G1/stage.jsx，z-order 一处改两拓扑）
2. comparetable 文字溢出：现有 `fitSize` 压字号或行高自适应
3. layerstack 图标压字 + radial「中间代理」标签相撞：间距/角度微调
4. 三镜密度（pipeline3/reshape/beforeafter）：加大主体至 a2e 硬规则（主角 ≥170px 或大字 ≥96px），补次级标注；frame_metrics 实测亮像素 ≥2.2%
5. BigNumber 图元（Primitives.jsx）+ 接入有数字锚点的镜头（无锚点则跳过此项）

## Phase 2 — 生产力闭环

0. **视频参数对齐 a2e**（已核对，仅需一处）：a2e 基准 = 1280×720 @30fps、h264、crf=16、`--timeout=300000`。reel-forge 16:9 已一致（9:16 为超出 a2e 的扩展，a2e 无竖屏参照）；唯一缺口是 [render.sh](../../scripts/render.sh) 缺 `--timeout=300000`，补上。并发数是机器调优参数不属视频参数，不动。
1. `npm run tts` → 覆写 `timeline.gen.mjs`（真实时间轴）+ captions
2. `npm run sync-script` → `npm run materialize-ir` → `npm run verify:fast` 36/36
3. `npm run render` 双比例 441s（音轨进 mp4；先 `df -h` 确认 ~10GB 临时盘）
4. `npm run qc` → `npm run deliver` → `npm run verify:production` PASS
5. `ffprobe` 参数比对门：双 mp4 = h264 / 30fps / 1280×720 与 720×1280 / 含 AAC 音轨 / ≈441.1s；抽帧目检章节卡/步骤轨/字幕/片尾

## Phase 3 — 质量标尺（复用现有工具，零新脚本）

1. `examples/contrast/`：从新成片帧 + `still.mjs` 取 6 组正反例（对齐 a2e 教学对：主角尺寸/揭示/大数字/稀疏密集/背景/收尾），README 说明对照点，`pngio.py` 拼一张 sheet
2. 用真实帧替换 `fixtures/visual-references/` 合成正反例；实测能区分正反例才把 gate 从 advisory 恢复 blocking，否则保留并记录原因

## Phase 4 — 文档 + 卫生收尾

- `git rm --cached` 清掉误入库的 `__pycache__/*.pyc` ×8 与 `tmp-fast.txt`
- README/USAGE 删过时 checkout 指令；`ANYTHING2EXPLAINER_PARITY`（原 REFERENCE_PARITY，已 `git mv`）更新为终渲实测数字；PROJECT_STATUS 记录本轮
- 终验：`verify:fast` 36/36 + `verify:production` PASS 双绿

## 验证

`verify:fast` 36/36；`verify:production` PASS；ffprobe 双 mp4 音轨+时长；k_* 静帧目检零硬缺陷；三镜亮像素 ≥2.2%；contrast sheet 可打开核对。

## 风险

- 渲染抽帧临时盘 5–10GB（先 df -h）；TTS 应全量缓存命中，失败走既有串行补齐路径；镜头源码改动后必须重跑 qc→deliver（指纹特性，Phase 顺序已按此排）。
