import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const input = JSON.parse(fs.readFileSync(path.join(root,"fixtures/demo-input.json"),"utf8"));
const out = path.join(root,"artifacts",input.project_id);
fs.mkdirSync(out,{recursive:true});

const research = {
  project_id: input.project_id,
  sources: input.sources,
  claims: input.claims
};
fs.writeFileSync(path.join(out,"research.json"), JSON.stringify(research,null,2));

const segments = input.claims.map((claim, i) => ({
  id: `seg-${i+1}`,
  text: claim.statement,
  claim_ids: [claim.id]
}));
const script = {
  project_id: input.project_id,
  title: `${input.topic}：从关键词匹配到语义理解`,
  segments
};
fs.writeFileSync(path.join(out,"script.json"), JSON.stringify(script,null,2));

const claimIds = new Set(research.claims.map(c=>c.id));
const used = new Set();
const errors = [];
for (const seg of script.segments) {
  if (!seg.text.trim()) errors.push(`${seg.id}: empty text`);
  for (const id of seg.claim_ids) {
    if (!claimIds.has(id)) errors.push(`${seg.id}: unknown claim ${id}`);
    used.add(id);
  }
}
for (const claim of research.claims) {
  if (!used.has(claim.id)) errors.push(`unused claim ${claim.id}`);
}
const qa = {
  project_id: input.project_id,
  status: errors.length ? "FAIL" : "PASS",
  checks: {
    claim_references: errors.length === 0,
    non_empty_segments: script.segments.every(s=>s.text.trim().length>0),
    claim_coverage: research.claims.every(c=>used.has(c.id))
  },
  errors
};
fs.writeFileSync(path.join(out,"content-qa.json"), JSON.stringify(qa,null,2));
if (errors.length) process.exit(1);
console.log(JSON.stringify({stage:"P1",status:"PASS",outputs:["research.json","script.json","content-qa.json"],dir:out},null,2));
