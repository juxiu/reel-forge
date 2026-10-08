import fs from "node:fs";
import path from "node:path";

export const CHECKPOINTS = [
  "length-language",
  "narration-signoff",
  "voiceover",
  "pilot-preview",
];

function checkpointPath(projectId, root = "artifacts") {
  return path.join(root, projectId, "runtime", "checkpoints.json");
}

export function readCheckpoints(projectId, root = "artifacts") {
  const file = checkpointPath(projectId, root);
  if (!fs.existsSync(file)) {
    return {project_id: projectId, checkpoints: {}};
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function initCheckpoints(projectId, root = "artifacts") {
  const state = readCheckpoints(projectId, root);
  for (const name of CHECKPOINTS) {
    state.checkpoints[name] ||= {status: "pending"};
  }
  const file = checkpointPath(projectId, root);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  return state;
}

export function resolveCheckpoint(projectId, name, status = "approved", root = "artifacts") {
  if (!CHECKPOINTS.includes(name)) throw new Error("unknown checkpoint: " + name);
  if (!["pending", "approved", "rejected"].includes(status)) throw new Error("invalid checkpoint status");
  const state = initCheckpoints(projectId, root);
  state.checkpoints[name] = {status, resolved_at: new Date().toISOString()};
  fs.writeFileSync(checkpointPath(projectId, root), JSON.stringify(state, null, 2));
  return state.checkpoints[name];
}

export function requireCheckpoint(projectId, name, root = "artifacts") {
  const state = initCheckpoints(projectId, root);
  const value = state.checkpoints[name];
  if (!value || value.status !== "approved") {
    throw new Error("checkpoint not approved: " + name);
  }
  return value;
}
