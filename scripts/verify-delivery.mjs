import fs from "node:fs";
import crypto from "node:crypto";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const manifestPath = "artifacts/delivery/" + project.project_id + "/delivery-manifest.json";
if (!fs.existsSync(manifestPath)) throw new Error("delivery manifest missing");

const manifestDir = "artifacts/delivery/" + project.project_id;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.project_id !== project.project_id) throw new Error("delivery project mismatch");

const required = [
  "reel-forge-16x9.mp4",
  "reel-forge-9x16.mp4",
  "timeline.json",
  "timeline.md",
  "分镜表.md",
  "research.json",
  "research.md",
  "script.json",
  "report.json",
];

const entries = new Map((manifest.files || []).map((file) => [file.name, file]));
const missing = required.filter((name) => !entries.has(name));
if (missing.length) throw new Error("delivery missing: " + missing.join(","));

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
