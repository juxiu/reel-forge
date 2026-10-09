import fs from "node:fs";
import {run as spawn} from "../src/runtime/spawn.mjs";
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
  // 走 lib/spawn：Windows 上 npx/npm/python3 这些名字要么解析不到、要么解析到不可执行的
  // sh 脚本，直接 spawnSync 会得到 status=null，再被 `?? 1` 说成「命令失败」，
  // 整条生产链就变成「看不出错的黑盒重跑」。这里把「找不到命令」和「命令返回非 0」分开报。
  const r=spawn(cmd,args,{stdio:"inherit",env:{...process.env,...env}});
  if(r.error) throw new Error(cmd+" 无法启动（"+r.error+"）；参数: "+args.join(" "));
  if(r.status!==0) throw new Error(cmd+" "+args.join(" ")+" failed with status "+(r.status??"signal "+r.signal));
}
// 审计类步骤专用：只要「跑过」，不看退出码，结论由它写出的 JSON 交给后面的门去读。
// 和 run() 分成两个函数，是为了让「命令起不来」在日志里留下痕迹而不是把整条链掐断。
function runSoft(cmd,args=[],env={}){
  const r=spawn(cmd,args,{stdio:"inherit",env:{...process.env,...env}});
  if(r.error) console.warn("SKILL WARN: "+cmd+" 无法启动（"+r.error+"），依赖其产物的门禁会按缺件处理");
  else if(r.status!==0) console.log("SKILL NOTE: "+cmd+" "+args.join(" ")+" 退出码 "+(r.status??"signal "+r.signal)+"（审计类步骤不看退出码，看它写出的 JSON）");
  return r;
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

// ⚠ 必须是函数而不是裸 try 块：模块顶层的 `try { … return; … }` 是**语法错误**
//    （Illegal return statement），而这份文件此前正是这么写的 —— 也就是说
//    `npm run skill` 这个「一键入口」从来没启动过，node 在解析阶段就退出。
//    checkpoint 暂停语义（停在确认点、保留 workspace、等 --resume）只有包进函数才成立。
function pipeline(){
  fs.mkdirSync("fixtures",{recursive:true});
  if(!resume) fs.writeFileSync("fixtures/project.json",JSON.stringify(requestedProject,null,2));
  if(!fs.existsSync("fixtures/project.json")) throw new Error("resume requires preserved fixtures/project.json");
  const active=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
  if(active.project_id!==projectId) throw new Error("project_id mismatch");

  initCheckpoints(projectId,"artifacts");
  if(!ensureCheckpoint("length-language",{topic,language,ratios,duration})) return;

  const root="artifacts/"+projectId;
  if(!fs.existsSync(root+"/script.json")){run("node",["scripts/verify-instruction-filter.mjs"],env);run("node",["scripts/run-production.mjs"],env);} // 过滤门排在生产之前：注入句子一旦进了 research.json 就成了下游所有环节的"事实"（agent-protocol §6）。resume 时 research.json 已在盘上，形状由 verify:contracts 兜。
  const generated=JSON.parse(fs.readFileSync(root+"/script.json","utf8"));
  fs.writeFileSync("fixtures/script.json",JSON.stringify(generated,null,2));
  fs.mkdirSync("script",{recursive:true});
  fs.writeFileSync("script/narration.txt",generated.segments.map(s=>String(s.text||"").trim()).filter(Boolean).join("\n")+"\n");
  fs.writeFileSync("script/storyboard_src.md",["# 分镜源表（骨架由 scripts/skill.mjs 生成）","","帧号令牌由 npm run storyboard（scripts/render_storyboard.py）换成真实帧号；标着「待填」的三列必须人/agent 填，selfcheck 只认「continuous:」「hold:」这两个**标签存在**与 hold 的帧数，不认内容 —— 画面到底有没有持续动作只能看片。","","# 白名单（写了镜头号才允许该镜头用对应效果；留空=一律不许，selfcheck 会按 0 次判）","闪烁白名单：","扫光白名单：","","# 分镜表","| SC | 起–止 | 节拍 | 画面 | 动效 |","| --- | --- | --- | --- | --- |"].concat(generated.segments.map((s,i)=>{const k=String(i+1).padStart(2,"0");return "| SC"+k+" | {S"+k+".from}–{S"+k+".to} | "+(String(s.text||"").trim().slice(0,24)||"待填")+" | 待填：主体 / 构图 / 字号档位 | continuous: 待填（本镜全程在动的东西）; hold: 36f |";})).join("\n")+"\n");
  if(!ensureCheckpoint("narration-signoff",{message:"Research 与 narration 已生成"})) return;

  if(!fs.existsSync("script/timeline.json")||!fs.existsSync("public/audio.mp3")) run("node",["scripts/tts_build.mjs"],env);
  if(!ensureCheckpoint("voiceover",{message:"voiceover 与 native-TTS 时间轴已生成"})) return;

  // 配音收口：以 tts-word-boundary 为唯一时间轴口径，产出二次校验件。
  // deliver / verify:production 都硬性要求它，缺了这一步交付门必然失败。
  if(!fs.existsSync(root+"/audio/asr-second-pass.json")) run("node",["scripts/asr_second_pass.mjs"],env);
  run("node",["scripts/verify-asr.mjs"],env);

  run("python3",["scripts/render_storyboard.py"],env);
  run("python3",["scripts/selfcheck.py"],env);
  run("node",["scripts/materialize-ir.mjs"],env);
  run("node",["scripts/build-groups.mjs"],env);
  run("node",["scripts/materialize-shots.mjs"],env);
  run("node",["scripts/verify-shot-score.mjs"],env);
  run("node",["scripts/verify-shots.mjs"],env);
  // authored 合规必须**在渲染之前**停：它只读 44 个 .jsx 文本与蓝图，秒级。
  // 以前它只在 PR 的 workflow 里跑，一键链能一路跑到交付而没人判过镜头字段是否与蓝图一致。
  run("node",["scripts/verify-authored-shots.mjs"],env);
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
  run("node",["scripts/contact-sheet.mjs"],env); // 渲染后、qc 之前：把计划帧与盘上真图对账成 media_index + contact_sheet，qc-agent 的 payload 才有图像通道（没有它 qc.mjs 只能带 NO-INDEX）
  run("node",["scripts/verify-shot-score.mjs"],env);
  run("npm",["run","verify:text-provenance"],env);
  run("node",["scripts/verify-footage.mjs"],env);
  run("node",["scripts/verify-reference-sample.mjs"],env);
  run("node",["scripts/verify-tts-parity.mjs"],env);
  run("node",["scripts/verify-still-benchmark.mjs"],env);
  run("node",["scripts/verify-visual-regression.mjs"],env);
  // 顺序坑：qc.mjs 在 artifacts/<pid>/qc/plan_audit.json 不存在时，直接把 plan_audit_missing
  // 记成**阻断** issue，而 run("npm",["run","qc"]) 是抛错型的 —— 于是「分镜合规审计从没跑过」
  // 会在一键链这里硬中断，报出来的是「qc 失败」，而不是可修的「审计缺失」。
  // repair-cycle.mjs 里同一件事一直是软跑的（它本来就不看审计退出码），这里补齐同一个顺序：
  // 先落 plan_audit.json，再进 qc；审计自己非零（分镜矛盾）不该终止生产链，
  // 因为后面 npm run repair-cycle 正是用来消化它的。verify-skill 有断言盯这条顺序，见 §门禁归属。
  runSoft("node",["scripts/plan-audit.mjs"],env);
  run("npm",["run","qc"],env);
  run("npm",["run","repair-cycle"],env);
  run("npm",["run","verify:qc"],env);
  run("npm",["run","deliver"],env);
  run("npm",["run","verify:delivery"],env);
  run("npm",["run","verify:production"],env);
  console.log("SKILL COMPLETE",projectId);
}

// 无论正常结束、停在确认点还是抛错，都要把 demo fixture 还原回去（除非明确要求保留工作区）。
try{
  pipeline();
}finally{
  if(!preserveWorkspace) for(const [file,backup] of backups) if(fs.existsSync(backup)){fs.copyFileSync(backup,file);fs.rmSync(backup);}
}
