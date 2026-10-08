import{spawnSync}from"node:child_process";
const max=Number(process.env.REPAIR_RETRIES||2);
if(!Number.isInteger(max)||max<1)throw new Error("REPAIR_RETRIES must be positive");
const run=(cmd,args=[])=>{const r=spawnSync(cmd,args,{stdio:"inherit"});return r.status??1};
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
  if(attempt===max)break;
  if(run("npm",["run","repair"])!==0)break;
  if(run("npm",["run","materialize-ir"])!==0)break;
  if(run("npm",["run","render"])!==0)break;
}
console.error("repair-cycle FAIL",JSON.stringify({maxRetries:max}));
process.exit(1);