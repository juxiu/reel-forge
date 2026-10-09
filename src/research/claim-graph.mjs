import {instructionalRuleHit} from "./instruction-filter.mjs";

export function splitClaims(text) {
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 40);
}

export function buildClaimGraph(project, input) {
  const sources = Array.isArray(input) ? input : [input];
  const normalized = sources.filter(Boolean);
  let nextId = 1;
  let judged = 0;
  const claims = [];
  const droppedClaims = [];

  for (const source of normalized) {
    // 先切句 → 再挡指令 → 最后数「每来源 12 条」。顺序不能倒过来：
    // 若先取满 12 条再过滤，被丢掉的那条会白占一个名额，后面的正当句子明明还能用却进不来。
    // 配额（12）按**保留下来**的条数计，因此扫描会比旧版更深入正文 —— 这是有意的。
    let keptFromThisSource = 0;
    for (const statement of splitClaims(source.text)) {
      if (keptFromThisSource >= 12) break;
      judged++;
      const rule = instructionalRuleHit(statement);
      if (rule) {
        // 不静默丢弃：原文摘要 + 命中规则 + 来源都留下来，由 run-production 写进 research.md。
        droppedClaims.push({
          source_id: source.id,
          url: source.url,
          rule_id: rule.id,
          reason: rule.why,
          chars: statement.length,
          snippet: statement.slice(0, 120),
        });
        continue;
      }
      keptFromThisSource++;
      const id = "claim-" + String(nextId++).padStart(3, "0");
      claims.push({
        id,
        statement,
        source_ids: [source.id],
        evidence: [{
          source_id: source.id,
          url: source.url,
          excerpt: statement,
        }],
      });
    }
  }

  return {
    project_id: project.project_id,
    sources: normalized.map((source) => ({
      id: source.id,
      url: source.url,
      title: source.title,
      content_hash: source.content_hash,
    })),
    claims,
    // 判据本体在 src/research/instruction-filter.mjs（生产者与门共用同一份）。
    instruction_filter: {
      judged,
      dropped: droppedClaims.length,
      rules: [...new Set(droppedClaims.map((item) => item.rule_id))],
      dropped_claims: droppedClaims,
    },
  };
}
