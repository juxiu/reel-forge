import fs from "node:fs";
import path from "node:path";
import {edgeTts} from "../src/providers/tts/edge.mjs";
import {captionsFromWords} from "../src/captions/pipeline.mjs";

const project=JSON.parse(fs.readFileSync("fixtures/project.json","utf8"));
const script=JSON.parse(fs.readFileSync("fixtures/script.json","utf8"));
const out="artifacts/demo-production/audio";
const text=script.segments.map(s=>s.text).join("\n");
const voice=project.language==="zh"?"zh-CN-YunxiNeural":"en-US-GuyNeural";
const result=await edgeTts({text,voice,outDir:out});
fs.mkdirSync("public",{recursive:true});
fs.copyFileSync(result.audio,"public/audio.mp3");
const words=JSON.parse(fs.readFileSync(result.timings,"utf8")).words;
const captions=captionsFromWords(words).captions;
fs.writeFileSync("fixtures/captions.json",JSON.stringify({captions},null,2));
const counts=script.segments.map(s=>s.text.trim().split(/\s+/).filter(Boolean).length);
const total=counts.reduce((a,b)=>a+b,0);
let cursor=0;const scenes=[];
for(let i=0;i<script.segments.length;i++){cursor+=counts[i];const boundary=i===script.segments.length-1?result.manifest.duration_s:(words[Math.max(0,Math.min(words.length-1,Math.round(cursor/total*words.length)-1))]?.end||result.manifest.duration_s);const start=i===0?0:scenes.at(-1).start+scenes.at(-1).duration;scenes.push({id:"scene-"+String(i+1).padStart(3,"0"),start,duration:Math.max(.5,boundary-start),elements:[{id:"hero",type:"card",text:script.segments[i].text}],motion:[{type:"enter",preset:"rise"},{type:i%2?"camera":"transform",preset:i%2?"pan":"travel"}]});}
for(const ratio of [["16x9",1280,720],["9x16",720,1280]])fs.writeFileSync("fixtures/render-ir-"+ratio[0]+".json",JSON.stringify({version:"0.3",project_id:project.project_id,width:ratio[1],height:ratio[2],fps:30,duration:result.manifest.duration_s,scenes},null,2));
console.log("media prepared",result.manifest);
