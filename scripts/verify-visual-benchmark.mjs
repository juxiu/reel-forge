import fs from "node:fs";
const manifest=JSON.parse(fs.readFileSync("fixtures/visual-benchmark.json","utf8"));
if(manifest.embedding!=="visual-pixel-v1") throw new Error("unexpected visual embedding provider");
if(!(manifest.thresholds?.pass>0 && manifest.thresholds?.pass<1)) throw new Error("invalid visual pass threshold");
const all=[...(manifest.positives||[]),...(manifest.anti||[])];
if(new Set(all.map(x=>x.id)).size!==all.length) throw new Error("duplicate visual reference id");
if(!manifest.anti?.length) throw new Error("anti-reference set is empty");
for(const item of all){
  if(!item.image || !fs.existsSync(item.image) || !fs.statSync(item.image).size) throw new Error("visual reference missing: "+item.id);
}
const ppm=fs.readFileSync(manifest.positives[0].image,"utf8");
if(!ppm.startsWith("P3")) throw new Error("visual references must be readable PPM assets");
console.log("visual benchmark PASS",JSON.stringify({positives:manifest.positives.length,anti:manifest.anti.length,embedding:manifest.embedding}));
