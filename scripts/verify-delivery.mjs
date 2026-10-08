import fs from "node:fs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const manifestPath = "artifacts/delivery/" + project.project_id + "/delivery-manifest.json";
if (!fs.existsSync(manifestPath)) throw new Error("delivery manifest missing");
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
const names = new Set((manifest.files || []).map((file) => file.name));
const missing = required.filter((name) => !names.has(name));
if (missing.length) throw new Error("delivery missing: " + missing.join(","));
if ((manifest.files || []).some((file) => !file.sha256 || !file.size)) throw new Error("delivery checksum incomplete");

console.log("delivery PASS", manifest.files.length, "files");
