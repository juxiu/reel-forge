import fs from "node:fs";
import {spawnSync} from "node:child_process";

const args=process.argv.slice(2);
if(!args.length || args.includes("--help")){
  console.log('Usage: npm run skill -- "TOPIC" --source URL [--source URL ...] [--duration 40] [--language en] [--ratio 16:9,9:16] [--auto-approve]');
  process.exit(args.includes("--help")?0:2);
}
const topic=args.find(a=>!a.startsWith("--"));
if(!topic) throw new Error("topic required");
const values=(flag)=>{const out=[];for(let i=0;i<args.length;i++)if(args[i]===flag&&args[i+1])out.push(args[++i]);return out};
const sources=values("--source");
if(!sources.length) throw new Error("--source is required for deterministic research");
const language=values("--language")[0]||"en";
const duration=Number(values("--duration")[0]||40);
const ratios=(values("--ratio")[0]||"16:9,9:16").split(",").filter(Boolean);
const auto=args.includes("--auto-approve")||process.env.AUTO_APPROVE==="1";
if(!Number.isFinite(duration)||duration<5) throw new Error("invalid duration");
const slug=topic.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"project";
const projectId="skill-"+slug;
const project={project_id:projectId,request:topic,language,target_ratios:ratios,source_urls:sources,duration_target_s:duration};
fs.mkdirSync("fixtures",{recursive:true});
fs.writeFileSync("fixtures/project.json",JSON.stringify(project,null,2));
const priorScript=fs.existsSync("fixtures/script.json")?fs.readFileSync("fixtures/script.json","utf8"):null;
if(priorScript) fs.renameSync("fixtures/script.json","fixtures/script.skill-backup.json");
const run=(cmd,args,env={})=>{const r=spawnSync(cmd,args,{stdio:"inherit",env:{...process.env,...env}});if(r.status!==0)process.exit(r.status??1)};
const env={PROJECT_FILE:"fixtures/project.json",PROJECT_ID:projectId,AUTO_APPROVE:auto?"1":(process.env.AUTO_APPROVE||"0")};
try {
  run("node",["scripts/run-production.mjs"],env);
  const generated=JSON.parse(fs.readFileSync("artifacts/"+projectId+"/script.json","utf8"));
  fs.mkdirSync("script",{recursive:true});
  fs.writeFileSync("script/narration.txt",generated.segments.map(s=>String(s.text||"").trim()).filter(Boolean).join("\n")+"\n");
  run("node",["scripts/tts_build.mjs"],env);
  run("python3",["scripts/render_storyboard.py"],env);
  run("python3",["scripts/selfcheck.py"],env);
  run("node",["scripts/materialize-ir.mjs"],env);
  run("node",["scripts/build-groups.mjs"],env);
  run("node",["scripts/materialize-shots.mjs"],env);
  run("node",["scripts/verify-shot-score.mjs"],env);
  run("node",["scripts/render-preview.mjs"],env);
  run("node",["scripts/pilot.mjs"],env);
  if(!auto) { console.log("SKILL STOP: pilot ready; approve pilot-preview or rerun with --auto-approve"); process.exit(0); }
  run("node",["scripts/checkpoint.mjs","pilot-preview","approved"],env);
  run("sh",["scripts/render.sh"],env);
  for(const ratio of ["16x9","9x16"]){
    run("python3",["scripts/frame_metrics.py","--frames","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--out","artifacts/"+projectId+"/qc/frame_metrics_"+ratio+".json"],env);
    run("python3",["scripts/motion_check.py","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--report","artifacts/"+projectId+"/qc/motion_"+ratio+".json"],env);
    run("python3",["scripts/visual_regression.py","--frames","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--out","artifacts/"+projectId+"/qc/visual_regression_"+ratio+".json"],env);
  }
  run("node",["scripts/verify-shot-score.mjs"],env);
  run("npm",["run","qc"],env);
  run("npm",["run","repair-cycle"],env);
  run("npm",["run","verify:qc"],env);
  run("npm",["run","deliver"],env);
  run("npm",["run","verify:delivery"],env);
  run("npm",["run","verify:production"],env);
  console.log("SKILL COMPLETE",projectId);
} finally {
  if(fs.existsSync("fixtures/script.skill-backup.json")) {
    fs.renameSync("fixtures/script.skill-backup.json","fixtures/script.json");
  }
}
