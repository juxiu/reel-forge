# 参考资料与设计来源

Reel Forge 的生产化方向以以下公开资料为主要外部参考。这里只吸收公开的工程方法、工作流思想和质量标准，不复制受许可证限制的代码、资产、账号配置或私有数据。

## 1. anything2explainer

- 仓库：https://github.com/Vincentwei1021/anything2explainer
- 角色：端到端 Agent 视频生产、Storyboard、并行 Build、视觉动效规范、量化 QC 和修复闭环的主要参考。

重点吸收：

- Research → Narration → Storyboard → Build → Render → QC 的完整生产链。
- 30 秒 preview gate：先验证视觉方向，再扩大生产。
- G1…Gn / build groups：把镜头拆成独立生产组并行执行。
- Motion Grammar / Anti-PPT：镜头必须有状态变化、运动、视觉层级和叙事目的。
- frame / motion / self-check：把“好不好看”转成机器可执行的质量门。
- QC → Repair → Re-render：质量检查必须能够驱动局部修复。
- 参考成片与明确规则共同构成质量标准。

对 Reel Forge 的落地：

P4 Director/Beat Graph、P5 Preview/Parallel Build、P6 Pixel/Motion QC、P6 Repair Loop。

## 2. Pluvio / rnskill

- 仓库：https://github.com/Pluviobyte/rnskill
- X 文章：https://x.com/Pluvio9yte/status/2081648099680743554
- 角色：Skill 化内容生产、Production Director、真实 TTS/字幕、HyperFrames 和生产状态管理的主要参考。
- 文章中公开的技术选型：Codex + HyperFrames + HeyGen + IndexTTS2。

重点吸收：

- **Skill contract**：一个 Skill 明确自己的职责、输入、输出、执行规则和质量门。
- **Production Director**：总导演读取项目契约，按需路由 TTS、字幕、视觉、动效、QC 等下游能力。
- **Skill chaining**：用户给一个高层意图，由导演自动串起多个专业环节。
- **真实音频时间轴**：TTS 后通过真实音频/ASR 得到词级时间戳；禁止按字数估算字幕时间。
- **人机确认 Gate**：试听音频、封面、视觉方向等高成本或不可逆步骤在确认后才继续。
- **HyperFrames**：作为代码驱动动效生产后端，而不只是输出静态 HTML。
- **生产状态与归档**：项目状态、交接契约、QC、归档属于生产系统本身。
- **Provider/Skill 解耦**：上层工作流不应该被具体工具实现绑死。

对 Reel Forge 的落地：

P1 Agent Runtime/Director、P3 TTS/Captions、P5 HyperFrames、P7 Persistent Production。

## 3. 不直接复制的内容

以下能力在参考项目中存在，但不是 Reel Forge 核心引擎的硬依赖：

- 选题管理
- 社交平台视频下载
- 视频洗稿
- HeyGen 数字人业务流程
- 封面生成
- 小红书图文
- 发布后运营复盘
- 特定作者的视觉 IP / 账号资产
- 特定 provider 的私有配置

这些可以作为未来上层应用接入，不进入核心 Renderer/Artifact Contract。

## 4. 统一抽象

两个参考项目共同支持的核心架构：

```text
Agent / Skill Layer
        ↓
Typed Artifact Contracts
        ↓
Deterministic Media Core
        ↓
Renderer / Media Providers
        ↓
Pixel / Editorial QC
        ↓
Scoped Repair
        ↓
Artifact Graph / Delivery
```

Reel Forge 的目标是把这个抽象做成可替换、可恢复、可验证的生产基础设施，而不是复制任一项目。