import {runParallel} from "../scheduler/pool.mjs";
import {buildTaskBrief} from "./task-brief.mjs";

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
  // 任务书在这里注入，不在四个调用点各拼一遍：调用点忘了带就是第四份硬编码。
  // 顺序也刻意让 task 排在 ...input 之后，payload 里同名 key 顶不掉任务书。
  const output=await agent.run({...input, role, task: buildTaskBrief(role, {deliverable: input.deliverable, group: input.group, ratio: input.ratio, videoShotcraftDir: input.videoShotcraftDir})});
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
