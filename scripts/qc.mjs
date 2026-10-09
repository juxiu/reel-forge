import fs from "node:fs";
import path from "node:path";
import {runMediaQc} from "../src/qc/run.mjs";
import {reportToIssues} from "../src/qc/flags.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {runNamedAgents} from "../src/agents/orchestrator.mjs";

const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const files=["artifacts/render/reel-forge-16x9.mp4","artifacts/render/reel-forge-9x16.mp4"];
const reports=[];
for(const file of files){
  if(!fs.existsSync(file)) reports.push({file,status:"FAIL",issues:[{node:"render",type:"missing_media"}]});
  else reports.push({file,...await runMediaQc(file)});
}
const issues=[];
// 低阶 flags（glow_missing / purple_debris / 轻微 hero_too_small）不阻断交付，但不能消失：
// qc.mjs 的 issues 数组一有东西就整体 FAIL，所以它们走 warnings，单独进报告正文。
const warnings=[];
const qcDir=path.join("artifacts",project.project_id,"qc");
// flags → issue 的翻译在 src/qc/flags.mjs（那边有独立测试）：这张表决定 Repair 往哪动手，
// 压在 qc.mjs 里就只能靠跑一次真实渲染才知道它错没错。
for(const ratio of ["16x9","9x16"]){
  const frameFile=path.join(qcDir,"frame_metrics_"+ratio+".json");
  const motionFile=path.join(qcDir,"motion_"+ratio+".json");
  const visualFile=path.join(qcDir,"visual_regression_"+ratio+".json");
  for(const [file,source] of [[frameFile,"frame_metrics"],[motionFile,"motion"]]){
    if(!fs.existsSync(file))continue;
    const split=reportToIssues(JSON.parse(fs.readFileSync(file,"utf8")),ratio,source);
    issues.push(...split.issues);
    warnings.push(...split.warnings);
  }
  // visual regression 降级为非阻断回归信号（参考资产为 64x36 合成图，embedding 非语义模型）。
  if(!fs.existsSync(visualFile)) issues.push({node:"visual-record-"+ratio,type:"visual_record_missing",ratio});
}
// 画面文字出处门（阻断）：a2e 硬性原则 2「事实有出处」。
const provenanceFile=path.join(qcDir,"text_provenance.json");
if(!fs.existsSync(provenanceFile)) issues.push({node:"text-provenance",type:"text_provenance_missing"});
else{
  const provenance=JSON.parse(fs.readFileSync(provenanceFile,"utf8"));
  if(provenance.status!=="PASS") for(const detail of (provenance.issues||[]).slice(0,20)) issues.push({node:"text-provenance",type:"text_not_traceable",detail});
}
// 分镜合规（渲染前）：buildPlan 的 issues 由 scripts/plan-audit.mjs 落成 plan_audit.json。
// 这一步的意义很具体：以前「主角位塞的是整句解说词」这类问题在 buildPlan 返回值里生成完就被丢掉，
// QC 只看像素，于是它要等到渲染完看截图才被发现 —— 白烧一遍渲染，而且 Repair 的应对是
// hero_scale += 0.12（把长句放得更大更挤），方向完全相反。
const planFile=path.join(qcDir,"plan_audit.json");
let planAudit={status:"MISSING",scenes:0,blocking_count:0,auto_fixable:0,needs_source:0};
if(!fs.existsSync(planFile)) issues.push({node:"plan-audit",type:"plan_audit_missing"});
else{
  const audit=JSON.parse(fs.readFileSync(planFile,"utf8"));
  const blocking=audit.blocking||[];
  planAudit={status:audit.status,scenes:audit.scene_count??0,blocking_count:blocking.length,
    auto_fixable:blocking.filter(item=>item.auto).length,needs_source:blocking.filter(item=>!item.auto).length};
  for(const item of blocking) issues.push({node:item.node,type:item.type,ratio:item.ratio,fix:item.fix,auto:item.auto,detail:item.detail});
}
// 媒体探针的 issue 必须用 repairRenderIR 查得到的节点名，并带上 ratio：
// 之前这里是 "layout-wide"/"layout-tall"，而引擎查的是 "layout-"+ratio（"layout-16x9"），
// 于是探针报的问题既进不了修复（byNode 查不到 → 静默丢），也进不了 qc-agent 的输入（i.ratio===ratio 永假）。
for(const report of reports){
  const ratio=report.file.includes("9x16")?"9x16":"16x9";
  for(const issue of report.issues||[]) issues.push({
    node:issue.node||("layout-"+ratio),type:issue.type,ratio,file:report.file
  });
}

const agent=createAgentProvider();
// 图像通道：npm run contact-sheet 写出的媒体索引（每镜计划帧 → 盘上真实存在的 PNG）。
// 有它就把路径随 payload 发出去，让有视觉能力的 provider 真能去看；没有就如实标 NO-INDEX，
// 而不是假装 agent "看过画面"（agent-protocol §2 第 3 条记录的就是这件事）。
const mediaIndex=fs.existsSync(path.join(qcDir,"media_index.json"))?JSON.parse(fs.readFileSync(path.join(qcDir,"media_index.json"),"utf8")):{status:"NO-INDEX",hint:"先跑 npm run contact-sheet（它读 still-manifest.json 并核对盘上 PNG）"};
const reviews=await runNamedAgents(agent,["16x9","9x16"].map(ratio=>({
  role:"qc-agent",
  input:{project,ratio,issues:issues.filter(i=>i.ratio===ratio),warnings:warnings.filter(w=>w.ratio===ratio),reports:reports.filter(r=>r.file.includes(ratio)),media:mediaIndex}
})),{concurrency:2,strict:process.env.AGENT_STRICT==="1"});

const result={
  project_id:project.project_id,status:issues.length?"FAIL":"PASS",issues,warnings,
  media:reports.map(report=>({file:report.file,status:report.status,motion_frames:report.motion_frames,black_segments:report.black_segments,duration:report.probe?.format?.duration||0})),
  agent_reviews:reviews,
  plan_audit:planAudit,
  visual_regression:["16x9","9x16"].map(ratio=>{
    const file=path.join(qcDir,"visual_regression_"+ratio+".json");
    if(!fs.existsSync(file)) return {ratio,status:"MISSING"};
    const report=JSON.parse(fs.readFileSync(file,"utf8"));
    return {ratio,gate:report.gate||"advisory",status:report.status,scenes:(report.scenes||[]).map(scene=>({
      scene:scene.scene,reference_similarity:scene.reference_similarity,delta_vs_previous:scene.reference_similarity_delta??null,anti_similarity:scene.anti_similarity,quality_band:scene.quality_band
    }))};
  }),
  text_provenance:(()=>{
    const file=path.join(qcDir,"text_provenance.json");
    if(!fs.existsSync(file)) return {status:"MISSING"};
    const report=JSON.parse(fs.readFileSync(file,"utf8"));
    return {status:report.status,ir_text_elements:report.ir_text_elements,rendered_texts:report.rendered_texts,unsourced:(report.unsourced_rendered_text||[]).length,registered_literals:report.registered_literals,discovered_literals:report.discovered_literals,issues:(report.issues||[]).length};
  })(),
  generated_at:new Date().toISOString()
};
fs.mkdirSync(qcDir,{recursive:true});
fs.writeFileSync(path.join(qcDir,"report.json"),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(qcDir,"report.md"),
  "# QC 报告\n\n状态："+result.status+"\n\n"+
  result.media.map(item=>"- "+item.file+"：duration="+item.duration+"s / motion="+item.motion_frames+" / black="+item.black_segments).join("\n")+
  "\n\n## Agent QC\n"+reviews.map(item=>"- "+item.role+"："+item.status).join("\n")+
  "\n\n## 画面文字出处（阻断）\n- 状态："+result.text_provenance.status+" / IR 文案="+result.text_provenance.ir_text_elements+" / 真上画面的文字="+result.text_provenance.rendered_texts+"（其中无出处、暂只出声="+result.text_provenance.unsourced+"）/ 登记字面量="+result.text_provenance.registered_literals+"（源码扫到="+result.text_provenance.discovered_literals+"）"+
  "\n\n## 分镜合规（渲染前，buildPlan.issues）\n- 状态："+planAudit.status+" / 审计镜头="+planAudit.scenes+" / 阻断="+planAudit.blocking_count+"（IR 可自修="+planAudit.auto_fixable+"，必须改分镜或文案="+planAudit.needs_source+"）"+
  "\n\n## Visual Regression（非阻断回归信号）\n"+result.visual_regression.map(item=>"- "+item.ratio+"："+item.status+" / gate="+item.gate+(item.scenes?" / scenes="+item.scenes.length:"")).join("\n")+
  "\n\n## 问题\n"+(issues.length?issues.map(issue=>"- "+issue.node+" / "+issue.type+" / "+(issue.ratio||"media")
    +(issue.severity?" / "+issue.severity:"")
    +(issue.classification?" / 分类="+issue.classification:"")
    +(issue.detail?" / "+issue.detail:"")
    +(issue.repair_hint?" → "+issue.repair_hint:"")).join("\n"):"- 无")+
  "\n\n## 警告（不阻断，但会累积成画面问题）\n"+(warnings.length?warnings.map(issue=>"- "+issue.node+" / "+issue.type+" / "+issue.ratio+" / "+(issue.detail||"")
    +(issue.repair_hint?" → "+issue.repair_hint:"")).join("\n"):"- 无")+"\n"
);
console.log("QC",result.status,"agents="+reviews.filter(x=>x.status==="completed").length,"issues="+issues.length,"warnings="+warnings.length);
if(result.status!=="PASS") process.exit(1);
