import fs from "node:fs";
import {STILL_FRAMES_HIGHLIGHT_MIN, STILL_FRAMES_PER_SCENE} from "../src/build/limits.mjs";
import {stillFramesMin} from "../src/build/still-budget.mjs";
const project=JSON.parse(fs.readFileSync(process.env.PROJECT_FILE||"fixtures/project.json","utf8"));
const file="artifacts/"+project.project_id+"/qc/still-manifest.json";
if(!fs.existsSync(file)) throw new Error("still benchmark manifest missing");
const report=JSON.parse(fs.readFileSync(file,"utf8"));
// 判**下限**而不是「恰好 6」：非高光镜头 ≥6，高光镜头 ≥10 —— 与生产者同一个实现
// （`src/build/still-budget.mjs`），上游 `agent-build-rules.md:51` 要的就是「至少 6 张 / 高光 ≥10 张」。
// 判恰好会把这条要求直接打回（旧版就是这样，见 docs/knowledge/agent-protocol.md §4）。
// 上限刻意不判：上游没有给上限，本仓库也不发明一个 —— 多出的帧只会让人多看，不会让计划失效。
for(const scene of report.scenes||[]) {
  const shot=Number(String(scene.scene_id).split("-").at(-1));
  if(!Number.isInteger(shot)||shot<1) throw new Error("scene_id 取不出 1-based 镜头号，无法判 still 下限: "+scene.scene_id);
  const min=stillFramesMin(shot);
  const count=scene.frames?.length ?? 0;
  if(count<min) throw new Error("still plan must contain at least "+min+" frames: "+scene.scene_id+"（实有 "+count+"）");
  if(scene.required_frames!==undefined && scene.required_frames!==min) {
    throw new Error(scene.scene_id+": manifest 自报 required_frames="+scene.required_frames+"，与镜头源文件算出的下限 "+min+" 不一致");
  }
  const values=scene.frames.map(item=>item.frame);
  if(values.some((v,i)=>i&&v<values[i-1])) throw new Error("still frames not ordered: "+scene.scene_id);
}
if(report.test_render?.frames!==30) throw new Error("30-frame test render contract missing");
const counts=(report.scenes||[]).map(scene=>scene.frames.length);
console.log("still benchmark PASS",(report.scenes||[]).length+" scenes，帧数 "+[...new Set(counts)].sort((a,b)=>a-b).join("/")+"（基础下限 "+STILL_FRAMES_PER_SCENE+"，高光镜头下限 "+STILL_FRAMES_HIGHLIGHT_MIN+"）");
