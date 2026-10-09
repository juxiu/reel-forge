---
name: reel-forge
description: 将任意知识或技术主题生产为原创代码动画讲解视频，采用 Research → Narration → Storyboard → Pilot → Parallel Build → Render → QC/Repair → Delivery 的样片级生产链。
---

# reel-forge Skill

## 目标
按样片级生产流程生成原创 MG 讲解视频。参考 anything2explainer 的生产方法，但不复制其源码、镜头或样片内容。

## 四个人工确认点
1. **length-language**：确认目标时长、语言、比例。
2. **narration-signoff**：确认 Research 后的口播稿。
3. **voiceover**：确认 TTS 引擎、声音、语速与时间轴。
4. **pilot-preview**：确认前 30 秒 Pilot 的风格、字号、节奏和主体尺寸。

非交互环境必须用显式 artifact 或 `--auto-approve`，不能隐式跳过。

## 样片级硬规则

### 视觉
每个 scene 必须绑定独立 SCxx 源码与 `SHOT_RECIPE`；语义变体不得退回通用卡片。主角高度至少 170px，末拍稳定至少 30 帧。镜头按画面单元组织，不为每句机械切镜。

### Build Agent
G1…Gn 为独立构建角色，Agent provider 配置后每组分别收到 Build Agent task；任务明确只修改 `src/shots/Gn/**`，并要求每镜至少 6 张 still（高光镜头 ≥10 张）+ 30 帧测渲。CI 无 Agent 时使用 deterministic builder，但产物必须明确标注 agent_mode=deterministic。

### TTS
支持 edge、kokoro、piper、kokoro_onnx 与用户 wav 能力；实际 production gate 仍以 tts-word-boundary 为唯一生产时间轴口径。无词边界引擎必须通过逐块/逐词适配层提供真实块边界，禁止伪装为 external ASR。

### B-roll
可选 `renderIR.footage[]`，素材必须来自 `public/assets/<slug>/`，并登记 source/sha/license/purpose manifest。单帧最多 1 个 OffthreadVideo。

### Still / 性能
每镜头至少 6 个 still 采样点，`SHOT_RECIPE.highlight === true` 的镜头至少 10 个（对齐上游 `reference/agent-build-rules.md:51` 的「≥10 张覆盖扫光 / 白闪 / glitch 三段」）；**刻意不设上限**——上游没给，本仓库也不发明一个。真源 `src/build/limits.mjs:27,38`，「这一镜是不是高光」只有一处实现（`src/build/still-budget.mjs:30`），生产者 `scripts/still-benchmark.mjs:28-31` 与门 `scripts/verify-still-benchmark.mjs:15-19` 共用它。每组至少有一个 30 帧测渲契约（`verify-still-benchmark.mjs:24` 判 `test_render.frames===30`）。执行者：`npm run verify:limits`（A/C/E 段）与 `npm run verify:still-benchmark`；⚠ 两者判的都是**计划**，盘上真有 PNG 要 `STRICT_STILLS=1` 真渲染。`npm run contact-sheet` 把 manifest 的计划帧与盘上真图对账，写出 `artifacts/<pid>/qc/media_index.json` 与 `contact_sheet.html`（点开任一图等于放大看那一帧），并作为 `media` 字段进 qc-agent 的 payload —— 它是「看图」的**通道**，不判画面好坏；没有真渲 still 时如实写 `PLANNED-ONLY`。

### QC
Render → Frame Metrics → Motion →画面文字出处（阻断）→ Agent QC → QC → Repair → Recheck。Repair 必须保留 `repair-plan.json`、`status.json`、`source-repair.json`。支持二轮 QC，最终 delivery 才能通过 production gate。

分镜合规审计必须先于 QC 落盘：`npm run plan-audit`（`scripts/plan-audit.mjs`）写出 `artifacts/<pid>/qc/plan_audit.json`，而 `scripts/qc.mjs` 在它缺失时把 `plan_audit_missing` 记成**阻断**项。一键链里它排在 `npm run qc` 之前、以容忍方式调用 —— 审计自己在「分镜矛盾」时非零退出，那是留给 `npm run repair-cycle` 消化的输入，不是把链掐死在中途的理由。执行者：`scripts/verify-skill.mjs` 第 4 节，断言顺序（plan-audit 在 qc 之前）、调用形态（必须 runSoft）与 repair-cycle 仍在链上。

阻断项：双比例 Frame Metrics、Motion、**画面文字出处**、QC、Repair / Recheck、tts-word-boundary、Delivery checksum、still manifest 与 `verify:production`。

非阻断项：`visual-pixel-v1` Visual Regression。它的参考资产是 64×36 合成图、embedding 是确定性像素描述子而非语义模型，实测与画面质量反向相关（画面更密更实则分数更低），因此只作为 run-to-run 回归记录，**不参与交付判定**。它的通过不代表质量，只代表没有异常漂移。

## 一键入口
`npm run skill -- "TOPIC" --source URL --auto-approve`

非 auto 模式每到一个 checkpoint 都停，并输出：
`npm run checkpoint -- <checkpoint> approved`
然后使用 `npm run skill -- ... --resume` 继续。停止时保留 workspace，完整结束后再恢复原 demo fixture。

## 完成定义
双比例成片、Frame Metrics、Motion、画面文字出处（text provenance）、QC、Repair、tts-word-boundary、Delivery checksum、still manifest 与 `verify:production` 全部通过。

Visual Regression 不在完成定义内，它是非阻断回归记录。

### 画面文字出处（阻断）
对应 anything2explainer 的硬性原则 2「事实有出处」与样片 QC「画面英文/数字逐个核对调研文档」：

```text
A1 IR 文案      —— 每个 scene 的 elements[*].text 必须能在解说词里找到；其中的数字必须能在脚本或调研文档里找到
A2 画面真文案   —— 经 src/shots/plan.mjs 归一后真会上画面的 hero/support 文案：数字一律要有出处（白名单豁免不了）；
                  非数字又没出处的（如 hero-overlong 兜底把 narrative_job 的 explain/hook 画上主角位）出声不阻断
B  字面量白名单 —— 渲染源码里所有会上画面的硬编码文案必须登记在 fixtures/visual-literals.json；
                  扫描器自带 7 条通道自检，一条都扫不到时本门直接 FAIL（防"扫不到东西所以全绿"）
C  双比例一致  —— 同一 scene 在 16:9 / 9:16 的时长、顺序、变体必须一致
```

命令：`npm run verify:text-provenance`（新增白名单用 `-- --write`，`--write` 只写现在真扫到的，历史幽灵条目会被剪掉）。
它防的是"画面出现无出处文案"这一类回归，不代表审美达标。细则与实测破口见 `docs/knowledge/research-brief.md`。
