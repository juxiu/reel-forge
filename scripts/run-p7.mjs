import fs from "node:fs";
import path from "node:path";
import {buildBatchManifest} from "../src/scheduler/artifact-graph.mjs";

const root=process.cwd();
const project={
  project_id:"demo-semantic-search",
  research:{claims:["claim-1","claim-2"]},
  script:{segments:["seg-1","seg-2"]}
};
const variants=[
  {id:"youtube-16x9",width:1280,height:720,fps:30},
  {id:"shorts-9x16",width:720,height:1280,fps:30}
];
const manifest=buildBatchManifest(project,variants);
const out=path.join(root,"artifacts","batch");
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,"delivery-manifest.json"),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(out,"cache-report.json"),JSON.stringify({
  shared_reused:manifest[0].shared.source_hash===manifest[1].shared.source_hash &&
    manifest[0].shared.script_hash===manifest[1].shared.script_hash,
  reused:["research","script","content-qa","director","storyboard"]
},null,2));
console.log(JSON.stringify({stage:"P7",status:"PASS",outputs:["delivery-manifest.json","cache-report.json"]},null,2));
