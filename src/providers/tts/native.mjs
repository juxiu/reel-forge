import fs from"node:fs";
import path from"node:path";
import{spawn}from"node:child_process";
const DEFAULTS={kokoro:["python3",["scripts/native_tts_provider.py"]],piper:["python3",["scripts/native_tts_provider.py"]],kokoro_onnx:["python3",["scripts/native_tts_provider.py"]]};
function execCommand(command,args,input){
  return new Promise((resolve,reject)=>{const p=spawn(command,args,{stdio:["pipe","pipe","inherit"]});let out="";p.stdout.on("data",data=>{out+=String(data)});p.on("error",reject);p.on("exit",code=>code===0?resolve(out):reject(new Error("native TTS provider failed: "+code)));p.stdin.end(input);});
}
export async function nativeTts({engine,text,voice,outDir,rate="+0%",env=process.env,index=1}){
  fs.mkdirSync(outDir,{recursive:true});
  if(engine==="wav"){
    if(!env.TTS_WAV_DIR||!env.TTS_WORD_TIMINGS_DIR) throw new Error("TTS_ENGINE=wav requires TTS_WAV_DIR and TTS_WORD_TIMINGS_DIR");
    const srcAudio=path.join(env.TTS_WAV_DIR,"sentence-"+String(index).padStart(3,"0")+".wav");
    const srcTiming=path.join(env.TTS_WORD_TIMINGS_DIR,"sentence-"+String(index).padStart(3,"0")+".json");
    if(!fs.existsSync(srcAudio)||!fs.existsSync(srcTiming)) throw new Error("missing user wav/timing for sentence "+index);
    const audio=path.join(outDir,"audio.wav"),timings=path.join(outDir,"word-timestamps.json");
    fs.copyFileSync(srcAudio,audio);
    const payload=JSON.parse(fs.readFileSync(srcTiming,"utf8")),words=Array.isArray(payload)?payload:(payload.words||[]);
    if(!words.length) throw new Error("user word timing is empty");
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
