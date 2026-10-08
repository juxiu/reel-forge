import fs from "node:fs";
import path from "node:path";

const required = [
  "README.md",
  "docs/IMPLEMENTATION_PLAN.md",
  "docs/ARCHITECTURE.md",
  "contracts/research.schema.json",
  "contracts/script.schema.json",
  "fixtures/demo-input.json",
  ".github/workflows/verify.yml"
];

for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) throw new Error("missing " + file);
  const text = fs.readFileSync(path.resolve(file), "utf8");
  if (!text.trim()) throw new Error("empty " + file);
}

for (const schema of ["contracts/research.schema.json","contracts/script.schema.json"]) {
  JSON.parse(fs.readFileSync(schema, "utf8"));
}
console.log(JSON.stringify({stage:"P0",status:"PASS",artifacts:required}, null, 2));
