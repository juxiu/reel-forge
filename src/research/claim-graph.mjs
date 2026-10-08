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
  const claims = [];

  for (const source of normalized) {
    for (const statement of splitClaims(source.text).slice(0, 12)) {
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
  };
}
