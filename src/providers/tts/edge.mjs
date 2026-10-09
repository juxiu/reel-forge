import {runAsync}from"../../runtime/spawn.mjs";import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";

/**
 * 缓存键 =文本 + 声音 + 语速 的 sha256。
 *
 * ⚠ 事故（2026-10-09 实测）：原实现只判断「audio.mp3 与 word-timestamps.json 存在且非空」
 *   就当缓存命中，**从不校验内容是否对得上**。而 artifacts/ 里躺着的缓存是旧英文解说词的配音
 *   （"When an HTTP message crosses more than one connection…"），解说词早已换成中文。
 *   于是 `npm run tts` 会把旧英文音频当成第1 句的缓存直接复用 ——
 *   成片变成**英文配音配中文字幕**，而 timeline / IR / 门禁全部自洽、全部通过。
 *   「依赖没装所以静默不跑」的孪生兄弟：「缓存命中所以静默地跑错」。
 *
 * 所以命中条件必须是三件事同时成立：文件在、有内容、**键对得上**。
 * 键写进 word-timestamps.json 旁边的小文件，读的时候一并核对；对不上就重新合成（不删旧文件，
 * 免得把别人正在用的缓存删掉）。
 */
function cacheKey({text, voice, rate}) {
  return crypto.createHash("sha256").update(JSON.stringify({text: String(text), voice, rate})).digest("hex");
}

function makeManifest(audio,voice,rate,words){
  const duration=words.length?Math.max(...words.map(w=>Number(w.end))):0;
  return{provider:"edge-tts",engine:"edge",voice,rate,timing_mode:"tts-word-boundary",timing_source:"edge-tts",audio_sha256:crypto.createHash("sha256").update(fs.readFileSync(audio)).digest("hex"),duration_s:duration};
}

export async function edgeTts({text,voice,outDir,retries=4,rate="+0%"}) {
  fs.mkdirSync(outDir,{recursive:true});
  const audio=path.join(outDir,"audio.mp3"),timings=path.join(outDir,"word-timestamps.json"),manifestFile=path.join(outDir,"voice_manifest.json");
  const keyFile=path.join(outDir,"cache_key.json");
  const key=cacheKey({text,voice,rate});

  const hit=fs.existsSync(audio)&&fs.existsSync(timings)&&fs.statSync(audio).size&&fs.statSync(timings).size
    &&fs.existsSync(keyFile)&&JSON.parse(fs.readFileSync(keyFile,"utf8")).key===key;
  if(hit){
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
      // 只有合成成功才写键——写早了会让一次失败的尝试被当成有效缓存。
      fs.writeFileSync(keyFile,JSON.stringify({key,text,voice,rate},null,2));
      break;
    }catch(error){
      if(attempt===retries)throw error;
      // 退避要够长：edge-tts 是联网服务，连续 132 句会被限流，
      // 而 NoAudioReceived 正是限流的表象。原来的 1s/2s/3s 太短，四次全折在限流窗口里。
      // 指数退避 + 抖动，避免多句在同一时刻一起重试再撞一次。
      const wait=Math.min(30000,2000*Math.pow(2,attempt-1))+Math.floor(Math.random()*1200);
      console.error(`edge tts 第 ${attempt}/${retries} 次失败（${error.message}），${wait}ms 后重试`);
      await new Promise(r=>setTimeout(r,wait));
    }
  }
  const words=JSON.parse(fs.readFileSync(timings,"utf8")).words||[];
  if(!words.length) throw new Error("provider returned no word timings");
  const value=makeManifest(audio,voice,rate,words);
  fs.writeFileSync(manifestFile,JSON.stringify(value,null,2));
  return{audio,timings,manifest:value,cached:false};
}

export {cacheKey};