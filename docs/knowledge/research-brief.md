# 调研、事实与画面文字出处（本仓库的"调研"实际是什么、"有出处"由谁判、判得到什么程度）

这份文件只管**事实这一层**：调研产物长什么样、谁抓的、切成了什么、谁读它；上游 research-brief 的每条规则在本仓库分别由谁执行（或没有）；以及 `scripts/verify-text-provenance.mjs` 这道「画面文字出处门」到底判到了什么程度——哪些判据是真牙齿（做过变异），哪些是子串匹配蒙过去的。每条规则后面跟着它的执行者（代码路径 + 行号，或某道门）；没有执行者的标「⚠ 无执行者」。

一句话结论先给：**本仓库没有"调研文档"，只有一张 claims 表。** 上游那套「§0–§8 结构 + 数字清单 + 可信度星级 + 【待核】+ 术语对照 + 比喻清单」一条都没落地；落地的只有画面层那一条门，而那条门从写下到 2026-10 一直是绿的，因为它**一条硬编码文案都扫不到**（§4「曾经的形状」）。现在的状态：数字有牙齿、术语没牙齿、结构无执行者。

分工（一条规则只有一个真源，其余只链接）：

| 主题 | 真源 |
|---|---|
| 调研产物的真实形态、上游规则 ↔ 本仓库执行者对照、claims 的自证性质、**画面文字出处门 A1/A2/B/C 的真实语义与三条弱点**、不联网时调研侧为空、hero 兜底把导演枚举画上画面 | **本文** |
| 画面文字出处门的**命令与四段定义**（本文管语义与破口） | `SKILL.md` §画面文字出处 |
| 「事实有出处」的**规则原文**、四个确认点、阶段 1 派调研 | `SKILL.md` §硬性原则 2、§四个人工确认点、§阶段 1 |
| 调研文档 §0–§8 该写什么、数字清单条数、可信度星级、【待核】、术语对照 ≤30、比喻 ×5 | `anything2explainer/reference/research-brief.md`（上游方法文档，**不在本仓库**；仓库地址与吸收范围见 `docs/REFERENCES.md`） |
| 解说词怎么写、画面与解说的分工、句数/字数预算 | `narration-and-storyboard.md` |
| agent 层三态信封、超时、**指令性文字进 claims 无标注**、payload 里没人读的约束键 | `agent-protocol.md` §1/§2/§6 |
| 主角尺寸与光、空场判据、`frame_metrics` | `composition-and-light.md` |
| 上游五部片里打在**画面文字与事实合规**上的返工逐条归属（计数中间值也是上画面的数字、自建算例要横向验算、源码字面量与事实清单对账这条门在本仓库的真实状态） | `lessons.md` §4 |

---

## 0. 本仓库的"调研"实际是什么：四步，没有一步是"研究"

```text
fixtures/project.json 的 source_urls[]        ← 人工给的 URL 清单（本仓库只有一条 rfc-editor 的）
  → pipeline.mjs:12-14  「source_urls required」—— 没有 URL 直接抛，不做任何主题调研
  → pipeline.mjs:16-20  逐条 fetchSource(url)                    src/providers/research/web.mjs:1
  → pipeline.mjs:21     buildClaimGraph(project, sources)        src/research/claim-graph.mjs:8-40
  → run-production.mjs:28-39  落盘 research.md / research.json
```

**抓取层**（`web.mjs:1`，一行）：`fetch(url, {redirect:"follow", headers:{user-agent:"reel-forge/0.2"}})` → 非 2xx 抛 `source fetch failed: <status>` → 去 `<script>`/`<style>`/所有标签 → `&nbsp;`/`&amp;` → 空白折叠。`id = "src-" + sha1(url)[0:10]`、`content_hash = sha256(text)`、`title` 取 `<title>` 否则退回 URL。
⚠ 无执行者：超时、重试、robots、分页、编码探测、正文抽取（正文 = 整页去标签，正文/导航/评论区不分）。`fetch` 默认无超时，一条卡住的 URL 会挂住整条 `run-production`。

**claim 化**（`claim-graph.mjs`）：
- `splitClaims`（`:1-6`）按 `(?<=[.!?。！？])\s+` 切句，只留 **≥40 字符**的句子——所以短句、列表项、表格数字天然被丢。
- 每个源**前 12 条**（`:15` `slice(0, 12)`）。⚠ 这个 12 与片长无关；上游按片长要 8–10 / 10–16 / 18–24 条**可直接讲的有出处数字**（`research-brief.md:15,20`）。
- claim = `{id, statement, source_ids:[一个], evidence:[{source_id, url, excerpt}]}`（`:16-27`）。id 是 `claim-001` 自增，**顺序即 id**：源顺序变了，所有 id 变了。
- `research.claims` 为空时 `pipeline.mjs:22-24` 抛 `research produced no claims`。这是本层唯一的内容判据，而且是"非空"。

**落盘**（`run-production.mjs`）：`research.md` 只有两节（`:30` `## Sources`、`:32` `## Claims`，每条打印 `claim-id — statement — [source-id]`），`research.json` = 契约对象（`:35-39`，同批还写 script/beats/scene/render-ir/agent-reviews）。上游要的小节 0/6/7/8（执行摘要 / 真实案例与失败模式 / 数字与比喻清单 / 术语对照）在这里**不存在**。

**谁读它**：整仓库对 `research.md`/`research.json` 的读者只有两个——
1. `scripts/verify-text-provenance.mjs:45` 把两个文件拼成一个字符串，用途是**数字子串查询**（§4）；
2. `scripts/verify-contracts.mjs:185` 把 `artifacts/<pid>/research.json` 按契约校验，但**产物不存在就打 `skip`**（本地现在就是 skip：`run-production` 要联网）。
⚠ 无执行者：调研文档的**结构、年份、可信度、待核标记**没有任何代码读；它不参与任何判定，只充当一个"字符串集合"。

**`npm run verify:research`**（`scripts/verify-research.mjs:1`）是联网 smoke：抓 RFC 9530，判 `content_hash` 非空且 `text.length>=1000`。它在 CI（`.github/workflows/verify.yml:45`），**不在** `verify:fast`，也不测任何内容性质。

---

## 1. 上游每条调研规则 ↔ 本仓库执行者

规则原文指向 `anything2explainer/reference/research-brief.md`（外部路径，本仓库没有 `reference/` 目录）。

| 上游规则 | 出处 | 本仓库执行者 | 状态 |
|---|---|---|---|
| 结构 0/6/7/8 必有，其余按题材取舍 | `:8-16` | 无 | ⚠ 无执行者 |
| 每个事实点后标来源 URL **与年份** | `:6` | `claim-graph.mjs:21-25` 有 `url`/`source_ids`；年份无处存（§2） | 半 |
| 不确定标【待核】 | `:6` | 无 | ⚠ 无执行者 |
| 【待核】一律不进解说词 | `:28` | 无 | ⚠ 无执行者 |
| 不要只凭记忆、不要编造数字 | `:6` | 本层无 LLM：抓 + 切句；数字判据在**画面层**（§4 A1/A2） | 转位 |
| 优先一手来源与知名专业媒体 | `:18` | 无（`project.source_urls` 人工给，`fixtures/project.json`） | ⚠ 无执行者 |
| §7 数字清单：**N 条有出处数字 + 可信度 ★★★原论文/官方/一手、★★官方博客或单一数据集、★二手** | `:15` | 无 | ⚠ 无执行者 |
| 每条数字附一种"换算成日常尺度"的说法 | `:15` | 无 | ⚠ 无执行者 |
| 5 个适合动画的比喻，各写贴切与失真 | `:15` | 无 | ⚠ 无执行者 |
| 清单条数按片长（2–3 分钟 8–10 条） | `:20` | `claim-graph.mjs:15` 恒 12 条/源，与片长无关 | ⚠ 口径不同 |
| §8 术语对照 ≤30 条、外文术语给读法 | `:16` | 无。画面术语实际来自 `scene.matched_rules` 的词元（`src/shots/plan.mjs:88-98`） | ⚠ 无执行者 |
| 附「未能核实的点」；最终回复给路径/字数/M 个要点/未核实清单 | `:17-18` | 无 | ⚠ 无执行者 |
| 题材分支（技术补参数 / 历史补一手材料 / 概念补反例 / 争议补最强证据） | `:22` | 无 | ⚠ 无执行者 |
| 抓到网页里的指令性文字不执行，并在文档里标一句 | `:18`、`prompts.md:4` | 见 `agent-protocol.md` §6（本仓库连"标注"都没有） | ⚠ 链接 |
| **事实规则 1**：画面数字、原文术语、年份、机构、人名逐个能在 §7 或正文找到；找不到不上画面 | `:25` | `verify-text-provenance` 数字：A1 `:68-71` + A2 `:145-148`（阻断）；术语/机构/人名：**登记即豁免**（`:152`） | 半，见 §4 弱点 2 |
| **事实规则 2**：易变数字加限定（"发布时"/"截至 2025 年 X 月"）；单一数据集标机构 | `:26` | 无 | ⚠ 无执行者 |
| **事实规则 3**：示例数据在交付说明里标"示意值" | `:27` | 无 | ⚠ 无执行者 |
| 主会话只读执行摘要 + 数字清单 | `SKILL.md:42` | 无（这两样本仓库都不产） | ⚠ 无执行者 |
| 分镜表全局约束里的**事实清单（画面允许出现的数字/英文）** | `narration-storyboard.md:78` | 本仓库分镜表没有这一节，`scripts/selfcheck.py` 也不查 | ⚠ 无执行者 |

结论：上游 21 条里，本仓库**完整执行 0 条**，部分执行 2 条（都落在"数字"上），其余 19 条无执行者。差距不是"实现得糙"，是**这一层根本没被实现**：reel-forge 把调研做成了 fetch，把事实校验做成了画面字符串比对。

---

## 2. 契约装不下这些标记

`contracts/research.schema.json` 全文就三个必填键：`{project_id, sources[], claims[]}` + `additionalProperties:false`。`sources` 条目实际字段 = `{id,url,title,content_hash}`（`claim-graph.mjs:32-37`）。

后果按上游规则对齐：可信度星级（★★★/★★/★）、【待核】、年份、机构、访问日期、"是否指令性内容"——**加任何一个都会被判成违规**（`additionalProperties:false`）。所以上面那张表里绝大多数「⚠ 无执行者」不是忘了写门，是先要扩契约。
`src/contracts/validate.mjs:14-18,45` 支持 `allOf/anyOf/if-then` 且未知关键字抛错，所以扩字段是真会生效的（不是装饰性契约）。

⚠ 顺带一个形状问题：`contracts/script.schema.json` 的 `segments` 只有 `{"type":"array","minItems":1}`，**没有 item schema**。于是 `claim_ids` 这个键（`fixtures/script.json` 里有、`pipeline.mjs:46-53` 会读）在契约层完全不受约束——写与不写都不违规，见下一节。

---

## 3. claim 层的"有出处"是自证

`claim-graph.mjs:24`：`excerpt: statement`。摘录 === 主张本身，`source_ids` 只有一个。

所以"这条 claim 有 evidence"证明的只是：**这句话是那个 URL 正文里的一个 ≥40 字符句子**。它不证明：这句话被核实过、它是事实而不是作者的观点、它没被断章取义、它属于哪一节的哪个论断。上游要的「每个事实点后标来源 URL 与年份」在这里退化成了「每个句子后面挂一个 URL」。

与解说词的唯一连接是 `pipeline.mjs:46-53`：脚本 segment 的 `claim_ids` 里每个 id 必须在 claims 表里存在，否则抛 `script claim has no research evidence`。这条判据是**单向且空洞的**：
- 不要求每句解说词都有 `claim_ids`（省略即跳过）；
- 不要求那个 claim 的**内容**支持这句话（只要 id 存在）；
- 而 `fixtures/script.json` 的 `claim-001…claim-004` 与 `research.json` 的 claims 谁生成的都在同一条 `run-production` 里，本地根本跑不到（要联网）。

真牙齿不在 claim 层，在画面层。

---

## 4. 画面文字出处门：现在到底判什么

命令与四段定义在 `SKILL.md` §画面文字出处；**语义细节以本文为准**。脚本 `scripts/verify-text-provenance.mjs`，294 行，输入全是 tracked 文件，`npm run verify:text-provenance` 约 140ms。它现在在 `scripts/verify-fast.mjs:40`（29 项清单）和 `.github/workflows/verify.yml:84`（为什么必须在这一步，理由写在 `:81-83`），也仍在一键链 `scripts/skill.mjs:122`（抛错型 `run`）。

它读哪些东西：IR = `fixtures/render-ir-16x9.json` / `fixtures/render-ir-9x16.json`（`:50-51`，**不是** artifacts 里的 IR）；解说词 = `artifacts/<pid>/script.json`，缺则回落 `fixtures/script.json`（`:44`）；调研 = `artifacts/<pid>/research.md` + `research.json` 拼接（`:45`）。归一化 `norm`（`:42`）= 折叠空白 + 转小写，**仅此**。

| 段 | 判据 | 牙齿 |
|---|---|---|
| **A1 IR 文案**（`:57-76`） | 每条 `scene.elements[*].text` 归一化前 80 字符必须是解说词的**子串**（`:64-66`）；其中的 `\d+` 必须出现在解说词或调研里（`:68-71`） | ✅ 但判的是不会上画面的文字，见弱点 3 |
| **A2 真上画面的文案**（`:77-154`） | 走 registry 找镜头源文件（`:81-87`）→ 括号配对 + `new Function` 求值 `SHOT_RECIPE`（`:88-106`，与 `scripts/plan-audit.mjs:39-56` 同一形状）→ `buildPlan()` 得到 `hero.text/sub/unit` 与 `items[].text/unit` → 数字一律要出处（`:145-148`，**白名单豁免不了数字**）；非数字又没出处的进 `unsourced_rendered_text`，出声不阻断（`:150-152`、`:279-282`） | ✅ 数字阻断（M2 变异验证）|
| **B 字面量白名单**（`:156-246`） | 扫 `src/shots/SemanticShots.jsx` + **`src/shots/plan.mjs`** + `src/shots/Gn/*.jsx`，五条通道正则（`:159-163`）；扫到的文案必须登记在 `fixtures/visual-literals.json`，未登记即 FAIL（`:245`）；`--write` 只写现在真扫到的（`:226-239`，剪幽灵条目） | ✅ 三条变异验证 |
| **反脱节断言** | 7 条**扫描器自检**（`:203-220`）：把每条通道的代表形状喂给 `literalsInSource`，扫不到就 FAIL；外加「真实源码里一条都没扫到 → FAIL」（`:241-243`） | ✅ M3 变异验证 |
| **C 双比例一致**（`:248-258`） | 同 index 的 scene：id 相等、时长差 ≤1/30 s、variant 相等；场景数不等即 FAIL | ✅ |

报告写 `artifacts/<pid>/qc/text_provenance.json`（`:278`，`blocking:true`）；读者：`scripts/qc.mjs:36-37`（缺文件记**阻断** issue `text_provenance_missing`）、`scripts/qc.mjs:85-90`（数字进 report.json / report.md）、`scripts/deliver.mjs:51-52,74`（非 PASS 不许交付）、`scripts/verify-production.mjs:28-29`。

**当前实测**（2026-10-09，本仓库现状，不联网）：

```text
text provenance PASS {"ir_text_elements":8,"rendered_texts":40,"registered_literals":99,
                      "discovered_literals":168,"unsourced_rendered_text":6,"research_bytes":0}
```

即：A1 看 8 条（= 4 条解说词 × 2 比例），A2 看 40 条（20 × 2），其中 6 条无出处（§6），调研侧 0 字节（§5）。

### 弱点 1：子串匹配，而且只认 `\d+`

`narrationNorm.includes(probe)`（`:65`）与 `.includes(number)`（`:69`、`:146`）都是**子串**。实测后果：
- scene-001 的主角文案 `connect` 判定通过——因为解说词里有 `connection`。这条本该进 §6 的无出处名单，被字符串形状救了。
- 数字 `30` 会因为 `1280×720`、`30fps`、`2030` 之类而通过；`2` 会匹配任何含 2 的文本。画面写一个真正需要出处的 `30` 时，门给不出区分。
- **中文数字与成数/倍数根本不被提取**：`/\d+(?:\.\d+)?/g`（`:68`、`:145`）只抓 ASCII 数字。画面写「三倍」「三十秒」「一半」时，本门一条都不问。上游事实规则 1 要的是「数字逐个能查到」，口径包含念出来的中文数字。
- 没有单位、年份、机构、人名的判定（上游把这四类点名列举）。年份恰好是 4 位 ASCII 数字才被顺带覆盖；"二〇二四年"不覆盖。

### 弱点 2：登记即豁免术语

`if (!traced && !allow.has(row.text))`（`:152`）——写进白名单的结构标签不再被问出处。这对「第一步 / 方案 A / header」是对的，对**本片的核心术语**是错的：digest 样片的 `labels` 里 `content-digest`、`digest-fields`、`old-digest`、`new-field`、`RFC 9530` 全部已登记，其中只有 `9530` 因为「数字不可豁免」还被问出处（`:145-148`）。上游 `research-brief.md:25` 把「原文术语」和数字并列要求，`SKILL.md:16` 也写「每个数字、英文术语、年份、人名」。

为什么没一步到位（这是真原因，不是拖延）：术语判定要先解决归一化。`digest-fields` 与解说词里的 `Digest Fields` 差一个连字符，`norm`（`:42`）只折叠空白不折叠连字符/下划线，直接加严会把**已经说过**的术语判成无出处。正确顺序是先把上游 §8 的**术语对照表**做成产物（术语 → 别名 → 读法 → 出处），再让 A2 查表；表不存在时先加严只会逼人往白名单里塞更多条目，门反而更宽。

### 弱点 3：A1 查的恰好是不会上画面的文字

`heroTextOf` 拒收 >12 宽度单位的句子（`src/shots/plan.mjs:153`），`pickSupport` 把 `textEm>12` 的 box 元素直接跳过（`:190`）——整句解说词**故意不上画面**（它在字幕带上）。这条禁令的真源是 `style-guide.md` §8 第一行，本文只说它的门禁后果。于是 A1 逐条核对的那 4 条，正是渲染层唯一会丢掉的 4 条。
实测：digest 样片 A1 看 4 条、画面真上 20 条，两者**交集 1 条**。只有 A1 的门在"满屏无出处英文 token"的片子上会全绿——这也是 A2 存在的全部理由（脚本头注释 `:18-34` 把这段写死在代码里，就是防止以后有人把 A2 删了只留 A1）。

### 曾经的形状（2026-10 之前，别当传说）

旧版 B 段只有三条正则：`text={"…"}`、`labels||[…]`、`>文案<`。本仓库的画面文字走的是 `recipe.labels:[…]` 对象数组与 `plan.mjs` 的变体骨架（`text:` 是对象字段、`labels:` 冒号后有空格、单引号），**一条都不匹配**。于是：

```text
discovered_literals = 0  →  unregistered = 空  →  B 恒绿；
登记的 34 条里 30 条对应的源码文案早已不存在（旧 SemanticShots 时代的残渣，`--write` 的 retired 逻辑只增不减）。
```

三条变异证据（脚本已删，结论留此）：

| 变异 | 旧门 | 现门 |
|---|---|---|
| `SC07.jsx` 的 `labels` 加一个 `"MUTANT-TERM-9527"` | **GREEN**（假门坐实） | RED：`unregistered on-screen literal … "MUTANT-TERM-9527"` |
| `SC04.jsx`（真会上画面的那只）的 `labels` 换成已登记但带数字的 `"mutant 2031"` | GREEN | RED ×2：`rendered support:term number has no source: 2031`（`unregistered:0`，证明红在数字规则而不是登记规则） |
| 把 `stringArray` 那条正则改坏（模拟源码形状再漂移一次） | GREEN（无从发现） | RED：`B 段扫描器自检失败：recipe labels 数组（不再扫到 mutA）` |

`--write` 现在剪掉不再被扫到的条目（本次重写剪掉 28 条幽灵）；还原后两个被改变异文件字节一致，基线复跑 PASS。

---

## 5. 不联网时，"调研文档"这一侧是空的

报告里 `research_bytes`（`:271`）现在是 **0**：`artifacts/<pid>/research.md|json` 都不存在（它们由 `run-production` 写，而 `run-production` 要联网），`readText` 缺文件返回空串（`:39`）。

于是「数字必须能在**脚本或调研文档**里找到」（`SKILL.md:61` 的 A 段口径）在当前仓库状态下**退化成「数字必须已经在解说词里说过」**。门无法区分"画面数字来自一手来源"和"画面数字是解说词里的一个口误"——而上游整个 §7 数字清单 + 可信度星级就是为区分这两件事存在的。CI 里才有调研产物（`.github/workflows/verify.yml:52` 跑 `run-production`），本地默认没有，这层差异在报告里除了 `research_bytes` 一个字段外没有任何提示。
⚠ 无执行者：任何"上画面的数字必须来自调研而非解说"的判据。可做的最小增量（未做，因为要动产物形状）：A2 的数字只允许 `researchNorm` 命中；配套要么提交一份 `fixtures/research.md` 让 fast 也能判，要么把这条严判只放在 `run-production` 之后。

---

## 6. 主角位上现在是导演枚举

`src/shots/plan.mjs:142-145`：所有主角候选都装不进宽度时（`hero-overlong`），兜底是 `text: job || String(scene?.id)`，而 `job = scene.narrative_job || recipe.narrative_job`——一个内部枚举词。digest 样片实测：四个镜头的主角大字依次是 `connect / explain / hook / explain`，两个比例各 4 条，正是 §4 那 6 条 unsourced 的全部内容（`connect` 因弱点 1 蒙混，没进名单）。

这是上游硬性原则 2 的违例类（画面上出现无出处英文 token），而且是**最亮、最大、带紫柔光**的那个位置。本门把它出声但不阻断，理由要写清：改它得先改渲染兜底策略（主角为空 = `frame_metrics` 报空场，判据在 `composition-and-light.md`），属于画面层决定，不该由出处门单方面改。
⚠ 无执行者：「hero-overlong 必须回分镜层另写画面文案」。`REPAIR_ACTIONS['hero-overlong'].auto=false`（`plan.mjs:485`）把它明确交给人/agent，而 agent 输出零消费者（`agent-protocol.md` §2 第 2 条事实）。

---

## 7. A1 与上游「画面与解说分工」正面冲突

A1 要求每条 IR 文案**必须是解说词的子串**（`:64-66`），等价于"画面不许写解说没说的东西"。上游恰好相反：`narration-guidance.md:67-71`（§11 Say what the picture cannot）——解说带原因/后果/比较/判断，画面带结构/顺序/数量，「If a sentence only describes what is on screen, cut it」，起飞检查表 `:93` 再重复一遍「describes the picture? Cut」。上游对画面文字的唯一要求是**有出处**（`SKILL.md:16`，出处 = 调研文档），不是"被说过"。

所以 A1 的这条子串判据把 §11 反过来执行了：它会把"画面新写一个术语"判 FAIL，而那是上游希望发生的事。A2 的存在让真正的画面文案（来自 recipe/骨架）不受这条约束，因此现在不会再锁死；但 A1 对 IR 文案仍然按"必须被说过"判，任何分镜往 IR 里写解说没说的 `display`/`headline` 都会被掐。
建议（未做，因为它会改判定语义）：A1 的 traced 目标从 `narrationNorm` 换成 `narrationNorm ∪ researchNorm`，与上游 `SKILL.md:16` 对齐；换完要靠 §5 补齐调研产物，否则不联网时 A1 直接失去全部依据。

---

## 8. 已知破口

1. **调研这一层没有实现**：结构、执行摘要、数字清单、可信度星级、【待核】、术语对照、比喻清单、未核实清单——八样全无执行者（§1 表）。上游 21 条规则本仓库完整执行 0 条。
2. 术语 / 机构 / 人名上画面不需要出处：登记即豁免（§4 弱点 2）。数字已经不可豁免，这是唯一收紧的一条。
3. 中文数字、成数、倍数不被提取（§4 弱点 1）；数字是子串匹配，`30` 和 `2` 几乎免费。
4. 不联网时调研侧 0 字节，"有出处"退化为"解说说过"（§5）。
5. hero-overlong 兜底把 `narrative_job` 画上主角位（§6）：本门出声不阻断，`auto:false` 那条整改线没人接。
6. A1 的 traced 语义与上游 §11 相反（§7）。
7. claim 层"有出处"是自证（§3）：`excerpt === statement`、每源前 12 句、id 顺序即身份。
8. `pipeline.mjs:46-53` 的 claim↔解说连接单向且可空（省略 `claim_ids` 即跳过），且 `contracts/script.schema.json` 没有 segment item schema。
9. `web.mjs:1` 抓取无超时/重试/正文抽取区分；`verify:research` 是联网 smoke（在 CI `verify.yml:45`，不在 fast）。
10. 指令性文字进 claims 无任何标注——见 `agent-protocol.md` §6，本文不重述规则本体。
11. ⚠ **本门不在一键链之外**这件事已修（现在在 fast 与 CI），但 B 段曾经恒绿正是因为没人跑它——**「门写好了 ≠ 门在被跑」**这条元教训对本仓库所有只挂在一键链上的门都成立。
12. 分镜表里没有上游要求的「事实清单（画面允许出现的数字/英文）」那一节，`selfcheck.py` 也不查（§1 最后一行）。

---

## 可核对规则

1. 调研不是研究：`pipeline.mjs:12-21` 只做「有 URL → fetch → 切句」；没有 URL 时 `:12-14` 抛 `source_urls required`，不会自己去查主题。
2. claims 的条数由 `claim-graph.mjs:15` 每源前 12 句决定、内容由 `:1-6` 的「句末标点 + ≥40 字符」决定；与片长、题材、可信度都无关。
3. `research.md` 只有 `## Sources` 与 `## Claims` 两节 —— `run-production.mjs:28-34`；上游 §0/6/7/8 四节在本仓库不存在。
4. 整仓库对调研产物的读者只有 `verify-text-provenance.mjs:45`（数字子串）与 `verify-contracts.mjs:185`（产物存在才校验，否则打 `skip`）。
5. `contracts/research.schema.json` = `{project_id,sources[],claims[]}` + `additionalProperties:false`：加星级/待核/年份字段会先违反契约，扩规则必须先扩契约。
6. claim 的证据是自证：`claim-graph.mjs:24` `excerpt === statement`；"有 evidence" 只等于"来自该 URL 正文"。
7. 解说词↔claim 的判据只有一向：`pipeline.mjs:46-53`——`claim_ids` 里的 id 必须存在；不要求每句都有 id，也不要求内容支持。
8. 画面文字出处门的四段与判据在 `scripts/verify-text-provenance.mjs`：A1 `:57-76`、A2 `:77-154`、B `:156-246`（含扫描器自检 `:203-220`、零发现即失败 `:241-243`）、C `:248-258`；命令与四段定义在 `SKILL.md` §画面文字出处。
9. 它读的 IR 是 `fixtures/render-ir-16x9.json` / `-9x16.json`（`:50-51`），**不是** `artifacts/<pid>/render-ir.json`；解说词缺 `artifacts/<pid>/script.json` 时回落 `fixtures/script.json`（`:44`）。
10. A2 的画面文案来自 `buildPlan()` 的 `hero.text/sub/unit` + `items[].text/unit`（`:108-136`），镜头文件经 `src/shots/registry.jsx` 定位（`:81-87`）、`SHOT_RECIPE` 用括号配对 + `new Function` 求值（`:88-106`）。
11. 数字不可被白名单豁免：A1 `:68-71`、A2 `:145-148` 只看 `narrationNorm ∪ researchNorm`；变异证据见 §4 表第二行（登记进去的 `mutant 2031` 仍红）。
12. 非数字、无出处、未登记的**已渲染**文案进 `unsourced_rendered_text` 并打印，不阻断：`:150-152`、`:279-282`。现状 6 条，全部是 §6 的 `narrative_job` 兜底。
13. `--write` 只写现在真扫到的，剪掉扫不到的历史条目（`:226-239`）。本次重写剪掉 28 条幽灵；旧的 `retired` 永久保留逻辑是白名单只增不减的根因。
14. 门的位置：`npm run verify:text-provenance` 同时在 `scripts/verify-fast.mjs:40`（29 项）、`.github/workflows/verify.yml:84`（为什么必须在这一步，理由写在 `:81-83`）、一键链 `scripts/skill.mjs:122`（抛错型）。
15. 报告的读者链：`scripts/qc.mjs:36-37` 缺文件即阻断 issue；`scripts/deliver.mjs:51-52,74` 非 PASS 不许交付；`scripts/verify-production.mjs:28-29` 要求 PASS。因此 CI 链里必须有一步在 `qc` 之前跑这道门。
16. 现状实测（不联网）：`ir_text_elements=8 / rendered_texts=40 / registered_literals=99 / discovered_literals=168 / unsourced_rendered_text=6 / research_bytes=0`，状态 PASS。
17. 「A1 查的是不会上画面的文字」是代码里的事实而非评论：`plan.mjs:153` 与 `:190` 决定了整句解说词不进 hero/配角位。
18. 画面硬编码文案只有三个来源：`recipe.labels`/`recipe.hero.*` 等对象字段（44 个镜头文件，66 个去重字符串）、`plan.mjs:246-256` 的变体骨架标签、IR 数据。`src/shots/Shot.jsx` 与 `src/remotion/Primitives.jsx` 里 0 条可见字面量（文字全走 props）。
19. 上游规则的原文位置：`research-brief.md:6,8-16,15,18,20,22,25,26,27,28` 与 `SKILL.md:16,42`、`narration-guidance.md:67-71,93`、`narration-storyboard.md:32,78`、`prompts.md:4` —— 都是外部路径，本仓库无 `reference/` 目录。
20. 换片子时这一层必须动的两处：`claim-graph.mjs:15` 的 12 条/源要按片长改成上游的 8–10/10–16/18–24 口径（`research-brief.md:20`），`fixtures/project.json` 的 `source_urls` 要换。两者都是脚本/数据改动——⚠ 动脚本就可能把判据又写成假门，所以任何一处改动都要配一条 §4 那样的变异。
