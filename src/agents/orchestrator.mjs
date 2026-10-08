import {runParallel} from "../scheduler/pool.mjs";

function resultEnvelope(role, output, status="completed") {
  return {
    role,
    status,
    output,
    completed_at:new Date().toISOString(),
  };
}

export async function runNamedAgent(agent, role, input, {strict=false}={}) {
  if(!agent){
    if(strict) throw new Error("agent provider required for "+role);
    return resultEnvelope(role,{reason:"agent-unconfigured"},"skipped");
  }
  const output=await agent.run({role, ...input});
  if(output===undefined||output===null) {
    if(strict) throw new Error("agent returned empty output: "+role);
    return resultEnvelope(role,{reason:"empty-output"},"failed");
  }
  return resultEnvelope(role,output);
}

export async function runNamedAgents(agent, tasks, {concurrency=4,strict=false}={}) {
  const jobs=tasks.map(task=>async()=>runNamedAgent(agent,task.role,task.input,{strict}));
  const result=await runParallel(tasks,async(_task,i)=>jobs[i](),{concurrency});
  if(result.errors.length) throw new Error(JSON.stringify(result.errors));
  return result.results;
}
