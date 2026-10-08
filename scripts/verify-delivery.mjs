import fs from "node:fs";import{packageDelivery}from "../src/delivery/package.mjs";
const files=["artifacts/render/reel-forge-16x9.mp4","artifacts/render/reel-forge-9x16.mp4"];
for(const f of files)if(!fs.existsSync(f))throw new Error("missing "+f);
const r=packageDelivery({projectId:"demo-production",files});if(r.files.length!==2||r.files.some(x=>!x.sha256))throw new Error("delivery manifest failed");
console.log("delivery PASS");
