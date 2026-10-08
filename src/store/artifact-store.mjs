import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";
export class ArtifactStore{
 constructor(root="artifacts"){this.root=root;}
 put(projectId,type,value){const body=typeof value==="string"?value:JSON.stringify(value,null,2);const hash=crypto.createHash("sha256").update(body).digest("hex");const dir=path.join(this.root,projectId,type);fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,hash+".json");fs.writeFileSync(file,body);const manifest={type,hash,path:file,size:Buffer.byteLength(body)};fs.writeFileSync(path.join(dir,"latest.json"),JSON.stringify(manifest,null,2));return manifest;}
}