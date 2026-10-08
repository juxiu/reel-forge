import fs from "node:fs";
const ir=JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json","utf8"));const maxPerGroup=5;const groups=[];
for(let i=0;i<ir.scenes.length;i+=maxPerGroup)groups.push({id:"G"+String(groups.length+1),scene_ids:ir.scenes.slice(i,i+maxPerGroup).map(s=>s.id),status:"planned"});
fs.mkdirSync("artifacts/"+ir.project_id+"/build-groups",{recursive:true});for(const g of groups)fs.writeFileSync("artifacts/"+ir.project_id+"/build-groups/"+g.id+".json",JSON.stringify(g,null,2));
console.log("build groups PASS",groups.length);
