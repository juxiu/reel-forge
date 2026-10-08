export function repairScene(scene, issues) {
  const next = structuredClone(scene);
  for (const issue of issues) {
    if (issue.type === "hero_too_small") {
      next.hero_scale = Math.min(1.7, Number(next.hero_scale || 1) + 0.18);
      next.repair_trace = [...(next.repair_trace || []), {type: issue.type, source_ref: next.source_ref || null}];
    }
    if (issue.type === "motion_too_low" || issue.type === "freeze") {
      next.repair_trace = [...(next.repair_trace || []), {type: issue.type, source_ref: next.source_ref || null}];
      next.motion = (next.motion || []).map((item) =>
        item.target === "stage"
          ? {...item, amount: Math.min(0.12, Number(item.amount || 0.04) + 0.035)}
          : item
      );
    }
    if (issue.type === "caption_overlap") {
      next.caption_safe = true;
      next.repair_trace = [...(next.repair_trace || []), {type: issue.type, source_ref: next.source_ref || null}];
    }
  }
  return next;
}

function ratioForRenderIR(renderIR) {
  if (Number(renderIR.width) > Number(renderIR.height)) return "16x9";
  if (Number(renderIR.height) > Number(renderIR.width)) return "9x16";
  return null;
}

function applicableIssues(renderIR, issues) {
  const ratio = ratioForRenderIR(renderIR);
  return (issues || []).filter((issue) => !issue.ratio || issue.ratio === ratio);
}

export function repairRenderIR(renderIR, issues) {
  const byNode = new Map();
  for (const issue of applicableIssues(renderIR, issues)) {
    if (!issue.node) continue;
    if (!byNode.has(issue.node)) byNode.set(issue.node, []);
    byNode.get(issue.node).push(issue);
  }

  const ratio = ratioForRenderIR(renderIR);
  const layoutIssues = byNode.get("layout-" + ratio) || [];
  const layoutTypes = new Set(layoutIssues.map((issue) => issue.type));

  return {
    ...renderIR,
    scenes: renderIR.scenes.map((scene) => {
      const scoped = byNode.get(scene.id) || [];
      const fallback = layoutTypes.size ? [...layoutIssues] : [];
      return scoped.length || fallback.length
        ? repairScene(scene, [...scoped, ...fallback])
        : scene;
    }),
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
