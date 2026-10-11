import fs from "node:fs";
import path from "node:path";
import {groupIdOf, maxShotsPerGroup} from "../src/build/limits.mjs";

const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const maxPerGroup = maxShotsPerGroup();
if (!fs.existsSync("src/shots/registry.jsx")) throw new Error("shot registry missing");
const registry = fs.readFileSync("src/shots/registry.jsx", "utf8");

const missing = ir.scenes
  .map((scene) => scene.id)
  .filter((id) => !registry.includes('"' + id + '"'));
if (missing.length) throw new Error("shot registry missing: " + missing.join(","));

for (const scene of ir.scenes) {
  const number = Number(scene.id.split("-").at(-1));
  const group = groupIdOf(number, maxPerGroup);
  const shot = "SC" + String(number).padStart(2, "0");
  const groupDir = path.join("src/shots", group);
  const indexFile = path.join(groupDir, "index.jsx");
  if (!fs.existsSync(indexFile)) throw new Error("shot group index missing: " + indexFile);

  // Resolve the component actually selected by the generated group index. New-topic builds use
  // fallback-SCxx.jsx, while a verified authored pack uses SCxx.jsx. Looking only for SCxx.jsx
  // inspected the stale checked-in implementation and missed missing/invalid active fallbacks.
  const indexSource = fs.readFileSync(indexFile, "utf8");
  const importLine = indexSource.split(/\r?\n/).find((line) =>
    line.includes("import {" + shot + "} from \"./") && line.includes(".jsx")
  );
  if (!importLine) throw new Error("active shot import missing: " + indexFile + " → " + shot);
  const parsed = /import\s+\{([A-Za-z0-9_]+)\}\s+from\s+["']\.\/([^"']+\.jsx)["']/.exec(importLine);
  if (!parsed || parsed[1] !== shot) throw new Error("invalid active shot import: " + importLine);
  const file = path.join(groupDir, parsed[2]);
  if (!fs.existsSync(file)) throw new Error("active shot source missing: " + file);

  const source = fs.readFileSync(file, "utf8");
  if (source.includes("\\n")) throw new Error("shot source contains literal escaped newline: " + file);
  if (!source.includes("ExplainerShot")) throw new Error("shot source missing renderer: " + file);
  if (!source.includes("export function " + shot)) throw new Error("shot source export missing: " + file);
}

console.log("shots PASS", JSON.stringify({
  scenes: ir.scenes.length,
  active_sources_checked: ir.scenes.length,
  authored_or_fallback: "resolved from generated group indexes",
}));
