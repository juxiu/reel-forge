export function repairScene(scene, issues) {
  const next = structuredClone(scene);
  for (const issue of issues) {
    if (issue.type === "hero_too_small") {
      next.hero_scale = Math.min(1.7, Number(next.hero_scale || 1) + 0.18);
    }
    if (issue.type === "motion_too_low" || issue.type === "freeze") {
      next.motion = (next.motion || []).map((item) =>
        item.target === "stage"
          ? {...item, amount: Math.min(0.12, Number(item.amount || 0.04) + 0.035)}
          : item
      );
    }
    if (issue.type === "caption_overlap") {
      next.caption_safe = true;
    }
  }
  return next;
}

export function repairRenderIR(renderIR, issues) {
  const byNode = new Map();
  for (const issue of issues || []) {
    if (!issue.node) continue;
    if (!byNode.has(issue.node)) byNode.set(issue.node, []);
    byNode.get(issue.node).push(issue);
  }
  return {
    ...renderIR,
    scenes: renderIR.scenes.map((scene) =>
      byNode.has(scene.id) ? repairScene(scene, byNode.get(scene.id)) : scene
    ),
  };
}

export function makeRepairPlan(report, maxRetries = 2) {
  return {
    maxRetries,
    status: report?.status === "PASS" ? "not-needed" : "pending",
    issues: report?.issues || [],
    nodes: [...new Set((report?.issues || []).map((issue) => issue.node).filter(Boolean))],
  };
}
