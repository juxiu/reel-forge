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
console.log(JSON.stringify({stage:"P1",status:"PASS",outputs:required},null,2));
