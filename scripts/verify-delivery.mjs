import fs from "node:fs";import{packageDelivery}from "../src/delivery/package.mjs";
const file="artifacts/render/reel-forge.mp4";if(!fs.existsSync(file)){console.log("delivery SKIP: render not present");process.exit(0)}
const r=packageDelivery({projectId:"demo-production",files:[file]});if(r.files.length!==1||!r.files[0].sha256)throw new Error("delivery manifest failed");console.log("delivery PASS");
