import {runAsync}from"../../runtime/spawn.mjs";import fs from"node:fs";import path from"node:path";import crypto from"node:crypto";
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
      // python3 在 Windows 上可能只叫 python/py —— 交给 spawn 层按别名解析。
      const r=await runAsync("python3",["scripts/edge_tts_provider.py","--text",text,"--voice",voice,"--rate",rate,"--audio",audio,"--timings",timings],{stdio:"inherit"});
      // 找不到解释器属于环境问题，重试 4 次只会白等；直接抛，错误里带命令名。
      if(r.error) throw new Error("edge tts: "+r.error);
      if(r.status!==0) throw new Error("edge tts failed: exit "+(r.status??"signal "+r.signal));
      break;
    }catch(error){if(attempt===retries)throw error;await new Promise(r=>setTimeout(r,1000*attempt));}
  }
  const words=JSON.parse(fs.readFileSync(timings,"utf8")).words||[];
  if(!words.length) throw new Error("provider returned no word timings");
  const value=makeManifest(audio,voice,rate,words);
  fs.writeFileSync(manifestFile,JSON.stringify(value,null,2));
  return{audio,timings,manifest:value,cached:false};
}
