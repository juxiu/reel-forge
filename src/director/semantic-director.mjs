const RULES = [
  {variant:"comparison", job:"compare", weight:1, patterns:[/\bversus\b/i,/\bvs\.?\b/i,/相比|对比|区别|差异|优于|劣于/]},
  {variant:"transformation", job:"transform", weight:1, patterns:[/\bbefore\b/i,/\bafter\b/i,/变成|转化|转换|演变|改成|从.*到/]},
  {variant:"causal", job:"mechanism", weight:1, patterns:[/\bbecause\b/i,/\btherefore\b/i,/\bcaus(e|al)\b/i,/因为|因此|导致|原因|机制|原理/]},
  {variant:"evidence", job:"evidence", weight:1, patterns:[/\bevidence\b/i,/\bsource\b/i,/\bproof\b/i,/证据|来源|证明|依据|数据|研究/]},
  {variant:"code", job:"mechanism", weight:1, patterns:[/\bcode\b/i,/\bapi\b/i,/\bfunction\b/i,/代码|接口|函数|调用|协议/]},
  {variant:"sequence", job:"sequence", weight:1, patterns:[/\bfirst\b/i,/\bthen\b/i,/\bnext\b/i,/\bstep\b/i,/首先|然后|接着|下一步|步骤|流程/]},
  {variant:"network", job:"mechanism", weight:1, patterns:[/\bconnect\b/i,/\bconnection\b/i,/\btransport\b/i,/连接|关系|传递|网络|链路/]},
  {variant:"split", job:"explain", weight:1, patterns:[/content-digest/i,/repr-digest/i,/拆分|分成|两类|两部分|分别/]},
  {variant:"structured", job:"explain", weight:.9, patterns:[/structured/i,/结构化|字段|层级|组织|格式/]},
  {variant:"preference", job:"hook", weight:.9, patterns:[/want-content-digest/i,/want-repr-digest/i,/偏好|选择|想要|需要|目标/]},
];

function scoreRule(rule, text) {
  return rule.patterns.reduce((score, pattern) => score + (pattern.test(text) ? rule.weight : 0), 0);
}

export function directSegment(segment, index = 0, previous = []) {
  const text = String(segment?.text || "").trim();
  const scored = RULES.map(rule => ({...rule, score: scoreRule(rule, text)}))
    .filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score || a.variant.localeCompare(b.variant));
  const previousVariant = previous.at(-1)?.variant;
  let winner = scored[0];
  if (winner && winner.variant === previousVariant) {
    const alternative = scored.find(item => item.variant !== previousVariant);
    if (alternative) winner = alternative;
  }
  if (!winner) {
    const genericJob = index === 0 ? "hook" : (index === 1 ? "explain" : "transition");
    return {variant:"generic", narrative_job:genericJob, confidence:0, matched_rules:[]};
  }
  return {
    variant:winner.variant,
    narrative_job:index === 0 ? "hook" : winner.job,
    confidence:Math.min(1, winner.score / 2),
    matched_rules:winner.patterns.map(pattern => pattern.source),
  };
}

export function directScript(script) {
  const decisions = [];
  for (let i = 0; i < (script?.segments || []).length; i += 1) {
    decisions.push(directSegment(script.segments[i], i, decisions));
  }
  return decisions;
}
