# STYLE_BIBLE — reel-forge 16:9 版式与组件基线

> 本片（skill-explainer）起生效的**可执行**设计规范。每条规则都锚定一个真实常量或检查脚本，
> 不写「更精致」「更有设计感」这类不可执行的评价。真源分层：
> 色彩/字体 → [src/visual/style.mjs](../src/visual/style.mjs)；字宽换算 → [src/visual/textfit.mjs](../src/visual/textfit.mjs)；
> 分区带 → [src/shots/plan.mjs](../src/shots/plan.mjs) `defaultBands`；构图区 → [src/shots/stage-kit.jsx](../src/shots/stage-kit.jsx) `AREA`。

## 1. 画布与栅格

- 逻辑画布 1280×720 @30fps（`style.mjs W/H/FPS`）。所有拓扑坐标写**变换前**逻辑像素。
- 分区带（`plan.mjs defaultBands`，y 轴）：
  `hud 28–79` → `rail 118–162` → `内容 175–620` → `字幕 637–683` → `进度条 687–720`。
- **cameraSafe（变换后）** x∈[89,1191]、y∈[122,607]。构图是变换前坐标，中间隔一层相机逆变换：
  - 底部内容变换前 ≤ **588**（`AREA_BOTTOM_SAFE`）；
  - 横向：pan 最坏相机位已收敛到 s=1.08 / ±40px（`camera.mjs` pan 注释推导），x89–1191 的约定对全部预设成立；
  - 拓扑总宽约束写进各拓扑注释（如 pipeline3：3·bw+2·gap ≤ 1102）。

## 2. 字阶（全部从这几档取，不新造字号）

| 用途 | 字号 | 字体/字重 | 出处 |
| --- | --- | --- | --- |
| 片名 big | 118 | Audiowide 400（`FONT_WIDE`，EM 1.18） | TitleCard |
| 章卡章名 | 96（超宽降到 82） | Noto Sans SC 900 | ChapterCard |
| 形/卡主标签 | 32 | Noto 800 | Reshape/Node |
| 行标签 | 27–30 | Noto 700（活跃白 / 非活跃 `GREY_LIGHT`） | stage-kit Label |
| 镜内副标 | 30（hud 变体 22–26） | Noto 500 / Exo 2 | TechSub |
| 数字/序号徽章 | 21 | Orbitron 800 | Slot/Ballot |

- 中文标签一律 `Label`（内置 fitSize 自动缩号），`maxW` 由所在卡宽推导，禁止手写 px 截断。
- HUD 词条：中文 ≤6 字、英文副标 ≤14 字符（`Primitives.jsx` Hud 注释即门）。

## 3. 组件基线

- **卡片 Box**：radius 10（大卡 12–14）、描边 2.5、底色 `rgba(0,0,0,.42)` 由拓扑自给。
- **图标槽（icon slot）**：行内卡统一 48×48 盒、图元 s=44，盒内 flex 居中；槽位基线 = 卡内左侧 18–24px、**垂直居中**。
  图元必须消费 `s`（反例：ChunkCard 旧版忽略 s 恒画 150×92 → 溢出压卡，已修）。
- **编号徽章**：32×32 圆、21px Orbitron 800、压卡左上角 (−16,−16)。
- **图标语义**：同一镜头内不重复用同一 kind；圆形容器内只放单枚居中图标，不放网格/卡片类满幅图元。
- **同屏尺寸一致性**：同一拓扑内同级元素同尺寸同描边；体量差异必须由语义驱动并显式写注释。

## 4. 高亮分级（紫只给当前重点）

| 层级 | 视觉 | 实现 |
| --- | --- | --- |
| **主高亮（当前拍）** | 紫描边 + 紫内衬 `rgba(102,48,248,.10)` + 白字 + 单层光晕 `0 0 14px 2px @.32` | `Box glow=true`（Primitives 统一给内衬与光晕） |
| **次高亮（基准列/宿主）** | 纯紫描边、无内衬无光晕、近白字 | `border=PURPLE`，`glow=false` |
| **普通** | 灰描边 + 白色微 bloom + 灰字 | 默认 |
| **过去拍** | 主档样式 + 透明度 dim 0.55–0.66 | `isPast()` |

- 焦点时序：`focusWalk(marksOf(plan,…))` 单一来源，任意帧至多一个主高亮；拍表必须铺满整镜（tileFocus）。
- 禁止：两种以上自发光样式并存、给配角加光（光只跟主角 `Core`）。

## 5. 装饰准入规则

- 背景只有幕底：星点或点阵波（`Backdrop`），不撒碎屑、不加漂浮粒子。
- 连接线/轨道必须**连接两个信息元素**并表达关系（工序/证据/因果）；游离在构图边缘、
  不连接任何东西的虚线轴、孤点、空图标槽 = 缺陷（2026-10-12 审计问题 3/4 的判据）。
- 几何容器与其内容必须对齐：圆形内不放矩形底条/满幅网格（Reshape 弦线已删）；
  网格类图元（GridIcon）不作圆形容器的主角图标。
- 无信息目的的运动为缺陷：每个持续动效必须注明它连接/表达的关系。

## 6. 与门禁的对应

| 规则 | 检查 |
| --- | --- |
| §1 安全区/带宽 | plan-audit（buildPlan issues）+ verify-render-layer |
| §3 图标槽/相对坐标 | verify-relative-coords + 真渲染静帧抽查 |
| §4 高亮分级 | qc motion（拍表驱动的步进变化）+ 人工抽帧 |
| §5 装饰准入 | 本文件为判据；render-layer 规则已含「同屏双字幕/字幕压进度条/内容撞流程轨」 |
