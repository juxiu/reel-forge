# Reel Forge 生产化实施计划

最终链路：
用户需求 -> Production Director -> Research/Script/Claim QA -> Beat Graph/Storyboard/Visual Plan -> Real TTS/Word Alignment/Captions -> Parallel Scene/Asset Build -> Scene DSL/RenderIR -> Remotion/HyperFrames -> Pixel/Motion/Editorial QC -> Scoped Repair/Re-render -> Multi-ratio Delivery/Archive

## P1 Agent Runtime + Production Director
结果：自然语言需求启动有状态、可暂停、可恢复、可观察的生产任务。
验收：typed contract、真实 provider 接口、approval、failure、retry。

## P2 Real Research + Script + Claim Graph
结果：真实来源可抓取，事实与 evidence 可追溯，脚本只能使用有证据 claim。
验收：source/claim/evidence/cache/failure。

## P3 Real TTS + Word Alignment + Captions
结果：真实音频、词级时间戳、句级字幕和字幕 QC。
硬规则：禁止按字数估时；provider 失败不得静默 fallback。

## P4 Director + Beat Graph + Visual/Motion
结果：beat 有叙事职责、主角、状态变化、运镜、文字角色、素材需求和 Anti-PPT 风险。
验收：Scene DSL 不含 renderer code；motion lint 可拦截静态镜头。

## P5 Preview + Parallel Build + Real Render
结果：先 30 秒 preview，通过后并行生产全片。
验收：至少 3 个真实 build group；失败隔离；16:9/9:16 真渲。

## P6 Pixel/Motion/Editorial QC + Repair
结果：成片级质量门能定位 node，并驱动 scoped repair/rerender。
验收：pixel/motion negative regression、retry budget、无关 Artifact cache 不变。

## P7 Persistent Production + Delivery
结果：任务可恢复、Artifact 可复用、最终包可交付和归档。
验收：中断恢复、锁、checksum、manifest、双画幅成片。

统一完成定义：真实能力运行；成功和失败都可验证；状态可观察；真实媒体经过 probe；对应 CI 通过；执行记录写入 docs/EXECUTION_LOG.md。

不符合最终结果的旧 demo、伪实现、重复契约和兼容层直接删除。
