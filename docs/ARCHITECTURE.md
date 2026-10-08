# Architecture

## Control Plane

Agent 负责：
- Research
- Script
- Content QA
- Director
- Storyboard
- Visual planning
- TTS planning
- Scene DSL
- QC interpretation

Deterministic Core 负责：
- Schema validation
- Timeline math
- Layout
- Rendering
- Encoding
- Artifact storage
- Cache
- Retry

## Artifact Graph

```
Source
  ↓
ResearchSpec / ClaimGraph
  ↓
ScriptSpec
  ↓
ContentQA
  ↓
DirectorSpec
  ↓
Storyboard
  ↓
SceneDSL
  ├── VisualSpec
  └── AudioSpec
        ↓
     RenderIR
        ↓
   Renderer Adapter
     ├── Remotion
     └── HyperFrames
        ↓
      Render
        ↓
       QC
        ↓
    Delivery Package
```

## Renderer boundary

上层永远只依赖 Scene DSL / RenderIR，不直接调用 Remotion 或 HyperFrames API。

## MVP

第一阶段固定：
- 16:9
- 1280x720
- 2~8 分钟
- 技术解释 / 知识科普
- deterministic fixture 优先
