import fs from "node:fs";
import path from "node:path";
import {buildScenes} from "../src/build/parallel-scenes.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {runNamedAgent} from "../src/agents/orchestrator.mjs";
import {maxShotsPerGroup} from "../src/build/limits.mjs";

const ir=JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json","utf8"));
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const maxPerGroup=maxShotsPerGroup();
const concurrency=Number(process.env.BUILD_CONCURRENCY||4);
const agent=createAgentProvider();
const strict=process.env.AGENT_STRICT==="1";
const videoShotcraftDir=String(process.env.VIDEO_SHOTCRAFT_DIR||"").trim()?path.resolve(process.env.VIDEO_SHOTCRAFT_DIR):null;
const groups=[];
for(let i=0;i<ir.scenes.length;i+=maxPerGroup) groups.push({id:"G"+String(groups.length+1),scenes:ir.scenes.slice(i,i+maxPerGroup)});

const built=await buildScenes(groups,async(group)=>{
  const deterministic={
    id:group.id,
    scene_ids:group.scenes.map(scene=>scene.id),
    source:group.scenes.map(scene=>({scene_id:scene.id,from:Math.round(scene.start*ir.fps),to:Math.round((scene.start+scene.duration)*ir.fps),variant:scene.variant||"generic"})),
    status:"built"
  };
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
  return {...deterministic,agent:agentReview};
},{concurrency});

const outDir=path.join("artifacts",ir.project_id,"build-groups");
fs.mkdirSync(outDir,{recursive:true});
for(const group of built) fs.writeFileSync(path.join(outDir,group.id+".json"),JSON.stringify(group,null,2));
fs.writeFileSync("fixtures/build-groups.json",JSON.stringify({
  project_id:ir.project_id,
  concurrency,
  agent_mode:agent?"external-agent":"deterministic",
  groups:built.map(group=>({id:group.id,scene_ids:group.scene_ids,agent_status:group.agent.status}))
},null,2));
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify({
  project_id:ir.project_id,
  concurrency,
  agent_mode:agent?"external-agent":"deterministic",
  groups:built.map(group=>group.id),
  status:"built",
},null,2));
console.log("build groups PASS",built.length,"agent="+(agent?"external":"deterministic"));
