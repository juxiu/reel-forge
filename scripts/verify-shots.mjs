import fs from "node:fs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const maxPerGroup = Number(process.env.MAX_SHOTS_PER_GROUP || 6);
if (!fs.existsSync("src/shots/registry.jsx")) throw new Error("shot registry missing");
const registry = fs.readFileSync("src/shots/registry.jsx", "utf8");

const missing = ir.scenes
  .map((scene) => scene.id)
  .filter((id) => !registry.includes('"' + id + '"'));
if (missing.length) throw new Error("shot registry missing: " + missing.join(","));

for (const scene of ir.scenes) {
  const number = Number(scene.id.split("-").at(-1));
  const group = "G" + String(Math.floor((number - 1) / maxPerGroup) + 1);
  const shot = "SC" + String(number).padStart(2, "0");
  const file = "src/shots/" + group + "/" + shot + ".jsx";
  if (!fs.existsSync(file)) throw new Error("shot source missing: " + file);

  const source = fs.readFileSync(file, "utf8");
  if (source.includes("\\n")) throw new Error("shot source contains literal escaped newline: " + file);
  if (!source.includes("ExplainerShot")) throw new Error("shot source missing renderer: " + file);
  if (!source.includes("export function " + shot)) throw new Error("shot source export missing: " + file);
}

console.log("shots PASS", ir.scenes.length);
