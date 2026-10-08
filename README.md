# reel-forge

Agent-native 视频生产引擎。

目标：给定主题或脚本，完成研究、真实配音、词级时间轴、视觉导演、并行镜头生产、真实渲染、像素/运动/编辑质检、局部修复，并交付 16:9 与 9:16 成片。

边界：Agent/Skill 负责理解、研究、导演、判断和修复；Typed Artifact Contract 是唯一稳定接口；确定性媒体核心负责时间轴、布局、渲染、编码、缓存和验证；Provider 可替换且不能污染上层契约；真实媒体时间来自真实音频/ASR，不允许按字数伪造。

计划：docs/IMPLEMENTATION_PLAN.md
参考：docs/REFERENCES.md
