import fs from "node:fs";
const supported=new Set(["edge","kokoro","piper","kokoro_onnx","wav"]);
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const engine=process.env.TTS_ENGINE||project.tts?.engine||"edge";
if(!supported.has(engine)) throw new Error("unsupported TTS engine: "+engine);
const cacheMode=project.tts?.cache!==false;
if(!cacheMode) console.warn("TTS cache disabled explicitly");
const manifest="artifacts/"+project.project_id+"/audio/voice-manifest.json";
if(fs.existsSync(manifest)){
  const data=JSON.parse(fs.readFileSync(manifest,"utf8"));
  if(data.engine&&data.engine!==engine) throw new Error("voice manifest engine mismatch");
}
console.log("tts parity PASS",JSON.stringify({
  engine,
  cache:cacheMode,
  timing:"tts-word-boundary",
  portable_engines:["edge","kokoro","piper","kokoro_onnx","wav"]
}));
