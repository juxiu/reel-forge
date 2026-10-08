import fs from "node:fs";
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const root="artifacts/"+project.project_id+"/qc";
for(const ratio of ["16x9","9x16"]){
  const file=root+"/visual_regression_"+ratio+".json";
  if(!fs.existsSync(file)) throw new Error("visual regression missing: "+file);
  const report=JSON.parse(fs.readFileSync(file,"utf8"));
  if(report.embedding!=="visual-pixel-v1") throw new Error("unexpected visual embedding: "+ratio);
  if(report.status!=="PASS") throw new Error("visual regression FAIL: "+ratio);
  for(const scene of report.scenes||[]){
    if(scene.status!=="PASS") throw new Error("visual scene FAIL: "+scene.scene+" / "+ratio);
    for(const key of ["reference_similarity","visual_complexity","text_density","hero_consistency","layout_stability"]){
      if(!Number.isFinite(Number(scene[key]))) throw new Error("missing visual dimension "+key+" on "+scene.scene+" / "+ratio);
    }
  }
}
console.log("visual regression PASS");
