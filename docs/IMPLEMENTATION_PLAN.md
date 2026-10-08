# Reel Forge 生产化实施计划

最终结果：给定主题或脚本，系统完成研究、真实配音、词级时间轴、视觉导演、并行生产、真实渲染、成片 QC、局部修复，并交付 16:9 与 9:16。

## P1 Agent Runtime + Production Director
runtime、execution state、provider registry、agent command adapter、approval/failure 基础已落地；live agent provider integration 未验收。

## P2 Real Research + Script + Claim Graph
真实 source fetch / source hash / claim-evidence graph 已落地；自动 script generation 仍需 live agent provider。

## P3 Real TTS + Word Alignment + Captions
Edge TTS + WordBoundary + caption pipeline 已落地；最终 ASR 独立核验仍缺。

## P4 Director + Beat Graph + Visual/Motion
Rich Beat Graph、Scene DSL、motion lint 已落地；完整视觉素材系统和 pixel-driven motion lint 仍需扩展。

## P5 Preview + Parallel Build + Real Render
parallel worker、Remotion 双画幅、真实音频接入、media render 已落地；30 秒 approval gate、真实多 agent build、HyperFrames runtime 尚未完成。

## P6 Pixel/Motion/Editorial QC + Repair
ffprobe、ffmpeg motion analysis、QC issue model 和 repair plan 已落地；pixel metric 深度分析与 Repair Agent rerender 尚未完成。

## P7 Persistent Production + Delivery
content-addressed Artifact Store、execution state、checksum manifest 已落地；跨进程锁、对象存储、断点恢复编排尚未完成。

统一完成定义：真实能力运行；成功和失败都可验证；状态可观察；真实媒体经过 probe；对应 CI 通过；执行记录写入 docs/EXECUTION_LOG.md。

不符合最终结果的旧 demo、伪实现、重复契约和兼容层直接删除。
