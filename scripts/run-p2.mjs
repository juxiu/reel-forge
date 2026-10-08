import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

spawnSync(process.execPath,["scripts/run-p1.mjs"],{stdio:"inherit"});
const root = process.cwd();
const dir = path.join(root,"artifacts","demo-semantic-search");
const script = JSON.parse(fs.readFileSync(path.join(dir,"script.json"),"utf8"));

const sceneDuration = 3;
const scenes = script.segments.map((seg, i) => ({
  scene_id: `scene-${String(i+1).padStart(3,"0")}`,
  start: i * sceneDuration,
  duration: sceneDuration,
  narration: {text: seg.text},
  visual: {
    type: i === 0 ? "exact-match" : "semantic-match",
    objects: [
      {id:"headline",type:"text",text:seg.text},
      {id:"concept",type:"card",label:i === 0 ? "关键词匹配" : "向量相似度"}
    ]
  },
  motion: [{type:"enter",target:"headline",preset:"fade-up"}],
  caption: {mode:"sentence"}
}));

const director = {
  project_id: script.project_id,
  visual_strategy:"conceptual-explainer",
  pacing:"medium",
  scenes: scenes.map((s,i)=>({scene_id:s.scene_id,purpose:i===0?"set-up":"explain"}))
};
const storyboard = {project_id:script.project_id, shots:scenes.map(s=>({
  scene_id:s.scene_id,
  purpose: director.scenes.find(x=>x.scene_id===s.scene_id).purpose,
  start:s.start,
  duration:s.duration,
  visual_type:s.visual.type
}))};

fs.writeFileSync(path.join(dir,"director.json"),JSON.stringify(director,null,2));
fs.writeFileSync(path.join(dir,"storyboard.json"),JSON.stringify(storyboard,null,2));
fs.writeFileSync(path.join(dir,"scene.json"),JSON.stringify({project_id:script.project_id,scenes},null,2));

console.log(JSON.stringify({stage:"P2",status:"PASS",outputs:["director.json","storyboard.json","scene.json"],dir},null,2));
