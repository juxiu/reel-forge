# reel-forge

Agent-native 视频生产引擎。

当前先按 anything2explainer 的生产过程完成可用功能，再做优化。

生产过程：
1. Research：来源、事实、证据。
2. Narration：定稿文案、段落和字幕块。
3. TTS/Timeline：真实配音、WordBoundary、帧级时间轴。
4. Storyboard：从时间轴 token 生成分镜表。
5. Overlay/Primitives：统一字幕、HUD、进度条、视觉图元。
6. Pilot：先生成 G1 / 前 30 秒 preview，并暂停等审批。
7. Parallel Build：按 G1…Gn 拆镜头并行生产。
8. Render：16:9 / 9:16 成片。
9. Quantitative QC：frame metrics / motion / media probe。
10. Repair / Recheck：问题按 node 局部修复，再复验。
11. Delivery：checksum manifest 和归档。

参考方法来自 anything2explainer：它明确采用 Research → Narration & Timeline → Storyboard → Overlays & primitives → G1 Pilot → Parallel Build → Render → QC & fixes → Delivery，并以完整样片的源码、报告和成片帧作为质量标尺。

核心边界仍然保持：Agent/Skill 负责理解、研究、导演、判断和修复；Typed Artifact Contract 是稳定接口；真实媒体时间来自真实音频/ASR，不允许按字数伪造。


## 完整生产链

Research -> Narration / Timeline -> Storyboard -> Overlay / Primitives -> G1 Pilot / 30s Preview -> Parallel Build -> Render 16:9 + 9:16 -> Quantitative QC -> Scoped Repair / Recheck -> Delivery

常用入口：
- npm run run-flow：从 Research 跑到 Pilot 前并停在审批点。
- npm run preview：生成 Pilot 预览。
- npm run pilot：创建 Pilot approval artifact。
- npm run checkpoint -- pilot-preview approved：批准 Pilot。
- npm run render：通过审批后渲染双比例成片。
- npm run qc：汇总媒体、帧级和动作级 QC。
- npm run repair：根据失败报告对 RenderIR 做局部修复。
- npm run deliver：生成 checksum delivery manifest。
- npm run still -- <frame>：渲染指定帧静帧用于目检。

生产过程中的 artifact 统一归档到 artifacts/<project_id>/，包括 research、script、beats、scene、render-ir、audio、build-groups、runtime、qc、repair 和 delivery。
