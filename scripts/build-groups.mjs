import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {buildScenes} from "../src/build/parallel-scenes.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {runNamedAgent} from "../src/agents/orchestrator.mjs";
import {maxShotsPerGroup} from "../src/build/limits.mjs";
import {checkShotSourceIdentity,sourceIdentityForScene} from "../src/shots/source-identity.mjs";

const ir=JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json","utf8"));
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const script=JSON.parse(fs.readFileSync("fixtures/script.json","utf8"));
if(ir.project_id!==project.project_id||script.project_id!==project.project_id) throw new Error("build blocked: project/script/IR identity mismatch");
const maxPerGroup=maxShotsPerGroup();
const concurrency=Number(process.env.BUILD_CONCURRENCY||4);
const agent=createAgentProvider();
const strict=process.env.AGENT_STRICT==="1";
const videoShotcraftDir=String(process.env.VIDEO_SHOTCRAFT_DIR||"").trim()?path.resolve(process.env.VIDEO_SHOTCRAFT_DIR):null;
const groups=[];
for(let i=0;i<ir.scenes.length;i+=maxPerGroup) groups.push({id:"G"+String(groups.length+1),scenes:ir.scenes.slice(i,i+maxPerGroup)});
const shotFileForScene=scene=>{const index=ir.scenes.findIndex(item=>item.id===scene.id);if(index<0)throw new Error("scene missing from active IR: "+scene.id);return path.join("src/shots","G"+String(Math.floor(index/maxPerGroup)+1),"SC"+String(index+1).padStart(2,"0")+".jsx");};
const hashFile=file=>fs.existsSync(file)?crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"):null;

const built=await buildScenes(groups,async(group)=>{
  const deterministic={
    id:group.id,
    scene_ids:group.scenes.map(scene=>scene.id),
    source:group.scenes.map(scene=>({scene_id:scene.id,from:Math.round(scene.start*ir.fps),to:Math.round((scene.start+scene.duration)*ir.fps),variant:scene.variant||"generic",source_identity:sourceIdentityForScene(project,script,scene)})),
    status:"planned"
  };
  const before_sources=group.scenes.map(scene=>({scene_id:scene.id,path:shotFileForScene(scene),sha256:hashFile(shotFileForScene(scene))}));
  const agentReview=await runNamedAgent(agent,"build-agent",{
    project,
    group:{id:group.id,scene_ids:deterministic.scene_ids},
    videoShotcraftDir,
    constraints:{
      only_paths:["src/shots/"+group.id+"/**"],
      six_stills_per_shot:true,
      test_render_frames:30,
      semantic_renderer_required:true,
      settle_frames_min:30,
    },
    shots:deterministic.source,
  },{strict});
  return {...deterministic,before_sources,agent:agentReview};
},{concurrency});

// An Agent call or skipped-provider envelope is not evidence that a shot was built.
const sourceBoundGroups=built.map(group=>{
  const planned=groups.find(item=>item.id===group.id);
  let changed=0;
  for(const scene of planned.scenes){
    const file=shotFileForScene(scene);
    if(!fs.existsSync(file)) throw new Error("BUILD BLOCKED: authored shot source missing: "+file+"; no deterministic scene generator exists");
    const expected=sourceIdentityForScene(project,script,scene);
    const checked=checkShotSourceIdentity(fs.readFileSync(file,"utf8"),expected);
    if(!checked.ok) throw new Error("BUILD BLOCKED: stale/foreign shot source "+file+"; agent_status="+group.agent.status+"; expected="+JSON.stringify(expected)+"; actual="+JSON.stringify(checked.actual)+"; re-author/rebind before rendering");
    const before=group.before_sources.find(item=>item.scene_id===scene.id);
    if(!before||before.sha256!==hashFile(file)) changed++;
  }
  const {before_sources,...rest}=group;
  return {...rest,source_status:"bound-to-script",changed_shots:changed,status:changed?"updated":"reused"};
});

const outDir=path.join("artifacts",ir.project_id,"build-groups");
fs.mkdirSync(outDir,{recursive:true});
for(const group of sourceBoundGroups) fs.writeFileSync(path.join(outDir,group.id+".json"),JSON.stringify(group,null,2));
fs.writeFileSync("fixtures/build-groups.json",JSON.stringify({
  project_id:ir.project_id,
  concurrency,
  agent_mode:agent?"external-agent":"existing-authored-source-reuse",
  groups:sourceBoundGroups.map(group=>({id:group.id,scene_ids:group.scene_ids,agent_status:group.agent.status,source_status:group.source_status,status:group.status,changed_shots:group.changed_shots}))
},null,2));
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify({
  project_id:ir.project_id,
  concurrency,
  agent_mode:agent?"external-agent":"existing-authored-source-reuse",
  groups:sourceBoundGroups.map(group=>group.id),
  status:"source-bound",
},null,2));
console.log("build groups source-bound",sourceBoundGroups.length,"agent="+(agent?"external":"existing-source-reuse"),"changed_shots="+sourceBoundGroups.reduce((n,g)=>n+g.changed_shots,0));
