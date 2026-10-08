import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";

export function packageDelivery({projectId,files,outDir="artifacts/delivery",metadata={}}){
 const dir=path.join(outDir,projectId);fs.mkdirSync(dir,{recursive:true});const manifest=[];
 for(const file of files){
  if(!fs.existsSync(file))throw new Error("missing delivery file: "+file);
  const data=fs.readFileSync(file);const name=path.basename(file);const dest=path.join(dir,name);
  fs.copyFileSync(file,dest);
  manifest.push({name,size:data.length,sha256:crypto.createHash("sha256").update(data).digest("hex")});
 }
 const result={version:"0.2",project_id:projectId,generated_at:new Date().toISOString(),metadata,files:manifest};
 fs.writeFileSync(path.join(dir,"delivery-manifest.json"),JSON.stringify(result,null,2));
 return result;
}
