import fs from "node:fs";
import {spawnSync} from "node:child_process";
const scene=process.argv[2];
const frames=String(process.argv[3]||"").split(",").map(Number).filter(Number.isFinite);
const out=process.argv[4]||"artifacts/stills";
if(!scene||!frames.length) throw new Error("usage: node scripts/still-batch.mjs scene-id frame,frame,... out");
const count=frames.length;
for(const [i,frame] of frames.entries()){
  const file=out+"/f"+String(frame).padStart(5,"0")+".png";
  fs.mkdirSync(out,{recursive:true});
  const r=spawnSync("npx",["remotion","still","src/remotion/index.jsx","ReelForge16x9",file,"--frame="+Math.max(0,frame-1),"--log=error"],{stdio:"inherit"});
  if(r.status!==0||!fs.existsSync(file)||!fs.statSync(file).size) throw new Error("still failed: "+scene+" #"+(i+1));
}
console.log("still batch PASS",scene,count);
