import{spawn}from "node:child_process";
export async function probeMedia(file){
 return await new Promise((resolve,reject)=>{
  const p=spawn("ffprobe",["-v","error","-show_entries","format=duration,size:stream=codec_type,width,height,r_frame_rate","-of","json",file],{stdio:["ignore","pipe","inherit"]});
  let out="";p.stdout.on("data",d=>out+=d);p.on("error",reject);p.on("exit",c=>{if(c!==0)return reject(new Error("ffprobe failed"));try{resolve(JSON.parse(out))}catch{reject(new Error("invalid ffprobe output"))}});
 });
}
export async function motionScore(file){
 return await new Promise((resolve,reject)=>{
  const p=spawn("ffmpeg",["-hide_banner","-i",file,"-vf","select=gt(scene\,0.03),showinfo","-an","-f","null","-"],{stdio:["ignore","pipe","pipe"]});
  let err="";p.stderr.on("data",d=>err+=d);p.on("error",reject);p.on("exit",c=>{if(c!==0)return reject(new Error("motion analysis failed"));resolve((err.match(/showinfo/g)||[]).length)});
 });
}
