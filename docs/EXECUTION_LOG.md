# 执行记录

## 生产化重构

旧 MVP workflow、伪 AudioSpec 和 HTML-only HyperFrames evaluation 已删除。

已新增：
- Production Director execution state 与 Agent command provider。
- 真实 source fetch / claim graph。
- Rich Beat Graph / Scene DSL / RenderIR。
- Edge TTS 真实音频与 WordBoundary、字幕 pipeline。
- 并行 worker/build pool、content-addressed Artifact Store。
- 30 秒 preview approval gate。
- ffprobe、ffmpeg motion/black-frame media QC。
- 16:9 / 9:16 双画幅真实 Remotion composition。
- checksum delivery manifest。
- QC Issue Graph / Repair Plan。
- HyperFrames 项目级 backend contract。

仍未宣称完成：
- live LLM/script generation 的凭据集成测试。
- 独立 ASR provider 验证。
- HyperFrames runtime render。
- Repair Agent 实际修复与重渲染闭环。
- 跨进程分布式锁与对象存储。

任何未通过真实验收的阶段不得标记 DONE。
