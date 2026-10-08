import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const run=spawnSync(process.execPath,["scripts/run-p2.mjs"],{encoding:"utf8"});
if(run.status!==0){process.stderr.write(run.stderr||run.stdout);process.exit(run.status||1);}
spawnSync(process.execPath,["scripts/run-p3.mjs"],{stdio:"inherit"});

const dir=path.join(process.cwd(),"artifacts","demo-semantic-search");
const visual=JSON.parse(fs.readFileSync(path.join(dir,"visual.json"),"utf8"));
const audio=JSON.parse(fs.readFileSync(path.join(dir,"audio.json"),"utf8"));
const timeline=JSON.parse(fs.readFileSync(path.join(dir,"timeline.json"),"utf8"));
if(!visual.scenes.length||!audio.segments.length||!timeline.scenes.length) throw new Error("P3 did not produce all outputs");
for(const s of audio.segments){ if(!(s.end>s.start)||!s.words.length) throw new Error("invalid audio alignment for "+s.id); }
for(let i=1;i<timeline.scenes.length;i++){ if(timeline.scenes[i].start<timeline.scenes[i-1].end) throw new Error("timeline overlap"); }
const negative={...audio,segments:audio.segments.map(x=>({...x,start:x.end}))};
if(!negative.segments.some(x=>!(x.end>x.start))) throw new Error("negative audio timing regression did not detect invalid segment");
console.log(JSON.stringify({stage:"P3",status:"PASS",outputs:["visual.json","audio.json","timeline.json"],negative_regression:"PASS"},null,2));
