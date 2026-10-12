# 分镜源表（骨架由 scripts/skill.mjs 生成）

帧号令牌由 npm run storyboard（scripts/render_storyboard.py）换成真实帧号；标着「待填」的三列必须人/agent 填，selfcheck 只认「continuous:」「hold:」这两个**标签存在**与 hold 的帧数，不认内容 —— 画面到底有没有持续动作只能看片。

# 白名单（写了镜头号才允许该镜头用对应效果；留空=一律不许，selfcheck 会按 0 次判）
闪烁白名单：
扫光白名单：

# 分镜表
| SC | 起–止 | 节拍 | 画面 | 动效 |
| --- | --- | --- | --- | --- |
| SC01 | {S01.from}–{S01.to} | 「Agent」这个词，在不同人嘴里，指的东西并不 | 三段管线：同一个词→几种定义→先分清 / 中轴横排 / hero 190 | continuous: 三站逐段点亮 + 焦点沿管线交接; hold: 36f |
| SC02 | {S02.from}–{S02.to} | 有人说的 agent，是完全自主的系统，长期独立 | 因果链：完全自主→长期独立运行→用工具完成复杂任务 / 斜向链 / hero 190 | continuous: 自主循环持续旋转 + 工具节点逐个点亮; hold: 36f |
| SC03 | {S03.from}–{S03.to} | 也有人用同一个词，指按预定流程走的，更程式化的实 | 对比表：自主系统 vs 预定流程 / 双栏四行 / hero 200 | continuous: 两栏逐行对照亮起 + 胜侧描边加强; hold: 36f |
| SC04 | {S04.from}–{S04.to} | Anthropic 把这些变体，统一叫 agen | 层叠：统称 agentic systems→架构分界线→两种走法 / 纵向三层 / hero 200 | continuous: 层片依次压入 + 分界线扫亮; hold: 36f |
| SC05 | {S05.from}–{S05.to} | 分界线的一侧是 workflow，LLM 和工具 | 分列：代码路径编排 LLM 与工具 / 左右两带 / hero 190 | continuous: 路径连线流动 + 工具块随节拍弹入; hold: 36f |
| SC06 | {S06.from}–{S06.to} | 另一侧才是严格的 agent，系统自主决定步骤， | 轨道：agent 居中带三项自主特征 / 椭圆轨道 / hero 210 | continuous: 轨道公转 + 节点相位错开; hold: 36f |
| SC07 | {S07.from}–{S07.to} | 过去一年，Anthropic 与数十个团队，一起 | 层叠：一年→数十团队→一线经验→反复验证 / 纵向四层 / hero 200 | continuous: 层片逐级落下 + 经验徽章逐级点亮; hold: 36f |
| SC08 | {S08.from}–{S08.to} | 结论反复出现，最成功的实现，既不用复杂框架，也不 | 轨道：共同点居中，框架/库/模式环绕 / 椭圆轨道 / hero 210 | continuous: 轨道公转 + 否定项淡出退场; hold: 36f |
| SC09 | {S09.from}–{S09.to} | 他们用的是，简单、可组合的模式，事实证明，简 | 对比表：复杂框架 vs 简单模式 / 双栏四行 / hero 200 | continuous: 两栏逐行对照 + 胜侧光晕增强; hold: 36f |
| SC10 | {S10.from}–{S10.to} | 与其为每个场景，各造一个定制 agent，不如用 | 引证：定制 agent 主体 + 三条侧证 / 主卡右证 / hero 195 | continuous: 侧证逐条滑入 + 主体徽章微缩放; hold: 36f |
| SC11 | {S11.from}–{S11.to} | 写死的路径负责可控，交给模型的负责灵活，先想清楚 | 阶梯：写死路径→交给模型→按任务选 / 三级台阶 / hero 190 | continuous: 台阶逐级亮起 + 焦点上行; hold: 36f |
| SC12 | {S12.from}–{S12.to} | 但通用能力不等于能干活，真实工作需要，程序性知识 | 变形：通用能力→程序性知识 / 圆内双态 / hero 200 | continuous: 圆形渐变重塑 + 图标交接翻转; hold: 36f |
| SC13 | {S13.from}–{S13.to} | 模型能力在提升，通用 agent 已经能，和完整 | 三段管线：模型变强→完整环境→直接交互 / 中轴横排 / hero 190 | continuous: 三站逐段点亮 + 数据粒子沿线流; hold: 36f |
| SC14 | {S14.from}–{S14.to} | 比如 Claude Code，靠本地代码执行和文 | 三选一：Claude Code 被选中 / 横排票卡 / hero 185 | continuous: 票卡依次入位 + 选中卡描边脉冲; hold: 36f |
| SC15 | {S15.from}–{S15.to} | agent 越强大，就越需要可组合、可扩展，可移 | 变形：通用能力→领域专长 / 圆内双态 / hero 200 | continuous: 圆形渐变重塑 + 盾形徽章盖入; hold: 36f |
| SC16 | {S16.from}–{S16.to} | 答案是 Agent Skills，指令、脚本和资 | 终端：需要专长→扫描 skills→按需加载 / 单列终端 / hero 200 | continuous: 命令行逐行打出 + 光标持续闪烁; hold: 36f |
| SC17 | {S17.from}–{S17.to} | 专长不再散落在提示词里，而是被打包成，可组合的资 | 对比表：散落提示词 vs 打包资源 / 双栏四行 / hero 200 | continuous: 两栏逐行对照 + 胜侧描边加强; hold: 36f |
| SC18 | {S18.from}–{S18.to} | 一个技能就是一个目录，一份 SKILL.md，加 | 轨道：SKILL.md 居中，指令/脚本/资料环绕 / 椭圆轨道 / hero 210 | continuous: 轨道公转 + 三类节点错相闪亮; hold: 36f |
| SC19 | {S19.from}–{S19.to} | 给 agent 写技能，就像给新员工，准备一份入 | 引证：入职指南主体 + 三条写法侧证 / 主卡右证 / hero 190 | continuous: 侧证逐条滑入 + 主卡徽章微缩放; hold: 36f |
| SC20 | {S20.from}–{S20.to} | 把你的专长打包进去，通用 agent，就变成贴合 | 阶梯：通用 agent→装入专长→变成专用 / 三级台阶 / hero 190 | continuous: 台阶逐级亮起 + 焦点上行; hold: 36f |
| SC21 | {S21.from}–{S21.to} | 任何人都能，捕获并分享程序性知识，来专门化自己的 | 三选一：捕获程序性知识被选中 / 横排票卡 / hero 185 | continuous: 票卡依次入位 + 选中卡描边脉冲; hold: 36f |
| SC22 | {S22.from}–{S22.to} | 这套东西已发布为，开放标准，能力可以跨平台 | 变形：私有绑定→开放标准 / 圆内双态 / hero 200 | continuous: 圆形渐变重塑 + 链路图标点亮; hold: 36f |
| SC23 | {S23.from}–{S23.to} | 回到开头的问题，agent 是什么，它是一条谱系 | 分列：写死的流程 vs 自主的系统 / 左右两带 / hero 190 | continuous: 两带对向滑入 + 谱系线贯通; hold: 36f |
| SC24 | {S24.from}–{S24.to} | 框架会过时，模式不会，把专长装进，可组合的容器， | 因果链：框架过时→模式不灭→专长入容器 / 斜向链 / hero 190 | continuous: 链节逐段点亮 + 末环光晕收束; hold: 36f |
