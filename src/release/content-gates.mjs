import crypto from "node:crypto";

const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");

export function productionContentFingerprints(research, script) {
  return {
    research_fingerprint: digest({
      project_id: research?.project_id ?? null,
      sources: research?.sources ?? [],
      claims: research?.claims ?? [],
    }),
    script_fingerprint: digest({
      project_id: script?.project_id ?? null,
      segments: script?.segments ?? [],
    }),
  };
}

/**
 * Every narrated segment must cite one or more research claims. This validates
 * traceability, not truth: source credibility and support are separately reviewed
 * by the required research-agent gate.
 */
export function validateScriptEvidence(script, research) {
  const issues = [];
  const claims = Array.isArray(research?.claims) ? research.claims : [];
  const sources = Array.isArray(research?.sources) ? research.sources : [];
  const sourceById = new Map();

  if (!research || !Array.isArray(research.claims) || !claims.length) issues.push("research has no claims");
  for (const source of sources) {
    if (!source?.id || !source?.url) {
      issues.push("research source requires id and url");
      continue;
    }
    if (sourceById.has(source.id)) issues.push("duplicate research source id: " + source.id);
    sourceById.set(source.id, source);
  }

  const claimById = new Map();
  for (const claim of claims) {
    if (!claim?.id) {
      issues.push("research claim is missing id");
      continue;
    }
    if (claimById.has(claim.id)) issues.push("duplicate research claim id: " + claim.id);
    claimById.set(claim.id, claim);

    const sourceIds = Array.isArray(claim.source_ids) ? claim.source_ids : [];
    const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
    if (!sourceIds.length) issues.push("claim has no source_ids: " + claim.id);
    if (!evidence.length) issues.push("claim has no evidence records: " + claim.id);
    for (const sourceId of sourceIds) {
      if (!sourceById.has(sourceId)) issues.push("claim references unknown source " + sourceId + ": " + claim.id);
    }
    for (const item of evidence) {
      const source = sourceById.get(item?.source_id);
      if (!source || !sourceIds.includes(item.source_id)) {
        issues.push("claim evidence source is not bound to the claim: " + claim.id);
      } else if (item.url !== source.url) {
        issues.push("claim evidence URL does not match source record: " + claim.id);
      }
      if (typeof item?.excerpt !== "string" || !item.excerpt.trim()) {
        issues.push("claim evidence excerpt is empty: " + claim.id);
      }
    }
  }

  if (script?.project_id !== research?.project_id) {
    issues.push("script/research project_id mismatch");
  }
  const segments = Array.isArray(script?.segments) ? script.segments : [];
  if (!segments.length) issues.push("script has no segments");
  const segmentIds = new Set();
  for (const segment of segments) {
    if (!segment?.id || typeof segment.id !== "string") {
      issues.push("every script segment requires a stable string id");
    } else if (segmentIds.has(segment.id)) {
      issues.push("duplicate script segment id: " + segment.id);
    } else {
      segmentIds.add(segment.id);
    }
    if (typeof segment?.text !== "string" || !segment.text.trim()) {
      issues.push("script segment has empty narration: " + String(segment?.id ?? "(no id)"));
    }
    const refs = Array.isArray(segment?.claim_ids) ? [...new Set(segment.claim_ids)] : [];
    if (!refs.length) {
      issues.push("script segment must cite at least one research claim: " + String(segment?.id ?? "(no id)"));
      continue;
    }
    for (const claimId of refs) {
      if (!claimById.has(claimId)) {
        issues.push("script segment references unknown research claim " + claimId + ": " + String(segment?.id ?? "(no id)"));
      }
    }
  }

  return {
    status: issues.length ? "FAIL" : "PASS",
    project_id: script?.project_id ?? null,
    claim_count: claims.length,
    segment_count: segments.length,
    issues,
  };
}

/**
 * Review envelopes are not quality proof by themselves. Require explicit PASS,
 * no unresolved issues, and complete ID coverage so a skipped/partial review
 * cannot silently become a publishable result.
 */
export function evaluateProductionReviews(reviews, research, script) {
  const errors = [];
  const allReviews = Array.isArray(reviews) ? reviews : [];
  const roleIndex = new Map();
  for (const review of allReviews) {
    if (!review?.role) {
      errors.push("review envelope is missing role");
      continue;
    }
    if (roleIndex.has(review.role)) errors.push("duplicate review role: " + review.role);
    roleIndex.set(review.role, review);
  }

  const checks = [
    {
      role: "research-agent",
      idsKey: "reviewed_claim_ids",
      expectedIds: (Array.isArray(research?.claims) ? research.claims : []).map((claim) => claim.id).filter(Boolean),
      label: "research claims",
    },
    {
      role: "director-agent",
      idsKey: "reviewed_segment_ids",
      expectedIds: (Array.isArray(script?.segments) ? script.segments : []).map((segment) => segment.id).filter(Boolean),
      label: "script segments",
    },
  ];

  for (const check of checks) {
    const review = roleIndex.get(check.role);
    if (!review) {
      errors.push("missing required " + check.role + " review");
      continue;
    }
    if (review.status !== "completed") {
      errors.push(check.role + " review is " + String(review.status) + ", not completed");
      continue;
    }
    const output = review.output;
    if (!output || typeof output !== "object" || Array.isArray(output)) {
      errors.push(check.role + " output must be a JSON object");
      continue;
    }
    if (output.verdict !== "pass") errors.push(check.role + " verdict must be pass");
    if (!Array.isArray(output.issues)) {
      errors.push(check.role + " output must include an issues array");
    } else if (output.issues.length) {
      errors.push(check.role + " reported unresolved issues: " + JSON.stringify(output.issues.slice(0, 5)));
    }

    const reviewed = output[check.idsKey];
    if (!Array.isArray(reviewed)) {
      errors.push(check.role + " output must include " + check.idsKey);
      continue;
    }
    const reviewedSet = new Set(reviewed);
    const expectedSet = new Set(check.expectedIds);
    const missing = [...expectedSet].filter((id) => !reviewedSet.has(id));
    const unknown = [...reviewedSet].filter((id) => !expectedSet.has(id));
    if (missing.length) errors.push(check.role + " did not cover all " + check.label + ": " + missing.join(", "));
    if (unknown.length) errors.push(check.role + " reported unknown " + check.label + ": " + unknown.join(", "));
  }

  const fingerprints = productionContentFingerprints(research, script);
  return {
    version: "1.0",
    status: errors.length ? "FAIL" : "PASS",
    project_id: research?.project_id ?? script?.project_id ?? null,
    claim_count: Array.isArray(research?.claims) ? research.claims.length : 0,
    segment_count: Array.isArray(script?.segments) ? script.segments.length : 0,
    ...fingerprints,
    errors,
  };
}

/**
 * A persisted review gate proves nothing on its own: it must be bound to the
 * exact research + script that were reviewed. Recompute the content fingerprints
 * and coverage counts and report every mismatch. Returns [] when the gate is
 * fresh and fully covering; otherwise a list of human-readable problems. This is
 * the consumer-side "expired review" check (the producer writes the gate).
 */
export function evaluateReviewGateBinding(gate, research, script) {
  const errors = [];
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    return ["review gate artifact is missing or malformed"];
  }
  const expected = productionContentFingerprints(research, script);
  const projectId = research?.project_id ?? script?.project_id ?? null;
  const claims = Array.isArray(research?.claims) ? research.claims : [];
  const segments = Array.isArray(script?.segments) ? script.segments : [];
  if (gate.status !== "PASS") errors.push("review gate status is not PASS");
  if (Array.isArray(gate.errors) && gate.errors.length) errors.push("review gate carries unresolved errors");
  if (gate.project_id !== projectId) errors.push("review gate project_id does not match current inputs");
  if (gate.research_fingerprint !== expected.research_fingerprint) {
    errors.push("review gate research fingerprint is stale (research changed since review)");
  }
  if (gate.script_fingerprint !== expected.script_fingerprint) {
    errors.push("review gate script fingerprint is stale (script changed since review)");
  }
  if (gate.claim_count !== claims.length) errors.push("review gate claim coverage count is stale");
  if (gate.segment_count !== segments.length) errors.push("review gate segment coverage count is stale");
  return errors;
}
