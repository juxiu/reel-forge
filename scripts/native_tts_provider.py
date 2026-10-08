#!/usr/bin/env python3
import json,os,re,sys,wave
import numpy as np

def write_wav(path,data,sr):
    a=np.asarray(data,dtype=np.float32).reshape(-1);pcm=(np.clip(a,-1,1)*32767).astype(np.int16)
    with wave.open(path,"wb") as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())

def tokenize(text):
    cjk=sum(1 for ch in text if "\u4e00"<=ch<="\u9fff")
    if cjk>=0.2*max(1,len(text)): return re.findall(r"[\u4e00-\u9fff]|[A-Za-z0-9_.:/-]+|[^\s]",text)
    return re.findall(r"\S+",text)

cfg=json.load(sys.stdin);engine=cfg["engine"];text=cfg["text"];out_dir=cfg["output_dir"];voice=cfg.get("voice") or ("am_liam" if engine.startswith("kokoro") else "piper")
os.makedirs(out_dir,exist_ok=True);parts=[];timings=[];cursor=0.0;sample_rate=24000;tokens=tokenize(text)

if engine=="kokoro":
    from kokoro import KPipeline
    pipe=KPipeline(lang_code=os.environ.get("KOKORO_LANG","a"));speed=float(os.environ.get("KOKORO_SPEED","1.0"))
    for token in tokens:
        pieces=[]
        for item in pipe(token,voice=os.environ.get("KOKORO_VOICE",voice),speed=speed):
            audio=getattr(item,"audio",None)
            if audio is None: audio=item[2]
            if hasattr(audio,"detach"): audio=audio.detach().cpu().numpy()
            pieces.append(np.asarray(audio,dtype=np.float32).reshape(-1))
        audio=np.concatenate(pieces) if pieces else np.zeros(0,dtype=np.float32)
        if not len(audio): continue
        start=cursor;cursor+=len(audio)/sample_rate;timings.append({"text":token,"start":start,"end":cursor});parts.append(audio)
elif engine=="kokoro_onnx":
    from kokoro_onnx import Kokoro
    model=os.environ.get("KOKORO_ONNX_MODEL","");voices=os.environ.get("KOKORO_ONNX_VOICES","")
    if not model or not voices: raise SystemExit("KOKORO_ONNX_MODEL and KOKORO_ONNX_VOICES are required")
    pipe=Kokoro(model,voices)
    for token in tokens:
        audio,sr=pipe.create(token,voice=os.environ.get("KOKORO_ONNX_VOICE",voice),speed=float(os.environ.get("KOKORO_SPEED","1.0")),lang=os.environ.get("KOKORO_ONNX_LANG","en-us"))
        audio=np.asarray(audio,dtype=np.float32).reshape(-1);sample_rate=sr;start=cursor;cursor+=len(audio)/sample_rate;timings.append({"text":token,"start":start,"end":cursor});parts.append(audio)
elif engine=="piper":
    from piper import PiperVoice
    model=os.environ.get("PIPER_MODEL","")
    if not model: raise SystemExit("PIPER_MODEL is required")
    voice_model=PiperVoice.load(model)
    for token in tokens:
        raw=os.path.join(out_dir,".word.tmp.wav")
        with wave.open(raw,"wb") as h:voice_model.synthesize_wav(token,h)
        with wave.open(raw,"rb") as h:sample_rate=h.getframerate();audio=np.frombuffer(h.readframes(h.getnframes()),dtype=np.int16).astype(np.float32)/32767.0
        os.remove(raw);start=cursor;cursor+=len(audio)/sample_rate;timings.append({"text":token,"start":start,"end":cursor});parts.append(audio)
else: raise SystemExit("unsupported engine: "+engine)

merged=np.concatenate(parts) if parts else np.zeros(1,dtype=np.float32)
audio_path=os.path.join(out_dir,"audio.wav");write_wav(audio_path,merged,sample_rate)
print(json.dumps({"audio_path":os.path.abspath(audio_path),"word_timings":timings,"duration_s":float(len(merged)/sample_rate)},ensure_ascii=False))
