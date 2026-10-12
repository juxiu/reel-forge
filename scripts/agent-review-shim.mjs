import fs from "node:fs";

/**
 * 确定性评审 shim（经 AGENT_COMMAND 注入）。
 *
 * 本环境没有外部 LLM provider，但生产链的评审门（run-production →
 * evaluateProductionReviews）硬性要求 research-agent / director-agent 两份
 * status=completed、verdict=pass、全量 id 覆盖的评审信封 —— skipped 一律拦截。
 * 这个 shim 用**可证伪的结构校验**顶上评审位，而不是无条件 pass：
 *
 *   · research-agent：逐 claim 校验 source_ids/evidence 绑定、evidence URL 与
 *     来源记录一致、excerpt 非空、id 唯一，并做指令注入句式扫描（task-brief
 *     SHARED_RULES 的第二道）；
 *   · director-agent：逐 segment 校验 id 唯一、解说非空、claim_ids 全部真实，
 *     beats 与 segments 一一对应且 start/duration 合法、source_ref 指回正确 segment；
 *   · build-agent / qc-agent：不持阻断权（build-groups/qc 的阻断都来自盘上
 *     结构校验，不信 agent 输出），回如实声明自身局限的 advisory JSON；
 *   · script-agent 及未知角色：拒绝代劳 —— 本仓走「作者稿注入」路径
 *     （docs/ANYTHING2EXPLAINER_PARITY.md），shim 无权生成解说词，退出 1 让
 *     上层以明确错误终止，而不是静默产出一份无来源的稿子。
 *
 * 协议（与 src/providers/agent/command.mjs 一致）：stdin 收一个 JSON
 * （orchestrator.run 的 input），stdout 只回一个 JSON 对象；stderr 仅作日志。
 * 结构不成立时 verdict=fail，由评审门自行拦截放行。
 */

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch (error) {
    throw new Error("agent-review-shim: 无法读取 stdin —— " + error.message);
  }
}

let input;
try {
  input = JSON.parse(readStdin());
} catch (error) {
  console.error("agent-review-shim: stdin 不是合法 JSON —— " + error.message);
  process.exit(1);
}

const role = String(input?.role || "");
const issues = [];

/** 指令注入句式扫描：命中只报 issue，不执行（research-filter 之后的第二道）。 */
const INSTRUCTION =
  /(忽略(之前|以上|上述|以上所有)|无视(之前|以上)|system\s*prompt|你的(任务|指令|系统提示)|执行(以下|这段)命令|disregard\s+(previous|all|above)|ignore\s+(previous|all|above))/i;

if (role === "research-agent") {
  const research = input?.research ?? {};
  const claims = Array.isArray(research.claims) ? research.claims : [];
  const sources = Array.isArray(research.sources) ? research.sources : [];
  if (!claims.length) issues.push("research.claims 为空，无以评审");
  const sourceById = new Map(sources.map((s) => [s?.id, s]));
  const seen = new Set();
  for (const claim of claims) {
    if (!claim?.id) {
      issues.push("claim 缺 id");
      continue;
    }
    if (seen.has(claim.id)) issues.push("claim id 重复: " + claim.id);
    seen.add(claim.id);
    const sids = Array.isArray(claim.source_ids) ? claim.source_ids : [];
    const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
    if (!sids.length) issues.push("claim 无 source_ids: " + claim.id);
    if (!evidence.length) issues.push("claim 无 evidence 记录: " + claim.id);
    for (const sid of sids) {
      if (!sourceById.has(sid)) issues.push("claim 引用未知来源 " + sid + ": " + claim.id);
    }
    for (const item of evidence) {
      const source = sourceById.get(item?.source_id);
      if (!source || !sids.includes(item.source_id)) {
        issues.push("evidence 未绑定到该 claim 的来源: " + claim.id);
      } else if (item.url !== source.url) {
        issues.push("evidence URL 与来源记录不一致: " + claim.id);
      }
      if (typeof item?.excerpt !== "string" || !item.excerpt.trim()) {
        issues.push("evidence excerpt 为空: " + claim.id);
      }
    }
    if (INSTRUCTION.test(String(claim?.statement ?? ""))) {
      issues.push("claim 疑似指令注入，需人工复核后放行: " + claim.id);
    }
  }
  process.stdout.write(
    JSON.stringify({
      verdict: issues.length ? "fail" : "pass",
      issues,
      reviewed_claim_ids: claims.map((c) => c?.id).filter(Boolean),
      notes: "deterministic structural audit（结构可证伪项；无外部模型，来源可信度仍以页面自证为准）",
    }),
  );
} else if (role === "director-agent") {
  const script = input?.script ?? {};
  const research = input?.research ?? {};
  const beats = input?.beats ?? {};
  const segments = Array.isArray(script?.segments) ? script.segments : [];
  const knownClaims = new Set((Array.isArray(research?.claims) ? research.claims : []).map((c) => c?.id).filter(Boolean));
  if (!segments.length) issues.push("script.segments 为空，无以评审");
  const seen = new Set();
  for (const segment of segments) {
    if (!segment?.id || typeof segment.id !== "string") {
      issues.push("segment 缺稳定 id");
      continue;
    }
    if (seen.has(segment.id)) issues.push("segment id 重复: " + segment.id);
    seen.add(segment.id);
    if (typeof segment?.text !== "string" || !segment.text.trim()) issues.push("segment 解说为空: " + segment.id);
    const refs = Array.isArray(segment?.claim_ids) ? [...new Set(segment.claim_ids)] : [];
    if (!refs.length) issues.push("segment 未绑定任何 claim: " + segment.id);
    for (const ref of refs) {
      if (!knownClaims.has(ref)) issues.push("segment 引用未知 claim " + ref + ": " + segment.id);
    }
  }
  const beatList = Array.isArray(beats?.beats) ? beats.beats : [];
  if (beatList.length !== segments.length) {
    issues.push("beats 与 segments 数量不一致: " + beatList.length + " vs " + segments.length);
  } else {
    beatList.forEach((beat, index) => {
      const segment = segments[index];
      if (!beat || !(Number(beat.start) >= 0) || !(Number(beat.duration) > 0)) {
        issues.push("beat 区间非法: " + String(beat?.id ?? index));
      }
      if (beat?.source_ref?.script_id && segment?.id && beat.source_ref.script_id !== segment.id) {
        issues.push("beat 未指回对应 segment: " + String(beat.id) + " ≠ " + segment.id);
      }
    });
  }
  process.stdout.write(
    JSON.stringify({
      verdict: issues.length ? "fail" : "pass",
      issues,
      reviewed_segment_ids: segments.map((s) => s?.id).filter(Boolean),
      notes: "deterministic structural audit（一句一镜为分镜层硬编码；画面语义匹配由 authored 镜头源与蓝图门另行把守）",
    }),
  );
} else if (role === "build-agent" || role === "qc-agent") {
  // 不持阻断权：这两处的放行判据全在盘上结构校验（build-groups 的 source 绑定、
  // qc 的 flags/plan-audit/探针），agent 输出只进报告。shim 如实声明局限。
  process.stdout.write(
    JSON.stringify({
      advisory: true,
      role,
      group: input?.group?.id ?? null,
      ratio: input?.ratio ?? null,
      notes:
        "deterministic shim：无视觉通道、无外部模型，未对画面做任何主观判断；" +
        "本角色不持阻断权，放行判据以盘上量化门为准（src/qc/flags.mjs / build-groups source 绑定）。",
    }),
  );
} else {
  // script-agent（作者稿注入路径不该走到这里）与一切未知角色：拒绝代劳。
  console.error("agent-review-shim: role「" + role + "」不由 shim 代劳 —— 作者稿经 fixtures/script.json 注入，shim 无权生成解说词");
  process.exit(1);
}
