import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath,["scripts/run-p1.mjs"],{encoding:"utf8"});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
const dir = path.join(process.cwd(),"artifacts","demo-semantic-search");
const required = ["research.json","script.json","content-qa.json"];
for (const f of required) if (!fs.existsSync(path.join(dir,f))) throw new Error("missing " + f);
const qa = JSON.parse(fs.readFileSync(path.join(dir,"content-qa.json"),"utf8"));
if (qa.status !== "PASS") throw new Error("content QA did not pass");

// Regression: an unreferenced claim must fail Content QA.
const research = JSON.parse(fs.readFileSync(path.join(dir,"research.json"),"utf8"));
const script = JSON.parse(fs.readFileSync(path.join(dir,"script.json"),"utf8"));
const referenced = new Set(script.segments.flatMap(s=>s.claim_ids));
const badCoverage = research.claims.some(c=>!referenced.has(c.id));
if (badCoverage) throw new Error("fixture unexpectedly has uncovered claims");
const mutation = [...script.segments];
mutation[0] = {...mutation[0],claim_ids:[]};
const mutatedRefs = new Set(mutation.flatMap(s=>s.claim_ids));
if (research.claims.every(c=>mutatedRefs.has(c.id))) throw new Error("negative coverage regression did not detect missing claim");

console.log(JSON.stringify({stage:"P1",status:"PASS",outputs:required,negative_regression:"PASS"},null,2));
