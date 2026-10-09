import fs from "node:fs";
import path from "node:path";
import {run as spawn} from "../src/runtime/spawn.mjs";
import {STILL_FRAMES_PER_SCENE, groupIdOf} from "../src/build/limits.mjs";
import {isHighlightShot, stillFramesMin, extendStillFrames} from "../src/build/still-budget.mjs";

const ir=JSON.parse(fs.readFileSync(process.env.RENDER_IR||"fixtures/render-ir-16x9.json","utf8"));
const out=process.env.STILL_MANIFEST||path.join("artifacts",ir.project_id,"qc","still-manifest.json");
const strict=process.env.STRICT_STILLS==="1";
const scenes=[];
for(const scene of ir.scenes){
  const shot=Number(scene.id.split("-").at(-1));
  const from=Math.round(scene.start*ir.fps)+1;
  const to=Math.max(from,Math.round((scene.start+scene.duration)*ir.fps));
  const span=Math.max(1,to-from);
  const frames=[
    from,
    Math.min(to,from+1),
    Math.min(to,from+Math.round(span*.25)),
    Math.min(to,from+Math.round(span*.55)),
    Math.max(from,to-8),
    to,
  ];
  // 基础 6 点是下限；`SHOT_RECIPE.highlight === true` 的镜头补到高光下限（10）。
  // 「是不是高光」与门那边用的是同一个实现（src/build/still-budget.mjs），不在这里再判一遍。
  // 下限只取一次并存进 minFrames：出的帧与自报的 required_frames 必须来自同一个数，
  // 否则 manifest 可以写着 10、实际只出 6 而没人发现。
  const highlight=isHighlightShot(shot);
  const minFrames=stillFramesMin(shot);
  const picked=extendStillFrames(frames, minFrames);
  scenes.push({scene_id:scene.id,highlight,required_frames:minFrames,frames:picked.map(frame=>({
    frame,
    kind:frame===from?"enter+1":frame===to?"tail":"milestone",
    file:"stills/"+scene.id+"/f"+String(frame).padStart(5,"0")+".png"
  }))});
}
const manifest={
  project_id:ir.project_id,
  fps:ir.fps,
  required_per_scene:STILL_FRAMES_PER_SCENE,
  scenes,
  test_render:{frames:30,window:"group-start..group-start+29",status:"planned"},
  status:"PLANNED",
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(manifest,null,2));

if(strict){
  for(const scene of scenes){
    const shot=Number(scene.scene_id.split("-").at(-1));
    const group=groupIdOf(shot);
    const frames=scene.frames.map(x=>x.frame).join(",");
    const target=path.resolve("artifacts/stills",group,scene.scene_id);
    fs.mkdirSync(target,{recursive:true});
    const r=spawn("node",["scripts/still-batch.mjs",scene.scene_id,frames,target],{stdio:"inherit"});
    if(r.error) throw new Error("still batch 起不来: "+r.error);
    if(r.status!==0) throw new Error("still render failed: "+scene.scene_id+" status="+(r.status??"signal"));
  }
  manifest.status="RENDERED";
  fs.writeFileSync(out,JSON.stringify(manifest,null,2));
}
const planned=[...new Set(scenes.map(scene=>scene.frames.length))].sort((a,b)=>a-b);
console.log("still benchmark PASS",scenes.length+" scenes × "+planned.join("/")+" planned frames（下限 "+STILL_FRAMES_PER_SCENE+"，高光 "+scenes.filter(scene=>scene.highlight).length+" 镜）");
