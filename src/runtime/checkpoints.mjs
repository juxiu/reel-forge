import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const CHECKPOINTS = [
  "length-language",
  "narration-signoff",
  "voiceover",
  "pilot-preview",
];

function checkpointPath(projectId, root = "artifacts") {
  return path.join(root, projectId, "runtime", "checkpoints.json");
}

const ARTIFACT_PATTERNS = {
  "length-language": ["fixtures/project.json"],
  "narration-signoff": ["fixtures/script.json", "script/narration.txt", "script/storyboard_src.md"],
  "voiceover": ["script/timeline.json", "script/timeline.md", "public/audio.mp3", "public/audio.wav"],
  "pilot-preview": ["artifacts/preview/preview.mp4", "artifacts/preview/manifest.json", "artifacts/preview/preview-manifest.json"],
};

function existingFiles(root, patterns) {
  return patterns
    .map((file) => path.join(root === "artifacts" ? "." : root, file))
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
    .sort();
}

export function checkpointArtifactHash(name, root = "artifacts") {
  if (!CHECKPOINTS.includes(name)) throw new Error("unknown checkpoint: " + name);
  const files = existingFiles(root, ARTIFACT_PATTERNS[name] || []);
  if (!files.length) throw new Error("checkpoint artifact missing: " + name);
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    hash.update(relative + "\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return {hash: hash.digest("hex"), files: files.map((file) => path.relative(process.cwd(), file))};
}

export function readCheckpoints(projectId, root = "artifacts") {
  const file = checkpointPath(projectId, root);
  if (!fs.existsSync(file)) return {project_id: projectId, checkpoints: {}};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function initCheckpoints(projectId, root = "artifacts") {
  const state = readCheckpoints(projectId, root);
  for (const name of CHECKPOINTS) state.checkpoints[name] ||= {status: "pending"};
  const file = checkpointPath(projectId, root);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  return state;
}

export function resolveCheckpoint(projectId, name, status = "approved", root = "artifacts") {
  if (!CHECKPOINTS.includes(name)) throw new Error("unknown checkpoint: " + name);
  if (!["pending", "approved", "rejected"].includes(status)) throw new Error("invalid checkpoint status");
  const state = initCheckpoints(projectId, root);
  if (status === "approved") {
    const artifact = checkpointArtifactHash(name, root);
    state.checkpoints[name] = {status, resolved_at: new Date().toISOString(), artifact_hash: artifact.hash, artifact_files: artifact.files};
  } else {
    state.checkpoints[name] = {status, resolved_at: new Date().toISOString()};
  }
  fs.writeFileSync(checkpointPath(projectId, root), JSON.stringify(state, null, 2));
  return state.checkpoints[name];
}

export function requireCheckpoint(projectId, name, root = "artifacts") {
  const state = initCheckpoints(projectId, root);
  const value = state.checkpoints[name];
  if (!value || value.status !== "approved" || !value.artifact_hash) throw new Error("checkpoint not approved: " + name);
  const current = checkpointArtifactHash(name, root);
  if (current.hash !== value.artifact_hash) throw new Error("checkpoint artifact changed after approval: " + name);
  return value;
}
