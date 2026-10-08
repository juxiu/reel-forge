import fs from "node:fs";
import {packageDelivery} from "../src/delivery/package.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const files = [
  "artifacts/render/reel-forge-16x9.mp4",
  "artifacts/render/reel-forge-9x16.mp4",
];
for (const file of files) if (!fs.existsSync(file)) throw new Error("missing " + file);
const result = packageDelivery({projectId: project.project_id, files});
if (result.project_id !== project.project_id || result.files.length !== 2 || result.files.some((file) => !file.sha256)) {
  throw new Error("delivery manifest failed");
}
const manifest = "artifacts/delivery/" + project.project_id + "/delivery-manifest.json";
if (!fs.existsSync(manifest)) throw new Error("delivery manifest missing");
console.log("delivery PASS");
