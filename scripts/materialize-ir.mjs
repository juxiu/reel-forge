import fs from "node:fs";
import{buildBeatGraph,beatToScene}from "../src/director/beat-graph.mjs";
import{toRenderIR}from "../src/backends/render-ir.mjs";
const project=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
const script=JSON.parse(fs.readFileSync("fixtures/script.json","utf8"));
const timeline=JSON.parse(fs.readFileSync("script/timeline.json","utf8"));
const graph=buildBeatGraph(script,timeline);
const scenes=script.segments.map((s,i)=>beatToScene(graph.beats[i],s));
const irWide=toRenderIR(project,scenes,{width:1280,height:720,fps:30});irWide.duration=timeline.total_frames/30;fs.writeFileSync("fixtures/render-ir-16x9.json",JSON.stringify(irWide,null,2));
// 9:16 is temporarily disabled. Keep any existing render-ir-9x16.json as a dormant reference fixture, but do not refresh or consume it in the active production path.
fs.writeFileSync("fixtures/render-ir.json",JSON.stringify(toRenderIR(project,scenes,{width:1280,height:720,fps:30}),null,2));
fs.mkdirSync("artifacts/"+project.project_id,{recursive:true});
fs.writeFileSync("artifacts/"+project.project_id+"/beats.json",JSON.stringify(graph,null,2));
fs.writeFileSync("artifacts/"+project.project_id+"/scenes.json",JSON.stringify({scenes},null,2));
console.log("render IR PASS",graph.duration);
