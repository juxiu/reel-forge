import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
const r=spawnSync(process.execPath,["scripts/run-p7.mjs"],{encoding:"utf8"});
if(r.status!==0){process.stderr.write(r.stderr||r.stdout);process.exit(r.status||1);}
const dir=path.join(process.cwd(),"artifacts","batch");
const manifest=JSON.parse(fs.readFileSync(path.join(dir,"delivery-manifest.json"),"utf8"));
const cache=JSON.parse(fs.readFileSync(path.join(dir,"cache-report.json"),"utf8"));
if(manifest.length!==2) throw new Error("batch variants missing");
if(!cache.shared_reused) throw new Error("shared artifact cache was not reused");
if(manifest[0].width===manifest[1].width&&manifest[0].height===manifest[1].height) throw new Error("variants did not differ");
console.log(JSON.stringify({stage:"P7",status:"PASS",outputs:["delivery-manifest.json","cache-report.json"]},null,2));
