import assert from "node:assert/strict";
import fs from "node:fs";
import {durationTargetReport} from "../src/release/duration-target.mjs";
import {evaluateProductionReviews, productionContentFingerprints, validateScriptEvidence} from "../src/release/content-gates.mjs";

const project = {project_id:"audit-test", duration_target_s:40};
const inRange = durationTargetReport(project, 40);
assert.equal(inRange.status, "PASS");
assert.equal(durationTargetReport(project, 48).status, "PASS");
assert.equal(durationTargetReport(project, 32).status, "PASS");
assert.equal(durationTargetReport(project, 49).status, "FAIL");
assert.equal(durationTargetReport(project, 31.9).status, "FAIL");
assert.equal(durationTargetReport({...project, duration_tolerance_ratio:0.75}, 40).status, "FAIL");
assert.equal(durationTargetReport({...project, duration_target_s:0}, 40).status, "FAIL");
assert.equal(durationTargetReport(project, Number.NaN).status, "FAIL");
assert.equal(durationTargetReport({project_id:"legacy"}, 40).status, "FAIL");

const research = {
  project_id:"audit-test",
  sources:[{id:"source-1", url:"https://example.test/source", content_hash:"abc"}],
  claims:[{
    id:"claim-001", statement:"A grounded factual statement.",
    source_ids:["source-1"],
    evidence:[{source_id:"source-1", url:"https://example.test/source", excerpt:"A grounded factual statement."}],
  }],
};
const script = {
  project_id:"audit-test",
  segments:[{id:"segment-001", text:"A grounded factual statement.", claim_ids:["claim-001"]}],
};
assert.equal(validateScriptEvidence(script,research).status,"PASS");
assert.equal(validateScriptEvidence({...script,segments:[{...script.segments[0],claim_ids:[]}]},research).status,"FAIL");
assert.equal(validateScriptEvidence({...script,segments:[{...script.segments[0],claim_ids:["claim-missing"]}]},research).status,"FAIL");
assert.equal(validateScriptEvidence({...script,segments:[{...script.segments[0],id:""}]},research).status,"FAIL");
assert.equal(validateScriptEvidence(script,{...research,claims:[{...research.claims[0],evidence:[] }]}).status,"FAIL");
assert.equal(validateScriptEvidence(script,{...research,project_id:"other"}).status,"FAIL");

const reviews = [
  {role:"research-agent",status:"completed",output:{verdict:"pass",reviewed_claim_ids:["claim-001"],issues:[]}},
  {role:"director-agent",status:"completed",output:{verdict:"pass",reviewed_segment_ids:["segment-001"],issues:[]}},
];
assert.equal(evaluateProductionReviews(reviews,research,script).status,"PASS");
assert.equal(evaluateProductionReviews([{...reviews[0],status:"skipped"},reviews[1]],research,script).status,"FAIL");
assert.equal(evaluateProductionReviews([{...reviews[0],output:{...reviews[0].output,verdict:"fail"}},reviews[1]],research,script).status,"FAIL");
assert.equal(evaluateProductionReviews([{...reviews[0],output:{...reviews[0].output,issues:[{claim_id:"claim-001",reason:"unsupported"}]}},reviews[1]],research,script).status,"FAIL");
assert.equal(evaluateProductionReviews([{...reviews[0],output:{...reviews[0].output,reviewed_claim_ids:[]}},reviews[1]],research,script).status,"FAIL");
assert.equal(evaluateProductionReviews([reviews[0]],research,script).status,"FAIL");
const fingerprints = productionContentFingerprints(research,script);
assert.equal(typeof fingerprints.research_fingerprint,"string");
assert.equal(fingerprints.research_fingerprint.length,64);
assert.notEqual(fingerprints.script_fingerprint,productionContentFingerprints(research,{...script,segments:[{...script.segments[0],text:"modified"}]}).script_fingerprint);

const pipeline = fs.readFileSync("src/director/pipeline.mjs","utf8");
const runner = fs.readFileSync("scripts/run-production.mjs","utf8");
const fast = fs.readFileSync("scripts/verify-fast.mjs","utf8");
const render = fs.readFileSync("scripts/render.sh","utf8");
assert.match(pipeline,/validateScriptEvidence/);
assert.match(runner,/evaluateProductionReviews/);
assert.match(runner,/agent-review-gate\.json/);
assert.match(render,/verify-duration-target\.mjs/);
assert.match(fast,/"verify:production-gates"/);

console.log("production gates PASS", JSON.stringify({duration_cases:9, evidence_cases:6, review_cases:6}));
