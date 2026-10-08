import fs from "node:fs";
import path from "node:path";
import {repairRenderIR, makeRepairPlan} from "../src/repair/engine.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const qcFile = path.join("artifacts", project.project_id, "qc", "report.json");
if (!fs.existsSync(qcFile)) throw new Error("QC report missing; run npm run qc first");
const report = JSON.parse(fs.readFileSync(qcFile, "utf8"));
if (report.status === "PASS") {
  console.log("repair SKIP: QC already PASS");
  process.exit(0);
}

const maxRetries = Number(process.env.REPAIR_RETRIES || 2);
const plan = makeRepairPlan(report, maxRetries);
const plansDir = path.join("artifacts", project.project_id, "repair");
fs.mkdirSync(plansDir, {recursive: true});
fs.writeFileSync(path.join(plansDir, "repair-plan.json"), JSON.stringify(plan, null, 2));

for (const ratio of ["16x9", "9x16"]) {
  const file = "fixtures/render-ir-" + ratio + ".json";
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const repaired = repairRenderIR(ir, report.issues);
  fs.writeFileSync(file, JSON.stringify(repaired, null, 2));
}
fs.writeFileSync(path.join(plansDir, "status.json"), JSON.stringify({status: "patched", repaired_at: new Date().toISOString()}, null, 2));
console.log("repair PASS: IR patched; rerun render + qc");
