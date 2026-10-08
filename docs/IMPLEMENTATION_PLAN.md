# Reel Forge 生产化实施计划

执行顺序固定为：
Research -> Narration/Timeline -> Storyboard -> Overlay/Primitives -> G1 Pilot -> Parallel Build -> Render -> Quantitative QC -> Repair/Recheck -> Delivery。

## 当前优先级

### 1. 先完成功能
- 输入 project + narration/script。
- 真实 source fetch。
- 真实 TTS + WordBoundary。
- script/timeline.json。
- storyboard_src.md -> 分镜表.md。
- G1 pilot / 30 秒 preview / approval gate。
- G1...Gn build group manifest。
- Remotion 16:9 + 9:16。
- frame metrics / motion / media QC。
- QC issue -> repair plan。
- delivery manifest。

### 2. 后续优化
再做 live LLM provider、独立 ASR、HyperFrames runtime、像素级 repair agent、对象存储、分布式锁、复杂视觉图元和性能优化。

本阶段不为未来优化预留复杂抽象，不为了兼容旧 MVP 保留双路径。
