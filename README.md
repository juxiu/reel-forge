# reel-forge

Agent-native 视频生产引擎。

当前先按 anything2explainer 的生产过程完成可用功能，再做优化。

本仓库同时提供根目录 SKILL.md，可作为 Agent Skill 执行规范：Agent 负责需求理解、Research、Narration、导演与质量判断，脚本负责确定性流水线、渲染、QC、Repair 与 Delivery。结构参考 anything2explainer 的 Skill 形态，但实现与画面保持本项目原创。

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
10. Visual Regression：scene/ratio 采样帧，与 positive / anti-reference benchmark 做 visual embedding similarity。
11. Repair / Recheck：问题按 node / ratio 局部修复，再复验全部质量层。
12. Delivery：checksum manifest 和归档。

参考方法来自 anything2explainer：它明确采用 Research → Narration & Timeline → Storyboard → Overlays & primitives → G1 Pilot → Parallel Build → Render → QC & fixes → Delivery，并以完整样片的源码、报告和成片帧作为质量标尺。

核心边界仍然保持：Agent/Skill 负责理解、研究、导演、判断和修复；Typed Artifact Contract 是稳定接口；真实媒体时间来自真实音频/WordBoundary，不允许按字数伪造。

## 完整生产链

Research -> Narration / Timeline -> Storyboard -> Overlay / Primitives -> G1 Pilot / 30s Preview -> Parallel Build -> Render 16:9 + 9:16 -> Frame/Motion -> Visual Regression -> Quantitative QC -> Scoped Repair / Recheck -> Delivery

常用入口：
- npm run run-flow：从 Research 跑到 Pilot 前并停在审批点。
- npm run skill -- "Explain HTTP Digest Fields" --source https://www.rfc-editor.org/rfc/rfc9530.html --auto-approve：从主题到交付的一键 Skill 执行入口。
- npm run preview：生成 Pilot 预览。
- npm run pilot：创建 Pilot approval artifact。
- npm run checkpoint -- pilot-preview approved：批准 Pilot。
- npm run render：通过审批后渲染双比例成片。
- npm run visual-regression -- --frames artifacts/frames/16x9 --render-ir fixtures/render-ir-16x9.json --out artifacts/<project>/qc/visual_regression_16x9.json：运行 scene-level visual regression。
- npm run qc：汇总媒体、帧级、动作级、视觉 benchmark QC。
- npm run repair-cycle：按 scene / ratio 执行 scoped repair，并在重新渲染后重新计算全部质量报告。
- npm run deliver：生成 checksum delivery manifest。
- npm run still -- <frame>：渲染指定帧静帧用于目检。

生产过程中的 artifact 统一归档到 artifacts/<project_id>/，包括 research、script、beats、scene、render-ir、audio、build-groups、runtime、qc、repair 和 delivery。

## Visual Benchmark

fixtures/visual-benchmark.json 定义：
- positive references：network-flow、structured-mechanism、transformation；
- anti references：static-card、clutter、decorative-motion；
- visual-pixel-v1 embedding；
- pass / reference / excellent / anti-fail 阈值。

参考资产是仓库内置的原创 benchmark，不复制 anything2explainer 的具体帧。后续可以替换为人工精选的真实 golden frames，保持相同 manifest contract。

Shot Score 当前统一汇总：
semantic / hero / motion / composition / light / safety / reference_similarity / visual_complexity / text_density / hero_consistency / layout_stability。

Reference similarity 不替代结构化视觉规则；两者共同进入现有 shot-score → QC → Repair 链。

参考生产流程与完成定义：docs/REFERENCE_PROCESS.md。

当前项目状态与未完成事项：docs/PROJECT_STATUS.md。

视觉语法与质量基线：docs/VISUAL_GRAMMAR.md。
