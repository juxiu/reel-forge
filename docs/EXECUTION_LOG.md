# 执行记录

## 生产化重构

旧 MVP workflow、伪 AudioSpec 和 HTML-only HyperFrames evaluation 已删除。

当前新增并验证：
- Production Director execution state。
- Agent command provider。
- 真实 source fetch / claim graph。
- Rich Beat Graph / Scene DSL / RenderIR。
- Edge TTS 真实音频与 WordBoundary provider。
- 字幕 pipeline。
- 并行 worker pool与 content-addressed Artifact Store。
- ffprobe 媒体探针、ffmpeg motion analysis。
- 16:9 / 9:16 双画幅真实 Remotion composition。
- checksum delivery manifest。

仍未宣称完成：
- live LLM/script generation。
- 真实 ASR 独立验证。
- HyperFrames runtime backend。
- Pixel/Motion QC 的完整 repair agent 闭环。
- 跨进程分布式锁与对象存储。

任何未通过真实验收的阶段不得标记 DONE。
