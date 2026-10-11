import fs from "node:fs";
import {runProduction} from "../src/director/pipeline.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {runNamedAgents} from "../src/agents/orchestrator.mjs";
import {FileLock} from "../src/runtime/lock.mjs";
import {initCheckpoints} from "../src/runtime/checkpoints.mjs";
import {buildResearchMarkdown} from "../src/research/research-md.mjs";

const project=JSON.parse(fs.readFileSync(process.argv[2]||"fixtures/project.json","utf8"));
const scriptFile=process.argv[3]||"fixtures/script.json";
// 只认属于当前项目的 script.json。上一次跑过的项目会把它的 fixtures/script.json 留在盘上，
// 新主题一键链走到这里就会拿**别人的解说稿**去跑，撞上 pipeline 的 project_id 守卫，
// 报出的是「script project_id mismatch」这种和新主题毫无关系的错——见 §12 净室实测。
// 判为空脚本后，runProduction 会走「script 缺失」分支：有 AGENT_COMMAND 就用 agent 生成，
// 没有就给出明确的「script missing and no agent provider configured」，而不是误导性的身份错。
const loaded=fs.existsSync(scriptFile)?JSON.parse(fs.readFileSync(scriptFile,"utf8")):null;
if(loaded&&loaded.project_id!==project.project_id) console.warn("RUN-PRODUCTION NOTE: 忽略不属于本项目的 "+scriptFile+"（project_id="+loaded.project_id+"，当前 "+project.project_id+"）；无 agent 时会按 script 缺失处理");
const script=loaded&&loaded.project_id===project.project_id?loaded:null;
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
