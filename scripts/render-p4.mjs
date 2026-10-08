import {spawnSync} from "node:child_process";
import fs from "node:fs";
fs.mkdirSync("artifacts/render",{recursive:true});
const args=["remotion","render","src/remotion/index.jsx","Demo","artifacts/render/demo.mp4","--codec=h264"];
const r=spawnSync("npx",args,{stdio:"inherit"});
if(r.status!==0) process.exit(r.status||1);
console.log("P4 render PASS");
