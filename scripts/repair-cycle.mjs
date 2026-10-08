import fs from "node:fs";
import {spawnSync} from "node:child_process";

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const max = Number(process.env.REPAIR_RETRIES || 2);
if (!Number.isInteger(max) || max < 1) throw new Error("REPAIR_RETRIES must be positive");

const run=(cmd,args=[])=>{const r=spawnSync(cmd,args,{stdio:"inherit",env:{...process.env,PROJECT_FILE:process.env.PROJECT_FILE || "fixtures/project.json"}});return r.status??1};
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
  return true;
}

for(let attempt=1;attempt<=max;attempt++){
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
  if(run("npm",["run","repair"])!==0) break;
  if(run("npm",["run","render"])!==0) break;
  if(!refreshQualityReports()) break;
}

console.error("repair-cycle FAIL",JSON.stringify({maxRetries:max}));
process.exit(1);
