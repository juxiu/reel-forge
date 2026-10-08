import fs from "node:fs";
const file="fixtures/render-ir-16x9.json";
const ir=JSON.parse(fs.readFileSync(file,"utf8"));
const specs=Array.isArray(ir.footage)?ir.footage:[];
if(specs.length>1) throw new Error("FootageTrack allows at most one active footage layer per render IR");
for(const spec of specs){
  if(!/^assets\//.test(String(spec.src||""))) throw new Error("footage source must be under public/assets: "+spec.src);
  if(!(spec.to>=spec.from&&spec.srcFrom>=0)) throw new Error("invalid footage range");
}
console.log("footage PASS",specs.length);
