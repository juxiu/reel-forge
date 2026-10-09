import fs from "node:fs";
import {runProduction} from "../src/director/pipeline.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {runNamedAgents} from "../src/agents/orchestrator.mjs";
import {FileLock} from "../src/runtime/lock.mjs";
import {initCheckpoints} from "../src/runtime/checkpoints.mjs";
import {buildResearchMarkdown} from "../src/research/research-md.mjs";

const project=JSON.parse(fs.readFileSync(process.argv[2]||"fixtures/project.json","utf8"));
const scriptFile=process.argv[3]||"fixtures/script.json";
const script=fs.existsSync(scriptFile)?JSON.parse(fs.readFileSync(scriptFile,"utf8")):null;
const root="artifacts";
const lock=FileLock.forProject(project.project_id,root);
lock.acquire();

try {
  initCheckpoints(project.project_id,root);
  const result=await runProduction(project,{script,agent:createAgentProvider(),root});
  const agent=createAgentProvider();
  const strict=process.env.AGENT_STRICT==="1";
  const advisor=await runNamedAgents(agent,[
    {role:"research-agent",input:{project,research:result.research,deliverable:"claim/evidence audit only"}},
    {role:"director-agent",input:{project,research:result.research,script:result.script,beats:result.beats,deliverable:"shot-by-shot visual audit; do not mutate source"}},
  ],{concurrency:2,strict});
  result.agent_reviews=advisor;

  const rootDir=root+"/"+project.project_id;
  fs.mkdirSync(rootDir,{recursive:true});
  // 装配本体在 src/research/research-md.mjs（纯函数）：门用合成 research 真跑它，
  // 而不是 grep 这里的数组字面量 —— 见 docs/knowledge/agent-protocol.md §6 与 verify-instruction-filter E 段。
  fs.writeFileSync(rootDir+"/research.md",buildResearchMarkdown(result.research));
  for(const [name,value] of [
    ["research",result.research],["script",result.script],["beats",result.beats],
    ["scene",{project_id:project.project_id,scenes:result.scenes}],["render-ir",result.renderIR],
    ["agent-reviews",advisor],
  ]) fs.writeFileSync(rootDir+"/"+name+".json",JSON.stringify(value,null,2));
  console.log("production PASS",result.execution.id,"agents="+advisor.filter(x=>x.status==="completed").length);
} finally { lock.release(); }
