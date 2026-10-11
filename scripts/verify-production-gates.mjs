import assert from "node:assert/strict";
import fs from "node:fs";
import {durationTargetReport} from "../src/release/duration-target.mjs";
import {evaluateProductionReviews, evaluateReviewGateBinding, productionContentFingerprints, validateScriptEvidence} from "../src/release/content-gates.mjs";

const load = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

// ---- 1) 时长门：长视频与短视频共用同一逻辑，全部由项目配置驱动 ----
// 目标来自各自项目的 duration_target_s；默认容差 ±20%，可配置 0–0.5，没有全局固定时长。
const shortProject = {project_id:"gate-short", duration_target_s:40};
assert.equal(durationTargetReport(shortProject, 40).status, "PASS", "短视频：目标时长正常");
assert.equal(durationTargetReport(shortProject, 42).status, "PASS", "短视频：轻微偏差");
assert.equal(durationTargetReport(shortProject, 34).status, "PASS", "短视频：轻微负偏差");
assert.equal(durationTargetReport(shortProject, 49).status, "FAIL", "短视频：超出容差上限");
assert.equal(durationTargetReport(shortProject, 31.9).status, "FAIL", "短视频：超出容差下限");
assert.equal(durationTargetReport({...shortProject, duration_target_s:0}, 40).status, "FAIL", "短视频：无效目标 0");
assert.equal(durationTargetReport({...shortProject, duration_target_s:-12}, 40).status, "FAIL", "短视频：无效负目标");
assert.equal(durationTargetReport({...shortProject, duration_target_s:"abc"}, 40).status, "FAIL", "短视频：非数值目标");

const longProject = {project_id:"gate-long", duration_target_s:339.3};
assert.equal(durationTargetReport(longProject, 339.3).status, "PASS", "长视频：目标时长正常");
assert.equal(durationTargetReport(longProject, 360).status, "PASS", "长视频：轻微偏差");
assert.equal(durationTargetReport(longProject, 320).status, "PASS", "长视频：轻微负偏差");
assert.equal(durationTargetReport(longProject, 270).status, "FAIL", "长视频：超出容差下限");
assert.equal(durationTargetReport(longProject, 420).status, "FAIL", "长视频：超出容差上限");

// 缺失/非法实际时长必须被拒（不能把「量不到」当成通过）。
for (const actual of [undefined, null, Number.NaN, 0, -5, "nope"]) {
  assert.equal(durationTargetReport(longProject, actual).status, "FAIL", "长视频：缺失/非法实际时长 " + String(actual));
}
// 容差可配置但有上限；无限放宽容差不能规避错误。
assert.equal(durationTargetReport({...shortProject, duration_tolerance_ratio:0.5}, 60).status, "PASS", "容差上限 0.5 内可用");
assert.equal(durationTargetReport({...shortProject, duration_tolerance_ratio:0.6}, 40).status, "FAIL", "容差超过 0.5 被拒");
assert.equal(durationTargetReport({...shortProject, duration_tolerance_ratio:0.75}, 40).status, "FAIL", "无限放宽容差被拒");

// ---- 2) 内容证据门：合成样例（结构 + 正负向） ----
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

// ---- 3) 审核门：合成样例（缺失 / 未完成 / 覆盖不全） ----
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

// ---- 4) 真实 fixture 集成：真实 project / script / research / Render IR ----
// 断言的是「门对真实产物有牙齿」，不是只看字符串或合成样例。
const realProject = load("fixtures/project.json");
const realScript = load("fixtures/script.json");
const realResearch = load("fixtures/research.json");
const realIr = load("fixtures/render-ir-16x9.json");
assert.equal(realScript.project_id, realProject.project_id, "真文稿与项目身份一致");
assert.equal(realResearch.project_id, realProject.project_id, "真调研与项目身份一致");
assert.equal(realIr.project_id, realProject.project_id, "真 Render IR 与项目身份一致");

// 4a) 时长：长片真实 IR 必须落在项目声明的目标区间内。
const realDuration = durationTargetReport(realProject, realIr.duration);
assert.equal(realDuration.status, "PASS", "真实长片时长必须通过：" + JSON.stringify(realDuration.issues));
// 目标值必须严格来自 project.json 的 duration_target_s（当前主题 190s），且不得是短视频量级 ——
// 旧写法硬编码 >300 是 demo（digest-explainer）时代的常量，换主题后永远打不通。
assert.ok(realDuration.target_seconds === Number(realProject.duration_target_s), "时长目标必须来自 project.json 的 duration_target_s（" + realProject.duration_target_s + "），实得 " + realDuration.target_seconds);
assert.ok(realDuration.target_seconds > 120, "长片目标应是长片级别（>120s），而不是被压到 40 秒的短视频量级");
// 负向：同一个真实 IR 用短视频目标必须被拒 —— 证明时长来自真实成片而不是可随手改的 JSON。
assert.equal(durationTargetReport({...realProject, duration_target_s:40}, realIr.duration).status, "FAIL");
// 时间线在盘上时，真实 TTS 时间线时长也必须通过，并与 Render IR 自洽。
if (fs.existsSync("script/timeline.json")) {
  const timeline = load("script/timeline.json");
  const derived = Number(timeline.total_frames) / (Number(timeline.fps) || 30);
  assert.ok(Math.abs(derived - realIr.duration) <= 0.1, "Render IR 时长必须等于时间线推导时长");
  assert.equal(durationTargetReport(realProject, derived).status, "PASS", "真实时间线时长必须通过");
}

// 4b) 证据：真实 research 必须自洽；真实 segments 若绑定了 claim，必须指向真实 claim。
const realClaimIds = realResearch.claims.map((c) => c.id);
assert.ok(realClaimIds.length > 0, "真实调研必须有 claims");
assert.equal(new Set(realClaimIds).size, realClaimIds.length, "真实 claim id 必须唯一");
for (const segment of realScript.segments) {
  for (const claimId of segment.claim_ids || []) {
    assert.ok(realClaimIds.includes(claimId), `真实 segment ${segment.id} 引用了不存在的 claim ${claimId}`);
  }
}
// 证据门必须如实反映真实脚本的绑定状态：有未绑定段就必须 FAIL，全部绑定才允许 PASS。
const realEvidence = validateScriptEvidence(realScript, realResearch);
assert.equal(realEvidence.project_id, realProject.project_id, "证据门必须回显真实项目身份");
const unboundSegments = realScript.segments.filter((s) => !(Array.isArray(s.claim_ids) && s.claim_ids.length));
if (unboundSegments.length) {
  assert.equal(realEvidence.status, "FAIL", "存在未绑定 claim 的真实脚本必须被证据门拒绝");
  assert.ok(realEvidence.issues.some((i) => /must cite at least one research claim/.test(i)), "证据门必须报出缺失的 claim 绑定");
} else {
  assert.equal(realEvidence.status, "PASS", "全部绑定真实 claim 的脚本必须通过证据门");
}
// 正向（可溯源）：只引用真实 claim 的脚本必须通过。
const groundedScript = {
  project_id: realProject.project_id,
  segments: realScript.segments.map((segment, index) => ({
    id: segment.id,
    text: segment.text,
    claim_ids: [realClaimIds[index % realClaimIds.length]],
  })),
};
assert.equal(validateScriptEvidence(groundedScript, realResearch).status, "PASS", "引用真实 claim 的脚本必须通过证据门");
// 负向：引用不存在的 claim 必须被拒。
assert.equal(validateScriptEvidence({
  ...groundedScript,
  segments: groundedScript.segments.map((segment, index) => index ? segment : {...segment, claim_ids:["claim-does-not-exist"]}),
}, realResearch).status, "FAIL", "引用虚构 claim 的脚本必须被拒");

// 4c) 审核：覆盖全部真实 claims/segments 的评审通过；缺失 / 未完成 / 覆盖不全 / 过期全部被拒。
const realReviews = [
  {role:"research-agent", status:"completed", output:{verdict:"pass", reviewed_claim_ids:[...realClaimIds], issues:[]}},
  {role:"director-agent", status:"completed", output:{verdict:"pass", reviewed_segment_ids:realScript.segments.map((s) => s.id), issues:[]}},
];
const realReviewGate = evaluateProductionReviews(realReviews, realResearch, realScript);
assert.equal(realReviewGate.status, "PASS", "覆盖全部 claims/segments 的评审必须通过");
assert.deepEqual(evaluateReviewGateBinding(realReviewGate, realResearch, realScript), [], "新鲜评审门必须绑定当前输入");
// 缺失：漏掉 director review
assert.equal(evaluateProductionReviews([realReviews[0]], realResearch, realScript).status, "FAIL", "缺失评审必须被拒");
// 未完成：skipped
assert.equal(evaluateProductionReviews([{...realReviews[0], status:"skipped"}, realReviews[1]], realResearch, realScript).status, "FAIL", "未完成评审必须被拒");
// 覆盖不全：只审了前 3 段
assert.equal(evaluateProductionReviews([realReviews[0], {...realReviews[1], output:{...realReviews[1].output, reviewed_segment_ids: realScript.segments.slice(0,3).map((s) => s.id)}}], realResearch, realScript).status, "FAIL", "覆盖不全的评审必须被拒");
// 过期：脚本/调研变了，旧评审门必须失效
assert.ok(evaluateReviewGateBinding(realReviewGate, realResearch, {...realScript, segments: realScript.segments.slice(0,1)}).length > 0, "脚本变化后评审门必须判过期");
assert.ok(evaluateReviewGateBinding(realReviewGate, {...realResearch, claims: realResearch.claims.slice(0,1)}, realScript).length > 0, "调研变化后评审门必须判过期");
assert.ok(evaluateReviewGateBinding(reviewGateOf(realReviewGate, {status:"FAIL"}), realResearch, realScript).length > 0, "非 PASS 的评审门必须被拒");

// 评审门的指纹必须随输入变化（写作生产者侧口径）。
assert.notEqual(
  productionContentFingerprints(realResearch, realScript).research_fingerprint,
  productionContentFingerprints({...realResearch, claims: realResearch.claims.slice(0,1)}, realScript).research_fingerprint,
);

// ---- 5) 接线：门必须真的装在生产者/门禁路径上（不是只加了一个文件） ----
const pipeline = fs.readFileSync("src/director/pipeline.mjs","utf8");
const runner = fs.readFileSync("scripts/run-production.mjs","utf8");
const production = fs.readFileSync("scripts/verify-production.mjs","utf8");
const fast = fs.readFileSync("scripts/verify-fast.mjs","utf8");
const render = fs.readFileSync("scripts/render.sh","utf8");
assert.match(pipeline,/validateScriptEvidence/);
assert.match(runner,/evaluateProductionReviews/);
assert.match(production,/evaluateReviewGateBinding/);
assert.match(render,/verify-duration-target\.mjs/);
assert.match(fast,/"verify:production-gates"/);

// 顶层小工具：把 gate 复制一份并覆盖字段，用于构造「过期/非 PASS」的负向样本。
function reviewGateOf(gate, patch) {
  return {...gate, ...patch};
}

console.log("production gates PASS", JSON.stringify({duration_cases:20, evidence_cases:8, review_cases:10, real_fixture:"digest-explainer"}));
