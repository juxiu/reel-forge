import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {maxShotsPerGroup} from "../src/build/limits.mjs";
import {checkShotSourceIdentity,shotSourceMarker,sourceIdentityForScene} from "../src/shots/source-identity.mjs";

const project=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
const script=JSON.parse(fs.readFileSync("fixtures/script.json","utf8"));
const ir=JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json","utf8"));
const maxPerGroup=maxShotsPerGroup();
if(script.project_id!==project.project_id||ir.project_id!==project.project_id) throw new Error("shot source gate: project/script/IR identity mismatch");
if(!Array.isArray(ir.scenes)||ir.scenes.length!==script.segments.length) throw new Error("shot source gate: scene count must match script segment count");
for(let i=0;i<ir.scenes.length;i++){
  const scene=ir.scenes[i],group="G"+(Math.floor(i/maxPerGroup)+1),shot="SC"+String(i+1).padStart(2,"0")+".jsx";
  const file=path.join("src","shots",group,shot),expected=sourceIdentityForScene(project,script,scene);
  if(!fs.existsSync(file)) throw new Error("shot source missing: "+file);
  const check=checkShotSourceIdentity(fs.readFileSync(file,"utf8"),expected);
  if(!check.ok) throw new Error("shot source is stale or belongs to another narration: "+file+" ("+check.reason+"; expected "+JSON.stringify(expected)+")");
}
const sample=sourceIdentityForScene(project,script,ir.scenes[0]),good=shotSourceMarker(sample)+"\nexport const TEST=true;\n";
assert.equal(checkShotSourceIdentity(good,sample).ok,true);
assert.equal(checkShotSourceIdentity(good,{...sample,project_id:sample.project_id+"-other"}).ok,false);
assert.equal(checkShotSourceIdentity(good,{...sample,script_sha256:"0".repeat(64)}).ok,false);
assert.equal(checkShotSourceIdentity("export const TEST=true;",sample).ok,false);
console.log("shot source identity PASS",JSON.stringify({project_id:project.project_id,scenes:ir.scenes.length,negative_cases:3}));
