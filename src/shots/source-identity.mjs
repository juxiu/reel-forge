import crypto from "node:crypto";

export function segmentSourceFingerprint(segment) {
  if (!segment || typeof segment !== "object" || !segment.id) throw new Error("script segment identity requires a non-empty id");
  const payload = JSON.stringify({
    id: String(segment.id),
    text: String(segment.text ?? ""),
    subtitles: Array.isArray(segment.subtitles) ? segment.subtitles.map((v) => String(v ?? "")) : [],
    claim_ids: Array.isArray(segment.claim_ids) ? segment.claim_ids.map((v) => String(v ?? "")) : [],
  });
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

export function sourceIdentityForScene(project, script, scene) {
  const index = Number(scene?.source_ref?.segment_index);
  if (!Number.isInteger(index) || index < 0 || !Array.isArray(script?.segments) || !script.segments[index]) {
    throw new Error("scene has no valid source_ref.segment_index: " + String(scene?.id ?? "unknown"));
  }
  const segment = script.segments[index];
  if (scene.source_ref?.script_id && scene.source_ref.script_id !== segment.id) {
    throw new Error("scene/script mapping mismatch for " + scene.id + ": " + scene.source_ref.script_id + " != " + segment.id);
  }
  if (!project?.project_id || !script?.project_id || project.project_id !== script.project_id) {
    throw new Error("project/script identity mismatch while binding shot source");
  }
  return {project_id:String(project.project_id),script_id:String(segment.id),script_sha256:segmentSourceFingerprint(segment)};
}

export function shotSourceMarker(identity) {
  return "// reel-forge-source: " + JSON.stringify(identity);
}

export function parseShotSourceIdentity(source) {
  const match = String(source ?? "").match(/^\/\/ reel-forge-source: (\{[^\r\n]*\})\s*$/m);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

export function checkShotSourceIdentity(source, expected) {
  const actual=parseShotSourceIdentity(source);
  const ok=Boolean(actual && actual.project_id===expected?.project_id && actual.script_id===expected?.script_id && actual.script_sha256===expected?.script_sha256);
  return {ok,actual,expected,reason:ok?null:(!actual?"missing-or-malformed-source-marker":"source-marker-mismatch")};
}
