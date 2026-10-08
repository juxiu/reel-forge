import fs from "node:fs";
import path from "node:path";
import {validateScene,affectedDownstream} from "../src/qc/qc-engine.mjs";

const root=process.cwd();
const dir=path.join(root,"artifacts","demo-semantic-search");
const sceneDoc=JSON.parse(fs.readFileSync(path.join(dir,"scene.json"),"utf8"));
const p1=JSON.parse(fs.readFileSync(path.join(dir,"content-qa.json"),"utf8"));
const p3=JSON.parse(fs.readFileSync(path.join(dir,"timeline.json"),"utf8"));

const sceneErrors=sceneDoc.scenes.flatMap(s=>validateScene(s).map(e=>({scene_id:s.scene_id,error:e})));
const timelineErrors=[];
for(let i=1;i<p3.scenes.length;i++) if(p3.scenes[i].start<p3.scenes[i-1].end) timelineErrors.push("timeline overlap");
const report={
  project_id:sceneDoc.project_id,
  status:(p1.status==="PASS" && sceneErrors.length===0 && timelineErrors.length===0)?"PASS":"FAIL",
  layers:{
    content:p1.status,
    scene:sceneErrors.length?"FAIL":"PASS",
    timeline:timelineErrors.length?"FAIL":"PASS"
  },
  errors:[...sceneErrors,...timelineErrors]
};
const graph={
  nodes:["scene:001","scene:002","render:001","render:002","delivery"],
  edges:[
    {from:"scene:001",to:"render:001"},
    {from:"scene:002",to:"render:002"},
    {from:"render:001",to:"delivery"},
    {from:"render:002",to:"delivery"}
  ]
};
const rerunPlan={
  failed_node:"scene:002",
  affected_nodes:affectedDownstream(graph,"scene:002"),
  rule:"rerun only failed node and downstream dependents"
};
fs.writeFileSync(path.join(dir,"qc-report.json"),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(dir,"rerun-plan.json"),JSON.stringify(rerunPlan,null,2));
if(report.status!=="PASS") process.exit(1);
console.log(JSON.stringify({stage:"P6",status:"PASS",outputs:["qc-report.json","rerun-plan.json"]},null,2));
