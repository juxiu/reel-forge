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
G1…Gn 为独立构建角色，Agent provider 配置后每组分别收到 Build Agent task；任务明确只修改 `src/shots/Gn/**`，并要求 6 张 still + 30 帧测渲。CI 无 Agent 时使用 deterministic builder，但产物必须明确标注 agent_mode=deterministic。

### TTS
支持 edge、kokoro、piper、kokoro_onnx 与用户 wav 能力；实际 production gate 仍以 tts-word-boundary 为唯一生产时间轴口径。无词边界引擎必须通过逐块/逐词适配层提供真实块边界，禁止伪装为 external ASR。

### B-roll
可选 `renderIR.footage[]`，素材必须来自 `public/assets/<slug>/`，并登记 source/sha/license/purpose manifest。单帧最多 1 个 OffthreadVideo。

### Still / 性能
每镜头固定 6 个 still 采样点；高光时刻可扩展到 10 张。每组至少有一个 30 帧测渲契约。严格模式 `STRICT_STILLS=1` 时实际执行 still 渲染。

### QC
Render → Frame Metrics → Motion →画面文字出处（阻断）→ Agent QC → QC → Repair → Recheck。Repair 必须保留 `repair-plan.json`、`status.json`、`source-repair.json`。支持二轮 QC，最终 delivery 才能通过 production gate。

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
A. 事实溯源    —— 每个 scene 的 elements[*].text 必须能在解说词里找到；其中的数字必须能在脚本或调研文档里找到
B. 字面量白名单 —— 渲染源码里所有会上画面的硬编码文案必须登记在 fixtures/visual-literals.json
C. 双比例一致  —— 同一 scene 在 16:9 / 9:16 的时长、顺序、变体必须一致
```

命令：`npm run verify:text-provenance`（新增白名单用 `-- --write`）。它防的是"画面出现无出处文案"这一类回归，不代表审美达标。
