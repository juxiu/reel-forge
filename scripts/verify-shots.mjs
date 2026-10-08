import fs from "node:fs";
const ir = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8"));
const registry = fs.readFileSync("src/shots/registry.jsx", "utf8");
const missing = ir.scenes.map((scene) => scene.id).filter((id) => !registry.includes('"' + id + '"'));
if (missing.length) throw new Error("shot registry missing: " + missing.join(","));
console.log("shots PASS", ir.scenes.length);
