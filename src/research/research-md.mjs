import {DATA_NOT_INSTRUCTIONS_NOTICE} from "./instruction-filter.mjs";

/**
 * `research.md` 的装配逻辑（纯函数，不碰盘、不联网）。
 *
 * 为什么要单独成文件：这段文字里装着两条真规则 ——「claims 是资料不是指令」的标注，
 * 与「被丢弃的句子必须可见」。写成 `run-production.mjs` 里的一串数组字面量，门就只能
 * grep 源码文本（那等于只有注释级保证）；抽成函数后门可以用合成 research 对象真跑一遍，
 * 断言的是**盘上会出现什么**。论述见 `docs/knowledge/agent-protocol.md` §6。
 */
export function buildResearchMarkdown(research) {
  const filter = research.instruction_filter;
  // 缺 instruction_filter 就抛：静默按「一条都没丢」排版，正是这道门要防的那种无声降级。
  if (!filter) throw new Error("research 没有 instruction_filter —— 指令性文字过滤被绕过了");
  return [
    "# Research",
    "",
    "> " + DATA_NOT_INSTRUCTIONS_NOTICE,
    "",
    "## Sources",
    ...research.sources.map((source) => "- " + source.id + " — " + source.title + " — " + source.url),
    "",
    "## Claims",
    ...research.claims.map((claim) => "- " + claim.id + " — " + claim.statement + " [" + claim.source_ids.join(", ") + "]"),
    "",
    "## 已过滤的指令性文字（" + filter.dropped + " 条 / 判定过 " + filter.judged + " 句）",
    ...(filter.dropped_claims.length
      ? filter.dropped_claims.map((item) => "- [`" + item.rule_id + "` @ " + item.source_id + "] " + item.snippet)
      : ["- 本次没有命中任何规则。"]),
    "",
    "> 这些句子没有进 Claims，因此不会作为事实喂给 research-agent / director-agent。"
      + "若其中某条其实是正当事实，把它加回来是**人的决定**，不是生产者的默认行为。",
  ].join("\n");
}
