import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const run = spawnSync(process.execPath,["scripts/run-p2.mjs"],{encoding:"utf8"});
if (run.status !== 0) { process.stderr.write(run.stderr || run.stdout); process.exit(run.status || 1); }

const dir = path.join(process.cwd(),"artifacts","demo-semantic-search");
const sceneDoc = JSON.parse(fs.readFileSync(path.join(dir,"scene.json"),"utf8"));
const scenes = sceneDoc.scenes;
const errors=[];
let previousEnd=0;
for(const s of scenes){
  if (!s.scene_id || !s.narration?.text || !s.visual?.type) errors.push(`${s.scene_id||"unknown"}: missing required fields`);
  if (!(s.duration>0)) errors.push(`${s.scene_id}: invalid duration`);
  if (s.start < previousEnd) errors.push(`${s.scene_id}: timeline overlap`);
  previousEnd = s.start + s.duration;
}
if (!scenes.length) errors.push("no scenes produced");
if (errors.length) { console.error(JSON.stringify({stage:"P2",status:"FAIL",errors},null,2)); process.exit(1); }
console.log(JSON.stringify({stage:"P2",status:"PASS",outputs:["director.json","storyboard.json","scene.json"],scene_count:scenes.length},null,2));
