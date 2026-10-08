# 执行记录

## 生产化重构
旧 MVP workflow、伪 AudioSpec 和 HTML-only HyperFrames evaluation 已删除。

本轮新增：
- Production Director pipeline 与持久化 execution state。
- 明确的 Agent command provider 入口。
- 真实 source fetch / claim graph。
- Rich Beat Graph / Scene DSL / RenderIR。
- 可替换 TTS provider；Edge TTS 能提供真实音频与 WordBoundary。
- 并行 worker pool、content-addressed Artifact Store。
- ffprobe 媒体探针、ffmpeg motion analysis、delivery checksum。

当前：
- P1/P2/P4：核心代码已落地，但 live Agent/LLM 脚本生成尚未以凭据集成测试宣称完成。
- P3：Edge TTS provider 可执行；ASR 词级验证仍缺。
- P5：scheduler/Remotion 已落地；HyperFrames 仍需真实 runtime。
- P6：媒体 QC 基础已落地；Repair Agent 闭环待接。
- P7：Artifact Store/manifest 已落地；跨进程分布式锁与对象存储待接。

未通过真实验收的阶段不得标记 DONE。
