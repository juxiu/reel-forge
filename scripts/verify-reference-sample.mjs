import fs from "node:fs";
const sample=JSON.parse(fs.readFileSync("fixtures/reference-shot-blueprint.json","utf8"));
if(sample.shot_count!==44||sample.group_count!==8) throw new Error("reference sample blueprint must be 44 shots / 8 groups");
if(sample.qc?.rounds!==2) throw new Error("reference sample must model 2 QC rounds");
if(sample.shots.length!==44) throw new Error("reference sample shot count mismatch");
const seen=new Set();
for(const shot of sample.shots){
  if(seen.has(shot.shot_id)) throw new Error("duplicate shot "+shot.shot_id);
  seen.add(shot.shot_id);
  if(!/^G[1-8]$/.test(shot.group)) throw new Error("invalid sample group "+shot.group);
  if(shot.settle_frames<30) throw new Error("settle < 30 for "+shot.shot_id);
  if(!Array.isArray(shot.still_kinds)||shot.still_kinds.length!==6) throw new Error("six still kinds required for "+shot.shot_id);
}
console.log("reference sample PASS 44 shots / 8 groups / 2 QC rounds");
