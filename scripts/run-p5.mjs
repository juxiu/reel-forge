import fs from "node:fs";
import path from "node:path";
import {sceneToRenderIR,renderIRToHyperFramesHtml} from "../src/backends/hyperframes-adapter.mjs";

const root=process.cwd();
const fixture=JSON.parse(fs.readFileSync(path.join(root,"fixtures/remotion-scenes.json"),"utf8"));
const scenes=fixture.scenes.flatMap(scene=>sceneToRenderIR(scene).scenes);
const ir={version:"0.1",width:1280,height:720,fps:30,scenes};
const out=path.join(root,"artifacts","hyperframes-eval");
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,"render-ir.json"),JSON.stringify(ir,null,2));
fs.writeFileSync(path.join(out,"preview.html"),renderIRToHyperFramesHtml(ir));
console.log(JSON.stringify({stage:"P5",status:"PASS",outputs:["render-ir.json","preview.html"],scene_count:scenes.length},null,2));
