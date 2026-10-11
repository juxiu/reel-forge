export const DEFAULT_DURATION_TOLERANCE_RATIO = 0.2;

/**
 * Compare final, timeline-derived Render IR duration with the requested project
 * target. The default acceptable deviation is +/-20%; project-specific overrides
 * must be within 0..0.5. This checks duration only, not pacing or edit quality.
 */
export function durationTargetReport(project, actualSeconds) {
  const issues = [];
  const target = Number(project?.duration_target_s);
  const actual = Number(actualSeconds);
  const tolerance = project?.duration_tolerance_ratio === undefined
    ? DEFAULT_DURATION_TOLERANCE_RATIO
    : Number(project.duration_tolerance_ratio);

  if (!project?.project_id) issues.push("project_id is required");
  if (!Number.isFinite(target) || target <= 0) issues.push("duration_target_s must be a positive finite number");
  if (!Number.isFinite(actual) || actual <= 0) issues.push("render duration must be a positive finite number");
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 0.5) {
    issues.push("duration_tolerance_ratio must be between 0 and 0.5");
  }

  const valid = Number.isFinite(target) && target > 0
    && Number.isFinite(actual) && actual > 0
    && Number.isFinite(tolerance) && tolerance >= 0 && tolerance <= 0.5;
  const minSeconds = valid ? target * (1 - tolerance) : null;
  const maxSeconds = valid ? target * (1 + tolerance) : null;
  if (valid && (actual < minSeconds || actual > maxSeconds)) {
    issues.push("actual duration " + actual.toFixed(2) + "s is outside target range "
      + minSeconds.toFixed(2) + "–" + maxSeconds.toFixed(2) + "s");
  }

  return {
    version: "1.0",
    status: issues.length ? "FAIL" : "PASS",
    project_id: project?.project_id ?? null,
    target_seconds: Number.isFinite(target) ? target : null,
    actual_seconds: Number.isFinite(actual) ? actual : null,
    tolerance_ratio: Number.isFinite(tolerance) ? tolerance : null,
    min_seconds: minSeconds,
    max_seconds: maxSeconds,
    deviation_ratio: valid ? (actual - target) / target : null,
    issues,
  };
}
