import fs from "node:fs";
import path from "node:path";
import {edgeTts} from "../src/providers/tts/edge.mjs";
import {captionsFromWords} from "../src/captions/pipeline.mjs";

const lines=fs.readFileSync("script/narration.txt","utf8").split(/\r?\n/);
const items=[];let chapter=0;let title="";let pendingGap=0;let paraBreak=false;
for(const raw of lines){
  const line=raw.trim();
  if(!line){if(items.length&&items.at(-1).type==="sentence"){items.at(-1).paragraphEnd=true;paraBreak=true;}continue;}
  const cm=line.match(/^# CHAPTER\s+(\d+)\s+(.+)$/i);
  if(cm){chapter=Number(cm[1]);title=cm[2].trim();items.push({type:"chapter",chapter,title});paraBreak=false;continue;}
  const gm=line.match(/^## gap\s+(\d+)$/i);if(gm){pendingGap+=Number(gm[1]);continue;}
  if(line.startsWith("#"))continue;
  items.push({type:"sentence",chapter,text:line,gapBefore:pendingGap+(paraBreak?20:0),paragraphEnd:false});pendingGap=0;paraBreak=false;
}
if(items.some(x=>x.type==="sentence"))items.filter(x=>x.type==="sentence").at(-1).paragraphEnd=true;
const project=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
const text=items.filter(x=>x.type==="sentence").map(x=>x.text.replaceAll("|","")).join(" ");
const outDir=path.join("artifacts",project.project_id,"audio");
const result=await edgeTts({text,voice:project.language==="zh"?"zh-CN-YunxiNeural":"en-US-JennyNeural",outDir});
fs.mkdirSync("public",{recursive:true});fs.copyFileSync(result.audio,"public/audio.mp3");
const words=JSON.parse(fs.readFileSync(result.timings,"utf8")).words;
if(!words.length)throw new Error("no real word timing");
const normalized=text.replace(/[^\p{L}\p{N}]+/gu," ").trim().split(/\s+/);
let wi=0;let cursor=0;const sentences=[];const captions=[];
for(const item of items){
  if(item.type==="chapter")continue;
  const clean=item.text.replaceAll("|","").trim();
  const tokens=clean.replace(/[^\p{L}\p{N}]+/gu," ").trim().split(/\s+/).filter(Boolean);
  const startWord=wi;wi+=tokens.length;
  const start=startWord<words.length?words[startWord].start:cursor;
  const endWord=Math.min(words.length-1,Math.max(startWord,startWord+tokens.length-1));
  const end=words[endWord]?.end??start;
  const blocks=item.text.split("|").map(x=>x.trim()).filter(Boolean);
  const blockWords=Math.max(1,Math.floor(tokens.length/Math.max(1,blocks.length)));
  const subs=[];let offset=0;
  for(let i=0;i<blocks.length;i++){const a=start+((tokens.slice(0,offset).length)/Math.max(1,tokens.length))*(end-start);offset+=i===blocks.length-1?tokens.length-offset:blockWords;const b=i===blocks.length-1?end:start+(offset/Math.max(1,tokens.length))*(end-start);subs.push({from:Math.round(a*30)+1,to:Math.max(Math.round(a*30)+1,Math.round(b*30)),text:blocks[i]});}
  sentences.push({id:"S"+String(sentences.length+1).padStart(2,"0"),chapter:chapter,from:Math.round((start)*30)+1,to:Math.round(end*30),text:item.text,para:item.paragraphEnd,subs});
  cursor=end;
}
const firstChapter=items.find(x=>x.type==="chapter");const chapters=firstChapter?[{n:firstChapter.chapter,title:firstChapter.title,from:1}]:[{n:1,title:"",from:1}];
const total_frames=Math.max(1,Math.round(result.manifest.duration_s*30)+90);
const timeline={fps:30,total_frames,engine:"edge-tts",voice:result.manifest.voice,rate:result.manifest.rate,chapters,sentences};
fs.mkdirSync("script",{recursive:true});fs.writeFileSync("script/timeline.json",JSON.stringify(timeline,null,2));
fs.writeFileSync("script/timeline.md",sentences.map(s=>"| "+s.id+" | "+s.from+"–"+s.to+" | "+s.text+" |").join("\n"));
fs.writeFileSync("fixtures/captions.json",JSON.stringify(captionsFromWords(words).captions,null,2));
fs.writeFileSync(path.join("artifacts",project.project_id,"audio","timeline-source.json"),JSON.stringify(words,null,2));
console.log("TTS/TIMELINE PASS",result.manifest);
