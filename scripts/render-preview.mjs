import crypto from "node:crypto";
import fs from "node:fs";
import {run as spawn} from "../src/runtime/spawn.mjs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const fps = Number(ir.fps || 30);
const durationInFrames = Math.max(1, Math.ceil(Number(ir.duration || 0) * fps));
const previewFrames = Math.min(durationInFrames, Number(process.env.PREVIEW_SECONDS || 30) * fps);
const lastFrame = Math.max(0, previewFrames - 1);

const outDir = "artifacts/preview";
const output = outDir + "/preview.mp4";
fs.mkdirSync(outDir, {recursive: true});

const r = spawn(
  "npx",
  [
    "remotion",
    "render",
    "src/remotion/index.jsx",
    "ReelForge16x9",
    output,
    "--codec=h264",
    "--frames=0-" + lastFrame,
    "--log=error",
  ],
  {stdio: "inherit"},
);

if (r.error) {
  console.error("渲染命令起不来: " + r.error + "（依赖没装？先 npm install）");
  process.exit(127);
}
if (r.status !== 0) process.exit(r.status ?? 1);
if (!fs.existsSync(output) || !fs.statSync(output).size) {
  throw new Error("preview empty");
}

const data = fs.readFileSync(output);
const manifest = {
  project_id: ir.project_id,
  composition: "ReelForge16x9",
  fps,
  source_duration_frames: durationInFrames,
  preview_frames: previewFrames,
  preview_seconds: Number((previewFrames / fps).toFixed(3)),
  file: output,
  size: data.length,
  sha256: crypto.createHash("sha256").update(data).digest("hex"),
  generated_at: new Date().toISOString(),
};

fs.writeFileSync(outDir + "/manifest.json", JSON.stringify(manifest, null, 2));
console.log("preview PASS", JSON.stringify({
  frames: previewFrames,
  seconds: manifest.preview_seconds,
}));
