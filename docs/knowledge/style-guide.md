# 风格指南（真源：颜色、字号、字体、画面文案准入）

> 本文是 `../VISUAL_GRAMMAR.md` 索引页引用的四个真源之一，管**视觉常量与文案准入**。
> 数值全部取自实现（行号随版本会漂，以常量名为准）；改常量必须同步改这里。
> 空间与光 → `composition-and-light.md`；帧号/节拍/运镜 → `motion-vocabulary.md`。

## 1. 调色板（`src/visual/style.mjs`，颜色即语义，QC 判据不许混用）

| 名 | 值 | 语义 |
|---|---|---|
| PURPLE | `#6630F8` | 当前重点 / 激活 / 主角描边。一帧至多一处大面积紫（focusWalk 保证交接不重叠） |
| PURPLE_LIGHT | `#A175F1` | 高光端、active 卡边、穿过进度条后的紫 |
| PURPLE_TECH | `#6530F4` | 英文技术词（FONT_TECH 专用） |
| PURPLE_DEEP | `#5A3AD5` | 曲线、标题硬投影 |
| PURPLE_PALE | `#E6DCFF` | 紫的浅底（表格高亮行等） |
| ORANGE / CORAL | `#F05F41` / `#F16043` | 指标数字、警示、「另一方」 |
| RED_DEEP | `#EC081F` | 深红警示块（错误 / 不靠谱类），配双层红柔光 |
| GREEN | `#8FF740` | 通过 / 正确（Check 专用） |
| GREY `#A0A0A1` / GREY_MID `#747474` / GREY_LINE `#4A4A4A` / GREY_LIGHT `#D4D4D4` | | 非重点文字 / 灰块 / 网格线 / 浅文字 |
| MAGENTA `#D100D6` / CYAN `#58FFEE` | | **仅**允许作为 glitch 切片副本出现，不得单独用于文字或图形 |
| WHITE / BLACK | | 结构文字与描边 / 填充与幕底 |

## 2. 字体族与字号档位（`style.mjs` FONT_* + 各图元默认值）

| 角色 | 族 | 字号 / 字重 / 变形 |
|---|---|---|
| 大标题（章节卡、重点词） | FONT_HEAVY（Noto Sans SC） | 56–96 / 900 / scaleX .8–.85（仅中文压窄，拉丁一律 1） |
| 镜头标签（Label 默认） | FONT_HEAVY | 26–32 / 800；超宽走 fitSize 缩号 |
| 图内说明 / 副标（TechSub） | FONT_TECH（Exo 2 斜体） | 22–30 / 500–600 / letterSpacing 0.6；hud 模式 22 |
| 胶囊（Pill） | FONT_HEAVY | 24 默认 / 700 / h 44 |
| 字幕（Subtitle） | FONT_HEAVY | SUBTITLE_SIZE 默认 / 700 / ≤2 行 / fitSize 下限 34 |
| 进度条章名 | FONT_HEAVY | 24 / skewX(−10°) |
| 数字 / 章序号 / 计数 | FONT_ORB（Orbitron） | tabular-nums，BigNumber 走 EM_ORB=1.2 |
| 宽体展示字 | FONT_WIDE（Audiowide） | 片名 / 大写缩写，EM_WIDE=1.18 + 字距按 px 计入 fitSize |
| 代码 / 等宽 | FONT_MONO | 22–24 |
| 公式 | FONT_SERIF（Times） | 34–36 |

**字号红线**：图内文字最小 **22px**（a2e 硬纪律）。`fitSize` 默认下限 `max(22, size*0.78)`（`textfit.mjs`）——小标签缩到 22 即停，大字仍按 78% 兜底。缩到下限仍超宽 = 文案超预算，改文案不缩号。

**估宽**：一律走 `textfit.mjs` 的 `textEm/textW/fitSize/wrapText`（Noto 实测 em 系数：汉字 1.0、大写 .668、小写 .566、数字 .59、空格 .227、半角标点 .325；Audiowide 1.18 / Orbitron 1.2 / Exo 2 0.92）。letterSpacing 是固定 px，必须传给 fitSize。

## 3. 画面文案准入（两条硬门）

1. **字幕预算**：每块中文 ≤16 字 / 英文 ≤48 词（`SUBTITLE_BUDGET`）。执行者 `verify:subtitle-budget`（读 `script/timeline.json` 秒级判）。超预算修法 = 回 `script/narration.txt` 在标点处调 `|` 切分，不是缩号。
2. **事实有出处**：画面文案必须溯源到 script/research（`verify:text-provenance`，阻断门；定义在 `SKILL.md` §画面文字出处）。

## 4. 尺寸三档（细则在 `composition-and-light.md` §5，此处只立档位）

主角 ≥170px（`HERO_MIN`，`hero_size` 决定画面尺度）或大字 ≥96px，且**必带光**（光只跟主角）；配角 60–110px；标签 22–30px。表现「多」用方点阵列，背景只有幕底（星点 / 雾底 / DotFieldBg）。
