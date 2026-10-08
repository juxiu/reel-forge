import{spawn}from"node:child_process";import fs from"node:fs";import path from"node:path";import crypto from"node:crypto";
function makeManifest(audio,voice,rate,words){
  const duration=words.length?Math.max(...words.map(w=>Number(w.end))):0;
  return{provider:"edge-tts",engine:"edge",voice,rate,timing_mode:"tts-word-boundary",timing_source:"edge-tts",audio_sha256:crypto.createHash("sha256").update(fs.readFileSync(audio)).digest("hex"),duration_s:duration};
}
export async function edgeTts({text,voice,outDir,retries=4,rate="+0%"}) {
  fs.mkdirSync(outDir,{recursive:true});
  const audio=path.join(outDir,"audio.mp3"),timings=path.join(outDir,"word-timestamps.json"),manifestFile=path.join(outDir,"voice_manifest.json");
  if(fs.existsSync(audio)&&fs.existsSync(timings)&&fs.statSync(audio).size&&fs.statSync(timings).size){
    const words=JSON.parse(fs.readFileSync(timings,"utf8")).words||[];
    if(words.length){const value=makeManifest(audio,voice,rate,words);fs.writeFileSync(manifestFile,JSON.stringify(value,null,2));return{audio,timings,manifest:value,cached:true};}
  }
  for(let attempt=1;attempt<=retries;attempt++){
    try{
      await new Promise((resolve,reject)=>{
        const p=spawn("python3",["scripts/edge_tts_provider.py","--text",text,"--voice",voice,"--rate",rate,"--audio",audio,"--timings",timings],{stdio:"inherit"});
        p.on("error",reject);p.on("exit",code=>code===0?resolve():reject(new Error("edge tts failed: "+code)));
      });
      break;
    }catch(error){if(attempt===retries)throw error;await new Promise(r=>setTimeout(r,1000*attempt));}
  }
  const words=JSON.parse(fs.readFileSync(timings,"utf8")).words||[];
  if(!words.length) throw new Error("provider returned no word timings");
  const value=makeManifest(audio,voice,rate,words);
  fs.writeFileSync(manifestFile,JSON.stringify(value,null,2));
  return{audio,timings,manifest:value,cached:false};
}
