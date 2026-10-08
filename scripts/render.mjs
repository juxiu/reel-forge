import{spawnSync}from "node:child_process";
const targets=[["ReelForge16x9","artifacts/render/reel-forge-16x9.mp4"],["ReelForge9x16","artifacts/render/reel-forge-9x16.mp4"]];
for(const [id,out] of targets){const r=spawnSync("npx",["remotion","render","src/remotion/index.jsx",id,out,"--codec=h264"],{stdio:"inherit"});if(r.status)process.exit(r.status);}
