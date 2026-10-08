# Reel Forge 视觉语法与质量基线

reel-forge 的视觉生产以 anything2explainer 的公开规则为参考，但不复制其具体镜头源码。目标是把审美规则逐步变成可检查的导演约束。

## 镜头语法

每个 beat 必须具备：

- 一个明确主角（hero），主角尺寸至少为 large。
- 一个可识别的视觉意图（asset_need）。
- 明确的状态变化：enter -> transform -> settle。
- 一个真实运镜类型：push / pan / slide / parallax / orbit / zoom。
- 正值运镜幅度。
- 至少 4 秒的画面单元预算；短句并入相邻镜头，不单独制造镜头。

## 持续动作

进入后必须发生状态变化，不能只依赖静态卡片。后续会继续把以下规则转成 lint：

1. 元素入场后持续动作不得超过 3 秒无变化。
2. 镜头末拍至少保留 30 帧稳定期。
3. 运镜结束后再进入稳定期。
4. Glitch / LightSweep 必须进入白名单并限制次数。
5. 字幕与 HUD 使用公共层，镜头源码不重复绘制。

## 构图与光

- 黑底幕底为默认舞台。
- 主角获得主光，配角不抢光。
- 紫色用于当前重点，不作为装饰噪声。
- 内容区保持单一视觉焦点。
- 章节之间尽量通过同一主角或象征物承接，而不是硬切报幕卡。

## 事实与叙事

- 画面中的数字、年份、英文术语和组织名称必须来自 Research claim/evidence。
- 一个项目尽量使用一个贯穿示例语境。
- Narration、Storyboard、RenderIR 必须共享同一时间轴来源。
- 真实音频/WordBoundary 是时间基准，不能按字数伪造成片时间。

## 自动验收

npm run verify:visual-grammar 检查 beat 的主角、视觉意图、状态变化、运镜和最小镜头时长。

npm run verify:visual 负责现有 motion lint；两者共同构成视觉 contract。后续 QC 将继续把持续动作、稳定期、Glitch/扫光白名单、主角尺寸/光效等规则下沉为机器判定。