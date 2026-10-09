import fs from "node:fs";
import path from "node:path";
import {run as spawn} from "../src/runtime/spawn.mjs";
import crypto from "node:crypto";
import {edgeTts} from "../src/providers/tts/edge.mjs";
import {nativeTts} from "../src/providers/tts/native.mjs";
import {captionsFromWords} from "../src/captions/pipeline.mjs";

const FPS=30;
const LEAD_FRAMES=Number(process.env.LEAD_FRAMES||45);
const SENTENCE_GAP_FRAMES=Number(process.env.SENTENCE_GAP_FRAMES||10);
const PARAGRAPH_GAP_FRAMES=Number(process.env.PARAGRAPH_GAP_FRAMES||30);
const CHAPTER_GAP_FRAMES=Number(process.env.CHAPTER_GAP_FRAMES||45);
const TAIL_FRAMES=Number(process.env.TAIL_FRAMES||60);

function parseNarration(text){
  const lines=text.split(/\r?\n/),items=[];
  let chapter=1,title="",pendingGap=0,paragraphBreak=false,hasSpeech=false;
  for(const raw of lines){
    const line=raw.trim();
    if(!line){
      if(hasSpeech&&items.at(-1)?.type==="sentence"){items.at(-1).paragraphEnd=true;paragraphBreak=true;}
      continue;
    }
    const chapterMatch=line.match(/^# CHAPTER\s+(\d+)\s+(.+)$/i);
    if(chapterMatch){chapter=Number(chapterMatch[1]);title=chapterMatch[2].trim();items.push({type:"chapter",chapter,title});paragraphBreak=false;continue;}
    const gapMatch=line.match(/^## gap\s+(\d+)$/i);
    if(gapMatch){pendingGap+=Number(gapMatch[1]);continue;}
    if(line.startsWith("#")) continue;
    const gapBefore=hasSpeech?pendingGap+(paragraphBreak?PARAGRAPH_GAP_FRAMES:SENTENCE_GAP_FRAMES):0;
    items.push({type:"sentence",chapter,text:line,gapBefore,paragraphEnd:false,chapterTitle:title});
    pendingGap=0;paragraphBreak=false;hasSpeech=true;
  }
  if(items.some(item=>item.type==="sentence")) items.filter(item=>item.type==="sentence").at(-1).paragraphEnd=true;
  return items;
}

function alignedChunks(text,chunks,words,duration){
  const charTiming=new Array(text.length).fill(null);let cursor=0;
  for(const word of words){
    const raw=String(word.text??"");
    const clean=raw.replace(/[\s，。、！？：；“”（）,.!?:;()\\-—…]/g,"");
    if(!clean) continue;
    let pos=text.indexOf(clean,cursor);
    if(pos<0) pos=text.indexOf(clean[0],cursor);
    if(pos<0) continue;
    for(let i=pos;i<Math.min(text.length,pos+clean.length);i++) charTiming[i]={start:Number(word.start),end:Number(word.end)};
    cursor=pos+clean.length;
  }
  const result=[];let searchCursor=0;
  for(const chunk of chunks){
    const startOffset=Math.max(0,text.indexOf(chunk,searchCursor));
    const actualStart=startOffset<0?searchCursor:startOffset;
    const endOffset=actualStart+chunk.length;
    searchCursor=endOffset;
    let start=null,end=null;
    for(let i=actualStart;i<Math.min(text.length,endOffset);i++){
      if(charTiming[i]){start??=charTiming[i].start;end=charTiming[i].end;}
    }
    if(start==null||end==null){
      const ratioStart=actualStart/Math.max(1,text.length),ratioEnd=endOffset/Math.max(1,text.length);
      start=ratioStart*duration;end=ratioEnd*duration;
    }
    result.push({start:Math.max(0,start),end:Math.max(start,end)});
  }
  return result;
}

function runFfmpeg(args){
  const result=spawn("ffmpeg",args,{encoding:"utf8"});
  if(result.error) throw new Error("ffmpeg 无法启动: "+result.error+"（不在 PATH？装 ffmpeg 或设置 FFMPEG_PATH）");
  if(result.status!==0) throw new Error("ffmpeg failed: "+(result.stderr||"").slice(-1000));
}
function mixAudio(parts,totalSeconds,outFile){
  if(!parts.length) throw new Error("no audio parts");
  const args=["-y"];for(const part of parts) args.push("-i",part.file);
  const inputs=parts.map((part,index)=>{const delay=Math.max(0,Math.round(part.start*1000));return "["+index+":a]adelay="+delay+"|"+delay+"[a"+index+"]";});
  const labels=parts.map((_,index)=>"[a"+index+"]").join("");
  const filter=[...inputs,labels+"amix=inputs="+parts.length+":duration=longest:normalize=0,apad,atrim=0:"+totalSeconds+",alimiter=limit=0.89[out]"].join(";");
  runFfmpeg([...args,"-filter_complex",filter,"-map","[out]","-ar","48000","-ac","2","-c:a","libmp3lame","-b:a","192k",outFile]);
}
function resultProvider(engine){return engine==="edge"?"edge-tts":engine==="wav"?"user-wav":engine;}

const narrationFile=process.argv[2]||"script/narration.txt";
const items=parseNarration(fs.readFileSync(narrationFile,"utf8"));
const project=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
const language=project.language||"zh";
const engine=String(process.env.TTS_ENGINE||project.tts?.engine||"edge").toLowerCase();
const voice=process.env.TTS_VOICE||project.tts?.voice||(language==="zh"?"zh-CN-YunxiNeural":"en-US-JennyNeural");
const rate=process.env.TTS_RATE||project.tts?.rate||"+0%";
const supportedEngines=new Set(["edge","kokoro","piper","kokoro_onnx","wav"]);
if(!supportedEngines.has(engine)) throw new Error("unsupported TTS engine: "+engine);
const root=path.join("artifacts",project.project_id,"audio");
fs.mkdirSync(root,{recursive:true});

// ---------------------------------------------------------------------------
// 两段式：先**并发合成**（句与句彼此独立，各写自己的 sentence-NNN 目录），
// 再**串行装配**（游标、混音、时间轴必须按句号推进）。
//
// ⚠ 为什么要拆开：串行时 44 句 ≈ 45 分钟（每句一次 python 进程 + 联网合成 ≈ 60s），
//   于是一条链上最慢的环节成了「等 TTS」。而合成之间**没有任何依赖** —— 第 7 句不需要
//   第 6 句的结果，所以并发合成、串行装配能把 44 句压到约 12 分钟。
//   游标与混音**必须留在串行段**：cursorSeconds 依赖前一句的时长，并发算就会错位。
//
// 缓存键（文本+声音+语速的 sha256，见 src/providers/tts/edge.mjs）让这件事幂等：
// 重跑时已合成的句直接命中，不会重复合成。
const CONCURRENCY = Math.max(1, Number(process.env.TTS_CONCURRENCY || 4));

const spoken = items
  .filter((item) => item.type !== "chapter")
  .map((item, index) => {
    const chunks = item.text.split("|").map((value) => value.trim()).filter(Boolean);
    return {
      index,
      item,
      chunks,
      cleanText: chunks.join(language === "en" ? " " : ","),
      outDir: path.join(root, "sentence-" + String(index + 1).padStart(3, "0")),
    };
  });

// ---- 阶段一：并发合成 ----
let synthesized = 0;
async function synthOne(entry) {
  const result = engine === "edge"
    ? await edgeTts({text: entry.cleanText, voice, outDir: entry.outDir, rate})
    : await nativeTts({engine, text: entry.cleanText, voice, outDir: entry.outDir, rate, index: entry.index + 1});
  synthesized++;
  process.stderr.write(`\r  TTS 合成 ${synthesized}/${spoken.length}（并发 ${CONCURRENCY}）`);
  return {...entry, result};
}
const synthResults = new Array(spoken.length);
{
  let next = 0;
  const workers = Array.from({length: Math.max(1, Math.min(CONCURRENCY, spoken.length))}, async () => {
    for (;;) {
      const i = next++;
      if (i >= spoken.length) return;
      synthResults[i] = await synthOne(spoken[i]);
    }
  });
  await Promise.all(workers);
  process.stderr.write("\n");

  // ---- 串行补齐 ----
  // ⚠ 并发到 44 句这一档时，edge-tts 会**持续限流**（实测最后两句连续 20 次
  //   NoAudioReceived，而 edge.mjs 内部只退避到8s就放弃）。更糟的是原写法里
  //   任何一句失败都会让整个 Promise.all 抛掉，**已经合成好的 42 句全部作废**
  //   （虽然有缓存，但整轮的时间全白费）。
  //   所以这里把失败的那几句**单独串行重试**：并发降到 1，等待拉长。
  //   限流是并发放大的，串行几乎总能过。
  const failed = [];
  for (let i = 0; i < spoken.length; i++) if (!synthResults[i]) failed.push(spoken[i]);
  if (failed.length) {
    process.stderr.write(`  ${failed.length} 句并发失败，转串行补齐：${failed.map((f) => f.index + 1).join(",")}`);
    for (const entry of failed) {
      let done = false;
      for (let attempt = 1; attempt <= 6 && !done; attempt++) {
        try {
          synthResults[entry.index] = await synthOne(entry);
          done = true;
        } catch (error) {
          const wait = Math.min(45000, 4000 * attempt) + Math.floor(Math.random() * 1500);
          process.stderr.write(`\n  第${entry.index + 1} 句串行第 ${attempt}/6 次失败（${error.message}），${wait}ms 后再试`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      if (!done) throw new Error(`TTS 第 ${entry.index + 1} 句在并发与串行两轮后仍失败 —— 先修网络/限流，或调低 TTS_CONCURRENCY`);
    }
    process.stderr.write("\n");
  }
}

// ---- 阶段二：串行装配（游标按句号推进，混音顺序即句号）----
let cursorSeconds = LEAD_FRAMES / FPS;
let sentenceIndex = 0;
let speechSeconds = 0;
let lastChapter = null;
const sentences = [];
const audioParts = [];
const allWords = [];
for (const entry of synthResults) {
  const {item, chunks, cleanText, result} = entry;
  if (item.chapter !== lastChapter) {
    if (sentenceIndex > 0) cursorSeconds += CHAPTER_GAP_FRAMES / FPS;
    lastChapter = item.chapter;
  }
  cursorSeconds += item.gapBefore / FPS;
  const words = JSON.parse(fs.readFileSync(result.timings, "utf8")).words;
  if (!words.length) throw new Error("no real word timing for sentence " + (entry.index + 1));
  const offset = cursorSeconds;
  for (const word of words) allWords.push({...word, start: Number(word.start) + offset, end: Number(word.end) + offset});
  const timings = alignedChunks(cleanText, chunks, words, result.manifest.duration_s);
  const from = Math.round((offset + Number(words[0].start)) * FPS) + 1;
  const to = Math.max(from, Math.round((offset + Number(words.at(-1).end)) * FPS));
  const subs = chunks.map((chunk, index) => {
    const timing = timings[index];
    const sf = Math.round((offset + timing.start) * FPS) + 1;
    return {from: sf, to: Math.max(sf, Math.round((offset + timing.end) * FPS)), text: chunk};
  });
  const id = "S" + String(sentenceIndex + 1).padStart(2, "0");
  sentences.push({id, chapter: item.chapter, from, to, text: cleanText, para: Boolean(item.paragraphEnd), subs});
  audioParts.push({file: result.audio, start: offset});
  cursorSeconds = offset + Number(result.manifest.duration_s);
  speechSeconds += Number(result.manifest.duration_s);
  sentenceIndex++;
}

const totalSeconds=cursorSeconds+TAIL_FRAMES/FPS;
const audioFile=path.join(root,"audio.mp3");
mixAudio(audioParts,totalSeconds,audioFile);
fs.mkdirSync("public",{recursive:true});fs.copyFileSync(audioFile,"public/audio.mp3");
const chapterItems=items.filter(item=>item.type==="chapter");
const chapters=chapterItems.length?chapterItems.map(item=>{const first=sentences.find(sentence=>sentence.chapter===item.chapter);return{n:item.chapter,title:item.title,from:first?.from??1};}):[{n:1,title:"",from:1}];
const captionSource=captionsFromWords(allWords,{language});
const timeline={fps:FPS,total_frames:Math.max(1,Math.ceil(totalSeconds*FPS)),engine,voice,rate,language,timing_mode:"tts-word-boundary",chapters,sentences,speech_seconds:Number(speechSeconds.toFixed(3))};
fs.mkdirSync("script",{recursive:true});
fs.writeFileSync("script/timeline.json",JSON.stringify(timeline,null,2));
// 打包用的装载点：script/timeline.json 是 gitignore 的运行产物，直接 import 它会让 fresh clone 在跑配音前连 bundle 都过不了。
// 这里把同一份数据写成必定存在的源码模块（仓库里有占位版本，参照 anything2explainer 的 src/common/timeline.ts）。
fs.mkdirSync(path.join("src","remotion"),{recursive:true});
fs.writeFileSync(path.join("src","remotion","timeline.gen.mjs"),[
  "// 由 scripts/tts_build.mjs 生成，请勿手改；仓库里的占位版本在配音后会被这里覆盖。",
  "// 时间轴真源仍是 script/timeline.json，本文件只是给 webpack 一个必定能解析的模块。",
  "export const timeline = "+JSON.stringify(timeline,null,2)+";",
  "",
  "export default timeline;",
  ""
].join("\n"));

fs.writeFileSync("script/timeline.md",[
  "# 时间轴","",
  "| 句 | 章 | 帧 from–to | 时长 | 段末 | 文本 |","|---|---|---:|---:|---|---|",
  ...sentences.map(sentence=>"| "+sentence.id+" | "+sentence.chapter+" | "+sentence.from+"–"+sentence.to+" | "+((sentence.to-sentence.from+1)/FPS).toFixed(1)+"s | "+(sentence.para?"¶":"")+" | "+sentence.text.replaceAll("|","\\|")+" |"),
  "","## 章节起始帧",...chapters.map(chapter=>"- 第"+chapter.n+"章 "+chapter.title+"：f"+chapter.from)
].join("\n"));
fs.writeFileSync(path.join(root,"timeline-source.json"),JSON.stringify(allWords,null,2));
fs.writeFileSync("script/timeline-source.json",JSON.stringify(allWords,null,2));
fs.writeFileSync(path.join(root,"voice-manifest.json"),JSON.stringify({
  provider:resultProvider(engine),engine,voice,rate,timing_mode:"tts-word-boundary",
  timing_source:engine==="wav"?"user-word-timing":engine,sentence_count:audioParts.length,
  final_audio:audioFile,audio_sha256:crypto.createHash("sha256").update(fs.readFileSync(audioFile)).digest("hex"),
  duration_s:totalSeconds
},null,2));
fs.writeFileSync("fixtures/captions.json",JSON.stringify(captionSource.captions,null,2));
console.log("TTS/TIMELINE PASS",JSON.stringify({language,engine,voice,sentences:sentences.length,chapters:chapters.length,speech_seconds:speechSeconds,total_seconds:totalSeconds}));
