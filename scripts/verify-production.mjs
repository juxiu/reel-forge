import fs from "node:fs";
import crypto from "node:crypto";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const root = "artifacts/" + project.project_id;
const required = [
  "research.json","research.md","script.json","qc/report.json","qc/report.md",
  "qc/frame_metrics_16x9.json","qc/frame_metrics_9x16.json",
  "qc/motion_16x9.json","qc/motion_9x16.json",
  "audio/asr-second-pass.json","repair/status.json","repair/source-repair.json",
];
for (const file of required) {
  const full = root + "/" + file;
  if (!fs.existsSync(full) || !fs.statSync(full).size) throw new Error("production artifact missing: " + full);
}
for (const ratio of ["16x9","9x16"]) {
  const render = "artifacts/render/reel-forge-" + ratio + ".mp4";
  if (!fs.existsSync(render) || !fs.statSync(render).size) throw new Error("production render missing: " + render);
  const frame = JSON.parse(fs.readFileSync(root + "/qc/frame_metrics_" + ratio + ".json","utf8"));
  const motion = JSON.parse(fs.readFileSync(root + "/qc/motion_" + ratio + ".json","utf8"));
  if (frame.summary?.status !== "PASS") throw new Error("frame metrics not PASS: " + ratio);
  if (motion.summary?.status !== "PASS") throw new Error("motion metrics not PASS: " + ratio);
}
const qc = JSON.parse(fs.readFileSync(root + "/qc/report.json","utf8"));
if (qc.status !== "PASS") throw new Error("production QC not PASS");
const asr = JSON.parse(fs.readFileSync(root + "/audio/asr-second-pass.json","utf8"));
const strictProduction = process.env.PRODUCTION_MODE === "1";
const proxyProviders = new Set(["tts-alignment-proxy", "tts-word-boundary"]);
if (strictProduction) {
  if (asr.required_real_asr !== true || asr.source !== "external-asr-provider") {
    throw new Error("production mode requires a real external ASR provider");
  }
  if (proxyProviders.has(asr.provider) || asr.alignment_mode !== "external-asr") {
    throw new Error("proxy or non-external ASR is forbidden in production mode");
  }
}
const repair = JSON.parse(fs.readFileSync(root + "/repair/status.json","utf8"));
const sourceRepair = JSON.parse(fs.readFileSync(root + "/repair/source-repair.json","utf8"));
if (!Array.isArray(sourceRepair.entries)) throw new Error("source repair audit malformed");
if (!["patched","not-needed"].includes(repair.status)) throw new Error("invalid repair status: " + repair.status);
const manifestPath = "artifacts/delivery/" + project.project_id + "/delivery-manifest.json";
if (!fs.existsSync(manifestPath)) throw new Error("delivery manifest missing");
const manifest = JSON.parse(fs.readFileSync(manifestPath,"utf8"));
if (manifest.metadata?.qc_status !== "PASS") throw new Error("delivery QC metadata not PASS");
for (const entry of manifest.files || []) {
  const file = "artifacts/delivery/" + project.project_id + "/" + entry.name;
  if (!fs.existsSync(file)) throw new Error("delivery artifact missing: " + file);
  const data = fs.readFileSync(file);
  const sha = crypto.createHash("sha256").update(data).digest("hex");
  if (sha !== entry.sha256 || data.length !== entry.size) throw new Error("delivery integrity mismatch: " + entry.name);
}
console.log("production gate PASS", JSON.stringify({
  project_id:project.project_id,
  mode:strictProduction ? "production" : "candidate",
  asr_mode:asr.alignment_mode || "unknown",
  real_asr:asr.required_real_asr === true,
  qc:qc.status,
  delivery_files:manifest.files.length
}));
