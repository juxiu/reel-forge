import fs from "node:fs";
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const file="artifacts/"+project.project_id+"/qc/still-manifest.json";
if(!fs.existsSync(file)) throw new Error("still benchmark manifest missing");
const report=JSON.parse(fs.readFileSync(file,"utf8"));
for(const scene of report.scenes||[]) {
  if(scene.frames?.length!==6) throw new Error("still plan must contain 6 frames: "+scene.scene_id);
  const values=scene.frames.map(item=>item.frame);
  if(values.some((v,i)=>i&&v<values[i-1])) throw new Error("still frames not ordered: "+scene.scene_id);
}
if(report.test_render?.frames!==30) throw new Error("30-frame test render contract missing");
console.log("still benchmark PASS",report.scenes.length+" scenes");
