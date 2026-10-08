import fs from "node:fs";
import crypto from "node:crypto";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const manifestPath = "artifacts/delivery/" + project.project_id + "/delivery-manifest.json";
if (!fs.existsSync(manifestPath)) throw new Error("delivery manifest missing");

const manifestDir = "artifacts/delivery/" + project.project_id;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.version !== "0.3") throw new Error("unsupported delivery manifest version");
if (manifest.project_id !== project.project_id) throw new Error("delivery project mismatch");

const required = [
  "reel-forge-16x9.mp4",
  "reel-forge-9x16.mp4",
  "timeline.json",
  "timeline.md",
  "timeline-source.json",
  "分镜表.md",
  "research.json",
  "research.md",
  "script.json",
  "report.json",
  "report.md",
  "frame_metrics_16x9.json",
  "frame_metrics_9x16.json",
  "motion_16x9.json",
  "motion_9x16.json",
  "visual_regression_16x9.json",
  "visual_regression_9x16.json",
  "text_provenance.json",
  "asr-second-pass.json",
  "render-ir-16x9.json",
  "render-ir-9x16.json",
];

const entries = new Map((manifest.files || []).map((file) => [file.name, file]));
if (entries.has("status.json") && !entries.has("source-repair.json")) throw new Error("repair status requires source-repair audit");
if (entries.has("source-repair.json")) {
  const sourceRepair = JSON.parse(fs.readFileSync(manifestDir + "/source-repair.json", "utf8"));
  if (sourceRepair.version !== "0.2" || !Array.isArray(sourceRepair.entries)) throw new Error("source repair audit incomplete");
}
const missing = required.filter((name) => !entries.has(name));
if (missing.length) throw new Error("delivery missing: " + missing.join(","));
if (manifest.metadata?.qc_status !== "PASS") throw new Error("delivery metadata QC is not PASS");
if (manifest.metadata?.visual_regression !== "advisory") throw new Error("delivery visual regression metadata must be advisory");
if (manifest.metadata?.text_provenance !== "PASS") throw new Error("delivery text provenance metadata is not PASS");
if (JSON.stringify(manifest.metadata?.ratios || []) !== JSON.stringify(["16x9", "9x16"])) {
  throw new Error("delivery ratio metadata mismatch");
}

const asr = JSON.parse(fs.readFileSync(manifestDir + "/asr-second-pass.json", "utf8"));
if (!asr.provider || !Array.isArray(asr.segments) || !asr.segments.length) throw new Error("delivery ASR artifact incomplete");
if (Boolean(asr.required_real_asr) !== Boolean(manifest.metadata?.real_asr)) {
  throw new Error("delivery ASR mode metadata mismatch");
}
if (asr.required_real_asr === true && asr.source !== "external-asr-provider") {
  throw new Error("real ASR delivery is not provider-backed");
}

const provenance = JSON.parse(fs.readFileSync(manifestDir + "/text_provenance.json", "utf8"));
if (provenance.status !== "PASS") throw new Error("delivery text provenance not PASS");

for (const ratio of ["16x9", "9x16"]) {
  const frame = JSON.parse(fs.readFileSync(manifestDir + "/frame_metrics_" + ratio + ".json", "utf8"));
  const motion = JSON.parse(fs.readFileSync(manifestDir + "/motion_" + ratio + ".json", "utf8"));
  const visual = JSON.parse(fs.readFileSync(manifestDir + "/visual_regression_" + ratio + ".json", "utf8"));
  if (frame.summary?.status !== "PASS" || motion.summary?.status !== "PASS") {
    throw new Error("delivery metrics not PASS: " + ratio);
  }
  if (visual.gate !== "advisory" || visual.blocking !== false) {
    throw new Error("delivery visual regression must stay advisory: " + ratio);
  }
}

for (const [name, entry] of entries) {
  if (!entry.sha256 || !entry.size) throw new Error("delivery checksum incomplete: " + name);
  const file = manifestDir + "/" + name;
  if (!fs.existsSync(file)) throw new Error("delivery file missing: " + name);
  const data = fs.readFileSync(file);
  const sha256 = crypto.createHash("sha256").update(data).digest("hex");
  if (sha256 !== entry.sha256) throw new Error("delivery checksum mismatch: " + name);
  if (data.length !== entry.size) throw new Error("delivery size mismatch: " + name);
}

console.log("delivery PASS", entries.size, "files");
