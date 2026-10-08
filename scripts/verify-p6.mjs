import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
const r=spawnSync(process.execPath,["scripts/run-p3.mjs"],{encoding:"utf8"});
if(r.status!==0){process.stderr.write(r.stderr||r.stdout);process.exit(r.status||1);}
const run=spawnSync(process.execPath,["scripts/run-p6.mjs"],{encoding:"utf8"});
if(run.status!==0){process.stderr.write(run.stderr||run.stdout);process.exit(run.status||1);}
const dir=path.join(process.cwd(),"artifacts","demo-semantic-search");
const report=JSON.parse(fs.readFileSync(path.join(dir,"qc-report.json"),"utf8"));
const plan=JSON.parse(fs.readFileSync(path.join(dir,"rerun-plan.json"),"utf8"));
if(report.status!=="PASS") throw new Error("QC failed");
if(!plan.affected_nodes.includes("scene:002")||!plan.affected_nodes.includes("render:002")||!plan.affected_nodes.includes("delivery")) throw new Error("downstream rerun propagation failed");
if(plan.affected_nodes.includes("scene:001")||plan.affected_nodes.includes("render:001")) throw new Error("rerun plan is too broad");
console.log(JSON.stringify({stage:"P6",status:"PASS",outputs:["qc-report.json","rerun-plan.json"],negative_regression:"PASS"},null,2));
