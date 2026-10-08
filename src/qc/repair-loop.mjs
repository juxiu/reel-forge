export function buildRepairPlan(report,{maxRetries=2}={}){const byNode=new Map();for(const issue of report.issues||[]){if(!byNode.has(issue.node))byNode.set(issue.node,[]);byNode.get(issue.node).push(issue);}return{maxRetries,nodes:[...byNode].map(([node,issues])=>({node,issues,retries:0,status:"pending"}))};}
export async function repairLoop({report,load,save,repairAgent,maxRetries=2}){
  const plan=buildRepairPlan(report,{maxRetries});
  for(const item of plan.nodes){
    if(!repairAgent)throw new Error("repair agent not configured for "+item.node);
    let artifact=await load(item.node);
    for(item.retries=0;item.retries<maxRetries;item.retries++){
      artifact=await repairAgent({node:item.node,issues:item.issues,artifact});
      await save(item.node,artifact);
      item.status="repaired";
      break;
    }
    if(item.status!=="repaired"){item.status="blocked";return plan;}
  }
  return plan;
}