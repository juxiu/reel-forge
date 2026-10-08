import crypto from "node:crypto";

export function cacheKey(artifactType,payload) {
  return crypto.createHash("sha256")
    .update(artifactType+"\n"+JSON.stringify(payload))
    .digest("hex");
}

export function buildBatchManifest(project,variants) {
  const shared={
    project_id:project.project_id,
    source_hash:cacheKey("research",project.research),
    script_hash:cacheKey("script",project.script)
  };
  return variants.map(variant=>({
    variant_id:variant.id,
    width:variant.width,
    height:variant.height,
    fps:variant.fps,
    shared
  }));
}
