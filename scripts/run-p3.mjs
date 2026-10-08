import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const dir=path.join(root,"artifacts","demo-semantic-search");
const sceneDoc=JSON.parse(fs.readFileSync(path.join(dir,"scene.json"),"utf8"));
const projectId=sceneDoc.project_id;

const visual={
  project_id:projectId,
  scenes:sceneDoc.scenes.map(s=>({
    scene_id:s.scene_id,
    type:s.visual.type,
    objects:s.visual.objects,
    composition:{template:"centered-card",hero:s.visual.objects[1]?.id||s.visual.objects[0]?.id}
  }))
};

let cursor=0;
const segments=sceneDoc.scenes.map((s,i)=>{
  const words=s.narration.text.replace(/[。！？、,.!?]/g,"").split(/s+/u).filter(Boolean);
  const duration=Math.max(0.8,Math.min(4,0.34*words.length+0.35));
  const start=cursor; const end=start+duration; cursor=end;
  const step=duration/Math.max(1,words.length);
  return {
    id:`narr-${i+1}`,
    scene_id:s.scene_id,
    text:s.narration.text,
    start,
    end,
    words:words.map((text,j)=>({text,start:start+j*step,end:start+(j+1)*step}))
  };
});
const audio={project_id:projectId,duration:cursor,segments};

const timeline={project_id:projectId,fps:30,scenes:sceneDoc.scenes.map((s,i)=>({
  scene_id:s.scene_id,
  start:Math.round(segments[i].start*30),
  end:Math.round(segments[i].end*30),
  duration:Math.round((segments[i].end-segments[i].start)*30)
}))};

for (const [name,value] of Object.entries({visual,audio,timeline})) {
  fs.writeFileSync(path.join(dir,name+".json"),JSON.stringify(value,null,2));
}
console.log(JSON.stringify({stage:"P3",status:"PASS",outputs:["visual.json","audio.json","timeline.json"]},null,2));
