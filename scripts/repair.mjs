import fs from "node:fs";
import path from "node:path";
import {repairRenderIRWithReport, makeRepairPlan} from "../src/repair/engine.mjs";

/**
 * Repair：把 QC 报告落到 render-IR 上，并留下三份账（repair-plan / source-repair / status）。
 *
 * 「只写 render-IR」是设计决定，不是偷懒：渲染层读的就是 fixtures/render-ir-{16x9,9x16}.json，
 * 所以「改了 IR」= 「下一帧真的不一样」。别的文件都不满足这条，理由写在 writeSourceRepairAudit 上面。
 */

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const plansDir = path.join("artifacts", project.project_id, "repair");
fs.mkdirSync(plansDir, {recursive: true});

const qcFile = path.join("artifacts", project.project_id, "qc", "report.json");
if (!fs.existsSync(qcFile)) throw new Error("QC report missing; run npm run qc first");

const report = JSON.parse(fs.readFileSync(qcFile, "utf8"));
const maxRetries = Number(process.env.REPAIR_RETRIES || 2);
if (!Number.isInteger(maxRetries) || maxRetries < 1) throw new Error("REPAIR_RETRIES must be positive");

// 源层只记账，不动文件。
//
// 这一段以前会按 issue 类型去 bump artifacts/<pid>/beats.json 的 camera.amount / hero.size /
// composition.hero_weight，看起来像「把问题在源头改掉了」。三个事实说明那是假修复：
//   1) beats.json 是生成物 —— materialize-ir.mjs 和 verify-visual.mjs 每轮都用
//      buildBeatGraph(script, timeline) 重写它，写回去的值下一轮就被覆盖；
//   2) 就算没人重写，beatToScene 也不读 beat.camera 和 beat.hero（motion 由固定三元组生成、
//      hero 文案取 segment.text），改这两个字段画面一个像素都不动 —— 和已经删掉的 caption_safe
//      同一类：改一个渲染层不读的字段冒充修复；
//   3) 它还按类型给 freeze / visual_regression_fail 一律加运镜，正是基准点名的 decorative-motion
//      反例（IR 层明确拒绝的那种修法，源层却在偷偷做）。
// 所以这里记的是「要真落地得改哪份人手写的源文件」，由人或 agent 去改。
// repair 自己只保证一件事：status.json 的 changed_nodes 全部来自渲染层确实会读的字段。
const SOURCE_FILES = {
  plan: ["fixtures/script.json", "script/storyboard_src.md"],
  pixel: ["script/storyboard_src.md", "public/（素材与图元）"],
};

function sourceDemandsOf(plan) {
  return plan.escalations.map((issue) => ({
    node: issue.node,
    type: issue.type,
    layer: issue.layer,
    fix: issue.fix || null,
    detail: issue.detail || null,
    hint: issue.hint || null,
    must_change: SOURCE_FILES[issue.layer] || SOURCE_FILES.pixel,
    changed: false,
  }));
}

function writeSourceRepairAudit(entries) {
  fs.writeFileSync(
    path.join(plansDir, "source-repair.json"),
    JSON.stringify({
      version: "0.2",
      // 交付门（verify-delivery / verify-production）认这个文件名和 version："0.2" + entries 数组
      // 这两个形状不能动；语义已经改成「源层待办清单」，所以 writeback_count 恒为 0 是真话，
      // 不是坏掉的计数器。
      source: "fixtures/script.json + script/storyboard_src.md",
      generated_files_not_repaired: ["artifacts/" + project.project_id + "/beats.json"],
      why_no_writeback: "beats.json 每轮由 buildBeatGraph(script, timeline) 重生成，且 beatToScene 不读 beat.camera / beat.hero —— 写回它画面不会变；源层改动必须落在人写的 script/storyboard_src.md 与 fixtures/script.json 上。",
      writeback_count: 0,
      entries,
    }, null, 2),
  );
}

if (report.status === "PASS") {
  fs.writeFileSync(path.join(plansDir, "repair-plan.json"), JSON.stringify({maxRetries, status: "not-needed", issues: [], nodes: []}, null, 2));
  writeSourceRepairAudit([]);
  fs.writeFileSync(path.join(plansDir, "status.json"), JSON.stringify({status: "not-needed", repaired_at: new Date().toISOString(), changed_nodes: [], source_writeback_count: 0, source_demands: 0, by_ratio: []}, null, 2));
  console.log("repair SKIP: QC already PASS");
  process.exit(0);
}

const plan = makeRepairPlan(report, maxRetries);
fs.writeFileSync(path.join(plansDir, "repair-plan.json"), JSON.stringify(plan, null, 2));
const demands = sourceDemandsOf(plan);
writeSourceRepairAudit(demands);

const repairs = [];
const material = [];
const traceOnly = [];
const escalations = [];
const autoFixes = [];
// IR_DIR 可覆盖是给 verify-repair 的沙盒用的。以前这里写死 fixtures/render-ir-*.json，
// 于是 repair.mjs 在本仓库里从来没有被执行过 —— 它出过「引用一个早就删掉的变量」这种
// 连 `node --check` 都过不去的错误，而没有任何门变红。现在那份账是真跑出来的。
const irDir = process.env.IR_DIR || "fixtures";
for (const ratio of ["16x9", "9x16"]) {
  const file = path.join(irDir, "render-ir-" + ratio + ".json");
  if (!fs.existsSync(file)) throw new Error(`缺 render-IR ${file}：先跑 npm run materialize-ir（或给沙盒设 IR_DIR）`);
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const result = repairRenderIRWithReport(ir, report.issues);
  if (result.changed_nodes.length) fs.writeFileSync(file, JSON.stringify(result.ir, null, 2));

  repairs.push({ratio, changed_nodes: result.changed_nodes, trace_only_nodes: result.trace_only_nodes});
  material.push(...result.changed_nodes);
  traceOnly.push(...result.trace_only_nodes.map((node) => ratio + ":" + node));
  escalations.push(...result.escalations);
  autoFixes.push(...result.auto_fixes);
}

fs.writeFileSync(
  path.join(plansDir, "status.json"),
  JSON.stringify({
    status: material.length ? "patched" : escalations.length ? "escalated" : "noop",
    repaired_at: new Date().toISOString(),
    changed_nodes: material,
    trace_only_nodes: traceOnly,
    // 本轮 repair 改过几个源文件：这个架构下永远是 0，写成显式字段，
    // 免得读账的人以为「源头也已经修好了」。
    source_writeback_count: 0,
    source_demands: demands.length,
    by_ratio: repairs,
    // 分镜层改不动 IR 的那些：下一轮渲染画面不会有任何变化，所以必须由人/agent 回分镜，
    // 而不是让 repair-cycle 再渲一遍去「观察」一个已经知道的结果。
    escalations: escalations.map((issue) => ({node: issue.node, type: issue.type, fix: issue.fix || null, detail: issue.detail || null})),
  }, null, 2),
);

console.log("repair", material.length ? "PASS: IR patched" : "STOP: nothing render-affecting to patch", JSON.stringify({
  changed_nodes: material,
  trace_only_nodes: traceOnly,
  auto_fixes: autoFixes.map((issue) => issue.type),
  escalations: [...new Set(escalations.map((issue) => `${issue.node}/${issue.type}`))],
  source_demands: demands.length,
}));

// 本轮没改动任何影响画面的 IR 字段，就没什么可重渲染的：非零退出，让 repair-cycle 停在
// 「先回分镜」而不是「再渲一轮看看」。（以前这里 throw "no scoped changes"，
// 但因为整段 JSON 比对把 repair_trace 也算成改动，它几乎从不触发。）
if (!material.length) process.exit(1);
