import{Execution}from "../core/runtime.mjs";import{fetchSource}from "../providers/research/web.mjs";import{buildClaimGraph}from "./../research/claim-graph.mjs";import{buildBeatGraph,beatToScene}from "./beat-graph.mjs";import{toRenderIR}from "../backends/render-ir.mjs";

export async function runProduction(project,{script,agent=null,root="artifacts"}={}){
  const ex=new Execution(project,root);ex.emit("production.started",{project_id:project.project_id});
  try{
    let research=null;
    ex.emit("research.started",{sources:(project.source_urls||[]).length});
    if(!(project.source_urls||[]).length)throw new Error("source_urls required");
    for(const url of project.source_urls){const source=await fetchSource(url);research=buildClaimGraph(project,source);break;}
    ex.emit("research.completed",{claims:research.claims.length});
    if(!script){
      if(!agent)throw new Error("script missing and no agent provider configured");
      ex.emit("script.started");
      script=await agent.run({project,research});
      ex.emit("script.completed",{segments:script.segments?.length||0});
    }
    const graph=buildBeatGraph(script);ex.emit("director.completed",{beats:graph.beats.length});
    const scenes=script.segments.map((s,i)=>beatToScene(graph.beats[i],s));
    const renderIR=toRenderIR(project,scenes,{width:1280,height:720,fps:30});
    ex.emit("render-ir.completed",{scenes:renderIR.scenes.length});
    ex.complete();return{execution:ex,research,script,beats:graph,scenes,renderIR};
  }catch(error){ex.fail(error);throw error}
}