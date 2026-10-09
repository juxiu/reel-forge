import fs from "node:fs";
import {run as spawn} from "../src/runtime/spawn.mjs";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const max = Number(process.env.REPAIR_RETRIES || 2);
if (!Number.isInteger(max) || max < 1) throw new Error("REPAIR_RETRIES must be positive");

// 同上：status=null（命令没找到 / 被信号杀掉）不能当成「退出码 1」继续走修复循环，
// 否则 Repair 会对着同一份坏状态空转 N 轮，最后报「修复未收敛」。
const run=(cmd,args=[])=>{const r=spawn(cmd,args,{stdio:"inherit",env:{...process.env,PROJECT_FILE:process.env.PROJECT_FILE || "fixtures/project.json"}});if(r.error){console.error(cmd+" 无法启动: "+r.error);return 127}return r.status??1};
const projectId=project.project_id;

function refreshQualityReports(){
  for(const ratio of ["16x9","9x16"]){
    const frameOut="artifacts/"+projectId+"/qc/frame_metrics_"+ratio+".json";
    const motionOut="artifacts/"+projectId+"/qc/motion_"+ratio+".json";
    const visualOut="artifacts/"+projectId+"/qc/visual_regression_"+ratio+".json";
    if(run("npm",["run","frame-metrics","--","--frames","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--out",frameOut])!==0) return false;
    if(run("npm",["run","motion-check","--","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--report",motionOut])!==0) return false;
    if(run("npm",["run","visual-regression","--","--frames","artifacts/frames/"+ratio,"--render-ir","fixtures/render-ir-"+ratio+".json","--out",visualOut])!==0) return false;
  }
  if(run("npm",["run","verify:text-provenance"],{...process.env,PROJECT_FILE:process.env.PROJECT_FILE||"fixtures/project.json"})!==0) return false;
  return true;
}

const repairStatus=()=>{
  try{return JSON.parse(fs.readFileSync("artifacts/"+projectId+"/repair/status.json","utf8"))}catch{return null}
};

for(let attempt=1;attempt<=max;attempt++){
  // 渲染前先过一遍分镜合规：plan-audit 把 buildPlan 的违规落成 plan_audit.json，QC 读它才终于
  // 有「这一镜在现有分镜数据下做不到合规画面」这个声音。退出码不看 —— 有问题看 JSON，
  // 不用进程码去猜，否则「审计没跑成」和「审计报了 6 条」在循环里长得一模一样。
  run("npm",["run","plan-audit"]);
  const qc=run("npm",["run","qc"]);
  if(qc===0){
    if(run("npm",["run","repair"])!==0){
      console.error("repair-cycle FAIL: could not write no-op repair audit");
      process.exit(1);
    }
    console.log("repair-cycle PASS",JSON.stringify({attempts:attempt,status:"PASS",repair_audit:"not-needed"}));
    process.exit(0);
  }
  if(attempt===max) break;
  if(run("npm",["run","repair"])!==0){
    const st=repairStatus();
    // 分镜层的问题不在 render-IR 里（长句要另写文案、f0 写在镜头源文件里）。
    // 这种时候重渲染是纯烧时间：画面一个像素都不会变，QC 会把同样的问题再报一遍。
    if(st?.status==="escalated"||st?.status==="noop"){
      console.error("repair-cycle STOP: 本轮没有任何影响画面的 IR 改动，不该重渲染");
      for(const item of st.escalations||[]) console.error("  - "+item.node+" / "+item.type+" → "+(item.fix||"manual-review"));
      process.exit(1);
    }
    break;
  }
  const st=repairStatus();
  if(st&&!(st.changed_nodes||[]).length){
    console.error("repair-cycle STOP: repair 只写了留痕，画面不会变化，退回分镜再渲");
    process.exit(1);
  }
  if(run("npm",["run","render"])!==0) break;
  if(!refreshQualityReports()) break;
}

console.error("repair-cycle FAIL",JSON.stringify({maxRetries:max}));
process.exit(1);
