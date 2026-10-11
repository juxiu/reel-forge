# 分镜源表（骨架由 scripts/skill.mjs 生成，本片为 authored 24 镜 / 4 组）

帧号令牌由 npm run storyboard（scripts/render_storyboard.py）换成真实帧号；selfcheck 只认「continuous:」「hold:」这两个**标签存在**与 hold 的帧数，不认内容 —— 画面到底有没有持续动作只能看片。
「画面」列写的是本镜实际使用的 stage-kit 拓扑（kind 必须与该镜 SCxx.jsx 的 recipe.stage.kind 一致，由 npm run verify:authored-shots 逐字段核对）。

# 白名单（写了镜头号才允许该镜头用对应效果；留空=一律不许，selfcheck 会按 0 次判）
闪烁白名单：
扫光白名单：

# 分镜表
| SC | 起–止 | 节拍 | 画面 | 动效 |
| --- | --- | --- | --- | --- |
| SC01 | {S01.from}–{S01.to} | 通用 Agent 缺方法 | pipeline3 三段工序：通用能力→缺口→容器；阶段徽章 + 格内进度条 | continuous: 格内进度条推进 + 紫度在槽间交接（11f 爬坡）; hold: 36f |
| SC02 | {S02.from}–{S02.to} | 技能就是一个文件夹 | causechain 纵向因果：容器→SKILL.md→动态加载 | continuous: 纵向轨道光点行进 + 焦点交接; hold: 36f |
| SC03 | {S03.from}–{S03.to} | 重复粘贴的指令 | comparetable 双列对照：提示词列 vs 技能列 | continuous: 逐行焦点交接 + 整行框换色; hold: 36f |
| SC04 | {S04.from}–{S04.to} | 正文按需读入 | layerstack 三层层叠：常驻描述 / 命中正文 / 按需资料 | continuous: 层次板错位展开后逐层点亮; hold: 36f |
| SC05 | {S05.from}–{S05.to} | 工具与技能的边界 | splitrows 左右两列对置：工具与插件 / 技能 | continuous: 中缝竖分隔画入 + 逐行紫高亮交接; hold: 36f |
| SC06 | {S06.from}–{S06.to} | 开放标准可移植 | orbit 中心节点 + 椭圆轨道节点 + 转动扫描线 | continuous: 扫描线绕轨道转动 + 焦点交接; hold: 36f |
| SC07 | {S07.from}–{S07.to} | 技能目录长这样 | layerstack 目录层级：SKILL.md 必需 + 三个可选目录 | continuous: 四层层叠依次错位展开 + 焦点交接; hold: 36f |
| SC08 | {S08.from}–{S08.to} | 三个目录各管一件事 | orbit 中心目录 + 三个轨道节点（scripts/references/assets） | continuous: 扫描线转动 + 焦点交接; hold: 36f |
| SC09 | {S09.from}–{S09.to} | SKILL.md 分成两段 | comparetable 元数据段 vs 指令段对照表 | continuous: 逐行焦点交接 + 整行框换色; hold: 36f |
| SC10 | {S10.from}–{S10.to} | 像给新同事写指南 | citeside 左主张（入职指南）+ 右侧三张要点卡扇出 | continuous: 主张↔来源卡交替点亮 + 连接线逐张画入; hold: 36f |
| SC11 | {S11.from}–{S11.to} | 渐进式披露三层 | ladder 竖向梯子三档：描述→正文→附属文件 | continuous: 横档依次画入 + 逐档点亮; hold: 36f |
| SC12 | {S12.from}–{S12.to} | 常驻只有一小段描述 | reshape 大集合压成小常驻形，结果标在上方 | continuous: 形变残留聚焦在高亮两形之间交接; hold: 36f |
| SC13 | {S13.from}–{S13.to} | 第一步是发现 | pipeline3 扫描→匹配→候选三步 | continuous: 阶段进度条推进 + 焦点交接; hold: 36f |
| SC14 | {S14.from}–{S14.to} | 只有相关才访问 | ballot 三候选并排，选中项落勾 | continuous: 候选进度条推进 + 焦点交接; hold: 36f |
| SC15 | {S15.from}–{S15.to} | 只加载最小一部分 | reshape 全部内容压成最小片段 | continuous: 形变残留聚焦在高亮两形之间交接; hold: 36f |
| SC16 | {S16.from}–{S16.to} | 干活的是脚本 | terminal 窗口逐行打字 + 行级高亮 | continuous: 等宽行逐行打字 + 行级紫高亮扫过; hold: 36f |
| SC17 | {S17.from}–{S17.to} | 命中才付成本 | comparetable 常驻 vs 命中时对照表 | continuous: 逐行焦点交接 + 整行框换色; hold: 36f |
| SC18 | {S18.from}–{S18.to} | 技能能叠在一起 | orbit 中心任务 + 环绕的技能节点 | continuous: 扫描线转动 + 焦点交接; hold: 36f |
| SC19 | {S19.from}–{S19.to} | 描述没写好就不触发 | citeside 左主张（没被触发）+ 右侧失败原因卡 | continuous: 主张↔来源卡交替点亮 + 连接线逐张画入; hold: 36f |
| SC20 | {S20.from}–{S20.to} | 描述要写清触发时机 | ladder 三档：触发时机 / 适用场景 / 能力边界 | continuous: 横档依次画入 + 逐档点亮; hold: 36f |
| SC21 | {S21.from}–{S21.to} | 什么时候值得建技能 | ballot 三候选并排，选中项落勾 | continuous: 候选进度条推进 + 焦点交接; hold: 36f |
| SC22 | {S22.from}–{S22.to} | 把专长打包成能力 | reshape 碎片 Agent 压成一个通用能力形 | continuous: 形变残留聚焦在高亮两形之间交接; hold: 36f |
| SC23 | {S23.from}–{S23.to} | 自动与点名两种调用 | splitrows 自动加载 vs 点名调用 | continuous: 中缝竖分隔画入 + 逐行紫高亮交接; hold: 36f |
| SC24 | {S24.from}–{S24.to} | 从一个文件夹开始 | causechain 收束：文件夹→方法论→入职指南 | continuous: 纵向轨道光点行进 + 焦点交接; hold: 36f |