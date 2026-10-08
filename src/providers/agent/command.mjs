import{spawn}from "node:child_process";
export async function commandAgent({input,command,args=[]}){
  if(!command)throw new Error("agent provider missing command");
  return await new Promise((resolve,reject)=>{
    const p=spawn(command,args,{stdio:["pipe","pipe","inherit"]});
    let out="";p.stdout.on("data",d=>{out+=d});
    p.on("error",reject);
    p.on("exit",code=>{if(code!==0)return reject(new Error("agent failed: "+code));try{resolve(JSON.parse(out))}catch(e){reject(new Error("agent output is not JSON"))}});
    p.stdin.end(JSON.stringify(input));
  });
}