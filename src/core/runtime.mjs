import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";
export class Execution{
 constructor(project,root="artifacts"){this.project=project;this.id=crypto.createHash("sha256").update(JSON.stringify(project)).digest("hex").slice(0,16);this.dir=path.join(root,project.project_id,"runtime");fs.mkdirSync(this.dir,{recursive:true});this.state={id:this.id,project_id:project.project_id,status:"running",events:[]};this.save();}
 static load(project,root="artifacts"){
  const dir=path.join(root,project.project_id,"runtime");const file=path.join(dir,"state.json");
  if(!fs.existsSync(file))return new Execution(project,root);
  const instance=Object.create(Execution.prototype);instance.project=project;instance.id=crypto.createHash("sha256").update(JSON.stringify(project)).digest("hex").slice(0,16);instance.dir=dir;instance.state=JSON.parse(fs.readFileSync(file,"utf8"));return instance;
 }
 emit(type,payload={}){this.state.events.push({at:new Date().toISOString(),type,payload});this.save();}
 pause(reason){this.state.status="paused";this.emit("approval.required",{reason});}
 resume(){if(this.state.status!=="paused")throw new Error("execution not paused");this.state.status="running";this.emit("approval.granted");}
 fail(error){this.state.status="failed";this.emit("execution.failed",{message:String(error?.message||error)});}
 complete(){this.state.status="completed";this.emit("execution.completed");}
 save(){fs.writeFileSync(path.join(this.dir,"state.json"),JSON.stringify(this.state,null,2));}
}
