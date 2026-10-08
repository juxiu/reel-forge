import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function uniqueDeliveryName(file, used) {
  const base = path.basename(file);
  if (!used.has(base)) return base;

  const parts = file.split(path.sep).filter(Boolean);
  const ext = path.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;

  for (let depth = 1; depth < parts.length; depth += 1) {
    const prefix = parts.slice(-depth - 1, -1).join("-");
    const candidate = prefix + "-" + stem + ext;
    if (!used.has(candidate)) return candidate;
  }

  let index = 2;
  while (used.has(stem + "-" + index + ext)) index += 1;
  return stem + "-" + index + ext;
}

export function packageDelivery({projectId,files,outDir="artifacts/delivery",metadata={}}){
  const dir=path.join(outDir,projectId);
  fs.mkdirSync(dir,{recursive:true});
  const manifest=[];
  const used=new Set();

  for(const file of files){
    if(!fs.existsSync(file))throw new Error("missing delivery file: "+file);
    const data=fs.readFileSync(file);
    const name=uniqueDeliveryName(file,used);
    used.add(name);
    const dest=path.join(dir,name);
    fs.copyFileSync(file,dest);
    manifest.push({
      name,
      source:file,
      size:data.length,
      sha256:crypto.createHash("sha256").update(data).digest("hex")
    });
  }

  const result={version:"0.3",project_id:projectId,generated_at:new Date().toISOString(),metadata,files:manifest};
  fs.writeFileSync(path.join(dir,"delivery-manifest.json"),JSON.stringify(result,null,2));
  return result;
}