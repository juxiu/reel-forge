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
Render → Frame Metrics → Motion → Visual Regression → Agent QC → QC → Repair → Recheck。Repair 必须保留 `repair-plan.json`、`status.json`、`source-repair.json`。支持二轮 QC，最终 delivery 才能通过 production gate。

## 一键入口
`npm run skill -- "TOPIC" --source URL --auto-approve`

非 auto 模式每到一个 checkpoint 都停，并输出：
`npm run checkpoint -- <checkpoint> approved`
然后使用 `npm run skill -- ... --resume` 继续。停止时保留 workspace，完整结束后再恢复原 demo fixture。

## 完成定义
双比例成片、Frame Metrics、Motion、Visual Regression、QC、Repair、tts-word-boundary、Delivery checksum、still manifest 与 `verify:production` 全部通过。
