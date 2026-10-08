import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {initCheckpoints, readCheckpoints, requireCheckpoint, resolveCheckpoint} from "../src/runtime/checkpoints.mjs";
import {requestApproval} from "../src/runtime/approval.mjs";

const args=process.argv.slice(2);
if(!args.length||args.includes("--help")){
  console.log('Usage: npm run skill -- "TOPIC" --source URL [--source URL ...] [--duration 40] [--language en] [--ratio 16:9,9:16] [--auto-approve] [--resume]');
  process.exit(args.includes("--help")?0:2);
}
const topic=args.find(a=>!a.startsWith("--"));
if(!topic) throw new Error("topic required");
const values=flag=>{const out=[];for(let i=0;i<args.length;i++)if(args[i]===flag&&args[i+1])out.push(args[++i]);return out};
const sources=values("--source"),language=values("--language")[0]||"en",duration=Number(values("--duration")[0]||40);
const ratios=(values("--ratio")[0]||"16:9,9:16").split(",").filter(Boolean);
const auto=args.includes("--auto-approve")||process.env.AUTO_APPROVE==="1",resume=args.includes("--resume");
if(!Number.isFinite(duration)||duration<5) throw new Error("invalid duration");
if(!sources.length&&!resume) throw new Error("--source is required on first run");

const slug=topic.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"project";
const projectId="skill-"+slug;
const requestedProject={project_id:projectId,request:topic,language,target_ratios:ratios,source_urls:sources,duration_target_s:duration};
const backups=[];
let preserveWorkspace=false;
for(const file of ["fixtures/project.json","fixtures/script.json","fixtures/render-ir-16x9.json","fixtures/render-ir-9x16.json","fixtures/render-ir.json","fixtures/build-groups.json","fixtures/captions.json","script/narration.txt","script/storyboard_src.md"]){
  const backup=file+".skill-backup";
  if(fs.existsSync(file)&&!fs.existsSync(backup)) fs.copyFileSync(file,backup);
  if(fs.existsSync(backup)) backups.push([file,backup]);
}
function run(cmd,args=[],env={}){
  const r=spawnSync(cmd,args,{stdio:"inherit",env:{...process.env,...env}});
  if(r.status!==0) throw new Error(cmd+" failed with status "+(r.status??1));
}
function stop(stage,message){
  preserveWorkspace=true;
  console.log("SKILL STOP ["+stage+"]: "+message);
  console.log("批准后执行: npm run checkpoint -- "+stage+" approved");
  console.log("然后继续: npm run skill -- \""+topic.replaceAll('"','\\\"')+"\""+(sources[0]?" --source "+sources[0]:"")+" --resume");
  return false;
}
function ensureCheckpoint(stage,payload={}){
  initCheckpoints(projectId,"artifacts");
  const state=readCheckpoints(projectId,"artifacts");
  if(state.checkpoints[stage]?.status==="approved"){requireCheckpoint(projectId,stage,"artifacts");return true;}
  requestApproval(projectId,{stage,...payload},"artifacts");
  resolveCheckpoint(projectId,stage,"pending","artifacts");
  if(auto){resolveCheckpoint(projectId,stage,"approved","artifacts");return true;}
  return stop(stage,payload.message||"等待人工确认");
}
const env={PROJECT_FILE:"fixtures/project.json",PROJECT_ID:projectId,AUTO_APPROVE:auto?"1":(process.env.AUTO_APPROVE||"0")};

try{
  fs.mkdirSync("fixtures",{recursive:true});
  if(!resume) fs.writeFileSync("fixtures/project.json",JSON.stringify(requestedProject,null,2));
  if(!fs.existsSync("fixtures/project.json")) throw new Error("resume requires preserved fixtures/project.json");
  const active=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
  if(active.project_id!==projectId) throw new Error("project_id mismatch");

  initCheckpoints(projectId,"artifacts");
  if(!ensureCheckpoint("length-language",{topic,language,ratios,duration})) return;

  const root="artifacts/"+projectId;
  if(!fs.existsSync(root+"/script.json")) run("node",["scripts/run-production.mjs"],env);
  const generated=JSON.parse(fs.readFileSync(root+"/script.json","utf8"));
  fs.writeFileSync("fixtures/script.json",JSON.stringify(generated,null,2));
  fs.mkdirSync("script",{recursive:true});
  fs.writeFileSync("script/narration.txt",generated.segments.map(s=>String(s.text||"").trim()).filter(Boolean).join("\n")+"\n");
  fs.writeFileSync("script/storyboard_src.md",generated.segments.map((s,i)=>"## S"+String(i+1).padStart(2,"0")+"\n\n{S"+String(i+1).padStart(2,"0")+".from}–{S"+String(i+1).padStart(2,"0")+".to}\n").join("\n"));
  if(!ensureCheckpoint("narration-signoff",{message:"Research 与 narration 已生成"})) return;

  if(!fs.existsSync("script/timeline.json")||!fs.existsSync("public/audio.mp3")) run("node",["scripts/tts_build.mjs"],env);
  if(!ensureCheckpoint("voiceover",{message:"voiceover 与 native-TTS 时间轴已生成"})) return;

  run("python3",["scripts/render_storyboard.py"],env);
  run("python3",["scripts/selfcheck.py"],env);
  run("node",["scripts/materialize-ir.mjs"],env);
  run("node",["scripts/build-groups.mjs"],env);
  run("node",["scripts/materialize-shots.mjs"],env);
  run("node",["scripts/verify-shot-score.mjs"],env);
  run("node",["scripts/verify-shots.mjs"],env);
  run("node",["scripts/still-benchmark.mjs"],env);
  run("node",["scripts/verify-still-benchmark.mjs"],env);

  const pilot=readCheckpoints(projectId,"artifacts").checkpoints["pilot-preview"];
  if(pilot?.status!=="approved"){
    run("node",["scripts/render-preview.mjs"],env);
    run("node",["scripts/pilot.mjs"],env);
    if(!ensureCheckpoint("pilot-preview",{message:"Pilot preview 已生成，请确认前 30 秒风格/字号/语速/节奏"})) return;
  }else requireCheckpoint(projectId,"pilot-preview","artifacts");

  run("sh",["scripts/render.sh"],env);
  for(const ratio of ["16x9","9x16"]){
    run("python3",["scripts/frame_metrics.py","--frames","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--out","artifacts/"+projectId+"/qc/frame_metrics_"+ratio+".json"],env);
    run("python3",["scripts/motion_check.py","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--report","artifacts/"+projectId+"/qc/motion_"+ratio+".json"],env);
    run("python3",["scripts/visual_regression.py","--frames","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--out","artifacts/"+projectId+"/qc/visual_regression_"+ratio+".json"],env);
  }
  run("node",["scripts/verify-shot-score.mjs"],env);
  run("node",["scripts/verify-footage.mjs"],env);
  run("node",["scripts/verify-reference-sample.mjs"],env);
  run("node",["scripts/verify-tts-parity.mjs"],env);
  run("node",["scripts/verify-still-benchmark.mjs"],env);
  run("npm",["run","qc"],env);
  run("npm",["run","repair-cycle"],env);
  run("npm",["run","verify:qc"],env);
  run("npm",["run","deliver"],env);
  run("npm",["run","verify:delivery"],env);
  run("npm",["run","verify:production"],env);
  console.log("SKILL COMPLETE",projectId);
}finally{
  if(!preserveWorkspace) for(const [file,backup] of backups) if(fs.existsSync(backup)){fs.copyFileSync(backup,file);fs.rmSync(backup);}
}
