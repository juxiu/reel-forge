# 参考资料与设计来源

> 本文件记录 Reel Forge 后续生产化设计的主要外部参考。参考用于吸收工程方法与质量标准，不复制其实现或受其许可证约束的代码/资产。

## 1. anything2explainer

- 仓库：Vincentwei1021/anything2explainer
- 地址：https://github.com/Vincentwei1021/anything2explainer
- 角色：端到端 AI 视频生产方法、Agent 工作流、视觉/动效质量标准的主要参考。

### 重点吸收

1. **Agent-first 视频生产流程**
   - Research → Narration → Storyboard → Build → Render → QC。
2. **30 秒视觉预览 Gate**
   - 先验证视觉方向，再扩大到全片，降低错误方向的返工成本。
3. **并行 Build Group**
   - 将镜头拆成独立生产组，由多个 Agent 并行生成。
4. **Motion Grammar / Anti-PPT**
   - 不把 Scene DSL 当作静态幻灯片描述，而是描述状态变化、运动、镜头、视觉层级。
5. **量化视觉 QC**
   - frame metrics、motion metrics、静态自检等。
6. **QC → Repair → Re-render**
   - QC 不只是报告问题，还要驱动局部修复和重新渲染。
7. **参考成片作为质量标尺**
   - 用可执行规则和样片共同定义“什么叫合格”。

### 对 Reel Forge 的影响

将以上能力映射为：
- Beat Graph / Rich Storyboard
- Visual Primitive + Motion System
- Preview Gate
- Parallel Agent Build
- Pixel / Motion QC
- Scoped Repair Loop

---

## 2. Pluvio / rnskill

- 仓库：Pluviobyte/rnskill
- 地址：https://github.com/Pluviobyte/rnskill
- 角色：Skill 化内容生产操作系统、Production Director、Provider/工具编排、HyperFrames/HeyGen/IndexTTS2 生产实践的主要参考。
- 配套技术选型：Codex + HyperFrames + HeyGen + IndexTTS2。

### 重点吸收

1. **Skill = 明确职责 + 输入/输出 + 执行规则 + 质量门**
   - 每个 Skill 做一件专业工作。
2. **Production Director**
   - 总导演读取项目契约，并路由 TTS、视觉、动效、字幕、QC 等下游能力。
3. **Skill chaining**
   - 一个用户意图可以触发多阶段自动流水线，而不是让用户手工逐步调用工具。
4. **真实 TTS → 词级时间戳**
   - 字幕和画面时间必须来自真实音频/ASR，禁止按字数估算。
5. **人机确认 Gate**
   - 例如试听音频确认、封面选择等高成本/不可逆操作。
6. **HyperFrames**
   - 作为代码驱动动效生产后端，而不是只生成静态 HTML。
7. **生产状态与归档**
   - 项目状态、交接契约、完成后 QC、归档是生产系统的一部分。
8. **内容生产生态**
   - 选题、洗稿、下载、数字人、封面、复盘等属于上层内容工作台，而非渲染内核本身。

### 对 Reel Forge 的影响

优先吸收：
- Production Director / Agent Runtime
- Skill / Provider contract
- Real TTS + word alignment
- Human approval gates
- HyperFrames backend
- Persistent artifact/state management

暂不整体复制：
- 选题管理
- 社交平台下载
- 数字人业务流程
- 封面/图文工作台
- 发布后运营复盘

这些可以作为未来上层应用，而不是 Reel Forge 核心渲染引擎的硬依赖。

---

## 3. 设计原则

两个参考项目共同验证了一个方向：

**LLM/Agent 负责意图、研究、判断和规划；确定性工具负责执行、验证、渲染和持久化。**

Reel Forge 因此继续坚持：

```
Agent / Skill Layer
        ↓
Typed Artifact Contracts
        ↓
Deterministic Core
        ↓
Renderer / Media Providers
        ↓
Pixel / Editorial QC
        ↓
Artifact Graph / Delivery
```

目标不是复制某一个参考项目，而是把它们的生产方法抽象成可替换的工程能力。
