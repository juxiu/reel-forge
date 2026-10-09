import fs from "node:fs";
// visual-pixel 描述符只作为 run-to-run 回归记录，不再作为交付门（理由见 visual_regression.py 头部）。
// 这里校验"记录是否完整可用"，不校验分数高低。
// embedding 名字取自 benchmark 清单，不在这里再抄一遍字面量：三处硬编码迟早有两处是过期的。
const benchmark=JSON.parse(fs.readFileSync("fixtures/visual-benchmark.json","utf8"));
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const root="artifacts/"+project.project_id+"/qc";
const summary=[];
for(const ratio of ["16x9","9x16"]){
  const file=root+"/visual_regression_"+ratio+".json";
  if(!fs.existsSync(file)) throw new Error("visual regression record missing: "+file);
  const report=JSON.parse(fs.readFileSync(file,"utf8"));
  if(report.embedding!==benchmark.embedding) throw new Error(`visual embedding ${report.embedding} != benchmark ${benchmark.embedding} / ${ratio}：跨版本 cosine 读数不可比`);
  if(report.gate!=="advisory"||report.blocking!==false) throw new Error("visual regression must be advisory: "+ratio);
  // 记录里必须带着当次用的判据，且与当前清单一致：否则「分数动了」是画面变了还是阈值/权重变了，没人说得清。
  for(const [field, table] of [["thresholds", benchmark.thresholds], ["scoring", benchmark.scoring]]) {
    for(const [key, want] of Object.entries(table || {})) {
      const got = (report[field] || {})[key];
      if(Number(got)!==Number(want)) throw new Error(`record judged with ${field}.${key}=${got}, benchmark says ${want} / ${ratio}`);
    }
  }
  if(!(report.scenes||[]).length) throw new Error("visual regression has no scenes: "+ratio);
  for(const scene of report.scenes||[]){
    for(const key of ["nearest_positive","nearest_anti"]){
      if(!scene[key]) throw new Error("missing "+key+" on "+scene.scene+" / "+ratio);
    }
    for(const key of ["reference_similarity","visual_complexity","text_density","hero_consistency","layout_stability"]){
      const v=Number(scene[key]);
      if(!Number.isFinite(v)) throw new Error("missing visual dimension "+key+" on "+scene.scene+" / "+ratio);
      if(v<0||v>1) throw new Error("visual dimension "+key+" out of [0,1] on "+scene.scene+" / "+ratio+" = "+v);
    }
  }
  const mean=report.scenes.reduce((sum,s)=>sum+Number(s.reference_similarity),0)/report.scenes.length;
  summary.push({ratio,gate:report.gate,status:report.status,scenes:report.scenes.length,mean_reference_similarity:Number(mean.toFixed(3))});
}
console.log("visual regression RECORD PASS (advisory)",JSON.stringify(summary));