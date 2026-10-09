import fs from"node:fs";
import path from"node:path";
import{runAsync}from"../../runtime/spawn.mjs";
const DEFAULTS={kokoro:["python3",["scripts/native_tts_provider.py"]],piper:["python3",["scripts/native_tts_provider.py"]],kokoro_onnx:["python3",["scripts/native_tts_provider.py"]]};
async function execCommand(command,args,input){
  // provider 命令由 TTS_*_COMMAND 给出，写错名字时老代码只报 "spawn ENOENT"，
  // 这里让错误说清楚是**哪个命令**起不来，而不是退出码。
  const r=await runAsync(command,args,{input});
  if(r.error) throw new Error(r.error);
  if(r.status!==0) throw new Error("native TTS provider failed: "+(r.status??"signal "+r.signal)+(r.stderr?" | "+String(r.stderr).slice(-300):""));
  return r.stdout;
}
export async function nativeTts({engine,text,voice,outDir,rate="+0%",env=process.env,index=1}){
  fs.mkdirSync(outDir,{recursive:true});
  if(engine==="wav"){
    if(!env.TTS_WAV_DIR||!env.TTS_WORD_TIMINGS_DIR) throw new Error("TTS_ENGINE=wav requires TTS_WAV_DIR and TTS_WORD_TIMINGS_DIR");
    const srcAudio=path.join(env.TTS_WAV_DIR,"sentence-"+String(index).padStart(3,"0")+".wav");
    const srcTiming=path.join(env.TTS_WORD_TIMINGS_DIR,"sentence-"+String(index).padStart(3,"0")+".json");
    if(!fs.existsSync(srcAudio)||!fs.existsSync(srcTiming)) throw new Error("missing user wav/timing for sentence "+index);
    // ⚠ 逐词时间轴必须与这句**文本**对得上。用户 wav 通道没有 TTS 兜底，
    //   一旦脚本换词而 wav 目录没换，就会拿旧句子的时间轴配新句子 —— 字幕整体错位且没有任何报错。
    //   所以核对：拼起来的词至少要覆盖本句文本里的汉字（逐字比文本没法保证，TTS 分词与文本不一定对齐）。
    const audio=path.join(outDir,"audio.wav"),timings=path.join(outDir,"word-timestamps.json");
    const payload=JSON.parse(fs.readFileSync(srcTiming,"utf8")),words=Array.isArray(payload)?payload:(payload.words||[]);
    if(!words.length) throw new Error("user word timing is empty");
    const spoken=words.map(w=>String(w.text||"")).join("");
    const cjk=(String(text||"").match(/[一-鿿]/g)||[]);
    const missing=cjk.filter(ch=>!spoken.includes(ch));
    if(cjk.length>0&&missing.length>cjk.length*0.34){
      throw new Error(
        `user wav timing does not match sentence ${index}: 文本含 ${cjk.length} 个汉字，时间轴只覆盖 ${cjk.length-missing.length} 个`+
        `（缺 ${missing.slice(0,8).join("")}${missing.length>8?"…":""}）。换过解说词就要换 wav 目录。`,
      );
    }
    fs.copyFileSync(srcAudio,audio);
    fs.writeFileSync(timings,JSON.stringify({words},null,2));
    const duration=Math.max(...words.map(word=>Number(word.end)));
    const manifest={provider:"user-wav",engine:"wav",voice,rate,timing_mode:"tts-word-boundary",timing_source:"user-word-timing",duration_s:duration};
    fs.writeFileSync(path.join(outDir,"voice_manifest.json"),JSON.stringify(manifest,null,2));
    return{audio,timings,manifest};
  }
  const envKey="TTS_"+engine.toUpperCase()+"_COMMAND",argKey="TTS_"+engine.toUpperCase()+"_ARGS";
  const command=env[envKey]||(DEFAULTS[engine]||[])[0],args=env[argKey]?JSON.parse(env[argKey]):((DEFAULTS[engine]||[])[1]||[]);
  if(!command) throw new Error("unsupported native TTS engine: "+engine);
  const result=JSON.parse(await execCommand(command,args,JSON.stringify({engine,text,voice,rate,index,output_dir:path.resolve(outDir)})));
  if(!result.audio_path||!Array.isArray(result.word_timings)||!result.word_timings.length) throw new Error(engine+" provider must return audio_path and word_timings");
  const audio=path.resolve(result.audio_path),timings=path.join(outDir,"word-timestamps.json");
  fs.writeFileSync(timings,JSON.stringify({words:result.word_timings},null,2));
  const manifest={provider:engine,engine,voice,rate,timing_mode:"tts-word-boundary",timing_source:engine,duration_s:Number(result.duration_s)};
  fs.writeFileSync(path.join(outDir,"voice_manifest.json"),JSON.stringify(manifest,null,2));
  return{audio,timings,manifest};
}
