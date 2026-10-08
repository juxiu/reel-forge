import fs from "node:fs";
// visual-pixel-v1 只作为 run-to-run 回归记录，不再作为交付门。
// 这里校验"记录是否完整可用"，不校验分数高低。
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const root="artifacts/"+project.project_id+"/qc";
const summary=[];
for(const ratio of ["16x9","9x16"]){
  const file=root+"/visual_regression_"+ratio+".json";
  if(!fs.existsSync(file)) throw new Error("visual regression record missing: "+file);
  const report=JSON.parse(fs.readFileSync(file,"utf8"));
  if(report.embedding!=="visual-pixel-v1") throw new Error("unexpected visual embedding: "+ratio);
  if(report.gate!=="advisory"||report.blocking!==false) throw new Error("visual regression must be advisory: "+ratio);
  if(!(report.scenes||[]).length) throw new Error("visual regression has no scenes: "+ratio);
  for(const scene of report.scenes||[]){
    for(const key of ["reference_similarity","visual_complexity","text_density","hero_consistency","layout_stability"]){
      if(!Number.isFinite(Number(scene[key]))) throw new Error("missing visual dimension "+key+" on "+scene.scene+" / "+ratio);
    }
  }
  const mean=report.scenes.reduce((sum,s)=>sum+Number(s.reference_similarity),0)/report.scenes.length;
  summary.push({ratio,gate:report.gate,status:report.status,scenes:report.scenes.length,mean_reference_similarity:Number(mean.toFixed(3))});
}
console.log("visual regression RECORD PASS (advisory)",JSON.stringify(summary));