import{spawnSync}from "node:child_process";import fs from "node:fs";
fs.mkdirSync("artifacts/preview",{recursive:true});
const r=spawnSync("npx",["remotion","render","src/remotion/index.jsx","ReelForge16x9","artifacts/preview/preview.mp4","--codec=h264","--frames=0-899","--log=error"],{stdio:"inherit"});if(r.status)process.exit(r.status);if(!fs.statSync("artifacts/preview/preview.mp4").size)throw new Error("preview empty");console.log("preview PASS");
