import fs from "node:fs";
const captions=JSON.parse(fs.readFileSync("fixtures/captions.json","utf8"));
if(!Array.isArray(captions.captions))throw new Error("caption artifact invalid");
const wide=JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json","utf8")),tall=JSON.parse(fs.readFileSync("fixtures/render-ir-9x16.json","utf8"));
if(wide.width!==1280||wide.height!==720||tall.width!==720||tall.height!==1280)throw new Error("multi-ratio fixtures invalid");
console.log("e2e contract PASS");
