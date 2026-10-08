import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const run = spawnSync(process.execPath,["scripts/run-p2.mjs"],{encoding:"utf8"});
if (run.status !== 0) { process.stderr.write(run.stderr || run.stdout); process.exit(run.status || 1); }

const dir = path.join(process.cwd(),"artifacts","demo-semantic-search");
const sceneDoc = JSON.parse(fs.readFileSync(path.join(dir,"scene.json"),"utf8"));
const scenes = sceneDoc.scenes;

function validate(list) {
  const errors=[];
  let previousEnd=0;
  for(const s of list){
    if (!s.scene_id || !s.narration?.text || !s.visual?.type) errors.push("missing required fields");
    if (!(s.duration>0)) errors.push(`${s.scene_id}: invalid duration`);
    if (s.start < previousEnd) errors.push(`${s.scene_id}: timeline overlap`);
    previousEnd = s.start + s.duration;
  }
  if (!list.length) errors.push("no scenes produced");
  return errors;
}

const errors = validate(scenes);
if (errors.length) { console.error(JSON.stringify({stage:"P2",status:"FAIL",errors},null,2)); process.exit(1); }

// Regression: an overlapping scene must be rejected.
const bad = scenes.map(s=>({...s}));
if (bad.length > 1) bad[1] = {...bad[1], start: bad[0].start + bad[0].duration - 0.5};
const negative = validate(bad);
if (!negative.some(e=>e.includes("timeline overlap"))) {
  throw new Error("negative timeline regression did not detect overlap");
}

console.log(JSON.stringify({stage:"P2",status:"PASS",outputs:["director.json","storyboard.json","scene.json"],scene_count:scenes.length,negative_regression:"PASS"},null,2));
