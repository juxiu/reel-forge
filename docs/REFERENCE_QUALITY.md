# 参考样片质量标尺

目标不是机械复制 anything2explainer，而是把其可复现的质量原则转成 Reel Forge 的机器门禁，并在此基础上继续提高。

## 正向标准

- 每个镜头只有一个主要视觉焦点。
- 视觉结构必须解释叙事，而不是只承载字幕。
- 动作必须有 enter → transform → settle。
- 语义明确时优先使用专属 variant，不允许 generic fallback 长期吞掉语义。
- 构图、光照、字幕安全区在 16:9 / 9:16 都必须成立。
- QC 问题必须能追溯到 scene → source_ref → Beat。

## 反例

- 静态 PPT 卡片。
- 与 narration 无关的装饰动画。
- 一个镜头同时存在多个竞争 Hero。
- 已有语义 variant 却退回 generic。
- 字幕压住 Hero 或关键关系。
- 修复只修改 RenderIR 而源节点保持旧状态。

## 分级

- 0.72：可交付基线。
- 0.82：参考样片级。
- 0.90：优秀目标。

真实参考帧接入后，将继续增加图像 embedding / CLIP 类视觉相似度，但结构评分不会被替代。
