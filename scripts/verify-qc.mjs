import fs from "node:fs";import{runMediaQc}from "../src/qc/run.mjs";
const file=process.argv[2]||"artifacts/render/reel-forge.mp4";if(!fs.existsSync(file)){console.log("qc SKIP: render not present");process.exit(0)}
const r=await runMediaQc(file);console.log(JSON.stringify({status:r.status,motion_frames:r.motion_frames}));if(r.status!=="PASS")process.exit(1);
