import{spawn}from "node:child_process";
function run(command,args){return new Promise((resolve,reject)=>{const p=spawn(command,args,{stdio:["ignore","pipe","pipe"]});let out="",err="";p.stdout.on("data",d=>out+=d);p.stderr.on("data",d=>err+=d);p.on("error",reject);p.on("exit",c=>c?reject(new Error(command+" failed: "+c+" "+err.slice(-500))):resolve({out,err}));});}
export async function probeMedia(file){const r=await run("ffprobe",["-v","error","-show_entries","format=duration,size:stream=codec_type,width,height,r_frame_rate","-of","json",file]);return JSON.parse(r.out);}
export async function mediaSignals(file){
 const m=await run("ffmpeg",["-hide_banner","-i",file,"-vf","select=gt(scene\\,0.03),showinfo","-an","-f","null","-"]);
 const b=await run("ffmpeg",["-hide_banner","-i",file,"-vf","blackdetect=d=0.35:pix_th=0.02","-an","-f","null","-"]);
 return{motion_frames:(m.err.match(/showinfo/g)||[]).length,black_segments:(b.err.match(/black_start:/g)||[]).length};
}