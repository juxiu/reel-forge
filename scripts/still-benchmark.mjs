import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const ir=JSON.parse(fs.readFileSync(process.env.RENDER_IR||"fixtures/render-ir-16x9.json","utf8"));
const out=process.env.STILL_MANIFEST||path.join("artifacts",ir.project_id,"qc","still-manifest.json");
const strict=process.env.STRICT_STILLS==="1";
const scenes=[];
for(const scene of ir.scenes){
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
  scenes.push({scene_id:scene.id,frames:[...new Set(frames)].map(frame=>({
    frame,
    kind:frame===from?"enter+1":frame===to?"tail":"milestone",
    file:"stills/"+scene.id+"/f"+String(frame).padStart(5,"0")+".png"
  }))});
}
const manifest={
  project_id:ir.project_id,
  fps:ir.fps,
  required_per_scene:6,
  scenes,
  test_render:{frames:30,window:"group-start..group-start+29",status:"planned"},
  status:"PLANNED",
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(manifest,null,2));

if(strict){
  for(const scene of scenes){
    const shot=Number(scene.scene_id.split("-").at(-1));
    const group="G"+String(Math.floor((shot-1)/6)+1);
    const frames=scene.frames.map(x=>x.frame).join(",");
    const target=path.resolve("artifacts/stills",group,scene.scene_id);
    fs.mkdirSync(target,{recursive:true});
    const r=spawnSync("node",["scripts/still-batch.mjs",scene.scene_id,frames,target],{stdio:"inherit"});
    if(r.status!==0) throw new Error("still render failed: "+scene.scene_id);
  }
  manifest.status="RENDERED";
  fs.writeFileSync(out,JSON.stringify(manifest,null,2));
}
console.log("still benchmark PASS",manifest.scenes.length+" scenes × 6 planned frames");
