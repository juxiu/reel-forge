import {makeRepairPlan, repairRenderIR, repairRenderIRWithReport, classifyIssues, PIXEL_REPAIRS, pixelRoute} from "../src/repair/engine.mjs";
import {REPAIR_ACTIONS} from "../src/shots/plan.mjs";
import {reportToIssues, FLAG_TOKENS} from "../src/qc/flags.mjs";
import {run} from "../src/runtime/spawn.mjs";
import fs from "node:fs";
import path from "node:path";

const report = {
  status: "FAIL",
  issues: [
    {node: "scene-1", type: "motion_too_low", classification: "小面积动作", ratio: "16x9"},
    {node: "scene-1", type: "hero_too_small", severity: "medium", ratio: "16x9"},
  ],
};
// 计划层唯一的真源是 engine 的 makeRepairPlan（scripts/repair.mjs 用的就是它）。
// 这里钉的是「一条 issue 都不会从计划里掉出去」——以前 src/qc/repair-loop.mjs 另有一份
// buildRepairPlan + repairLoop，而 repairLoop 调用一次 repairAgent 就写 status="repaired"，
// 从不重新量画面，等于一条假修复循环挂在那等着被人接进生产链；真循环在 repair-cycle.mjs
// （渲染 → QC → 改 IR → 再渲染 → 再量），那份假的一律删掉。
const plan = makeRepairPlan(report, 2);
if (plan.nodes.length !== 1 || plan.issues.length !== 2 || plan.maxRetries !== 2) throw new Error("repair plan 分组失败: " + JSON.stringify(plan));
for (const issue of report.issues) {
  if (!plan.nodes.includes(issue.node)) throw new Error(`计划漏掉了挂问题的节点 ${issue.node}`);
}
const ir = {
  width: 1280, height: 720, fps: 30,
  scenes: [{
    id: "scene-1",
    start: 0, duration: 4,
    hero_scale: 1,
    elements: [{id: "hero", type: "card", text: "x"}],
    motion: [{target: "stage", type: "camera", preset: "push", amount: 0.04}, {target: "flow", type: "element", preset: "travel", amount: 0.05}],
  }],
};
const repaired = repairRenderIR(ir, report.issues);
if (!(repaired.scenes[0].hero_scale > 1)) throw new Error("hero_too_small 没被 hero_scale 修");
// 元素动作（motion[] 里 target≠stage）渲染层根本不读：plan.mjs 只取 type==='camera' 的那一项。
// 加大它的 amount 不会改变一个像素，却会被记成「本轮有画面改动」→ repair-cycle 白烧一轮渲染。
// 所以这里钉死：motion 一个字段都不许动。
const flowBefore = ir.scenes[0].motion.find((m) => m.target === "flow");
const flowAfter = repaired.scenes[0].motion.find((m) => m.target === "flow");
if (JSON.stringify(flowBefore) !== JSON.stringify(flowAfter)) throw new Error("没人读的元素动作被当成修复改写了: " + JSON.stringify(flowAfter));
if (repaired.scenes[0].motion.find((m) => m.target === "stage").amount !== 0.04) throw new Error("运镜幅度被动了 —— 静止该回分镜补动作，不是加相机");

// ---- 像素 token 的路由：改得动的改，改不动的明说改不动，advisory 的不许变成任何动作 ----
const escTypes = (r) => r.escalations.map((e) => e.type);
{
  // 真静：画面一个字段都不许变。以前这里给它加 stage 运镜，量出来的 motion 会过，
  // 但那是基准点名的 decorative-motion 反例 —— 绿灯换来了一个更差的画面。
  const r = repairRenderIRWithReport(ir, [{node: "scene-1", type: "motion_too_low", classification: "真静", ratio: "16x9", repair_hint: "给主角加动词动作"}]);
  if (r.changed_nodes.length) throw new Error("真静被「加运镜」修了 —— 假修复");
  if (escTypes(r).indexOf("motion_too_low") < 0) throw new Error("真静没进 escalations");
  if (r.escalations[0].hint !== "给主角加动词动作") throw new Error("escalation 丢了 python 侧的 repair_hint");
  if (r.escalations[0].layer !== "pixel") throw new Error("像素层问题被标成分镜层: " + JSON.stringify(r.escalations[0]));
}
{
  // motion_too_low 的三个分类**全部**回分镜：真静 / 有动作 / 小面积动作。
  // 以前「小面积动作」被路由成 IR 可修（加大 motion[].amount），而这个字段没有渲染层读者 ——
  // 报告写着已修、画面一个像素没变。这条门同时钉住两件事：不许凭空改画面，也不许冒充有进展。
  for (const classification of ["真静", "有动作", "小面积动作"]) {
    const r = repairRenderIRWithReport(ir, [{node: "scene-1", type: "motion_too_low", classification, ratio: "16x9", repair_hint: "给主角加动词动作"}]);
    if (r.changed_nodes.length) throw new Error(`motion_too_low/${classification} 被「IR 自动修」改了画面 —— 元素动作没有渲染层读者`);
    if (!escTypes(r).includes("motion_too_low")) throw new Error(`motion_too_low/${classification} 没进 escalations`);
    if (r.pixel_fixes.includes("motion_too_low")) throw new Error(`motion_too_low/${classification} 被算成 pixel_fixes（白烧一轮渲染）`);
    if (r.escalations[0].hint !== "给主角加动词动作") throw new Error(`motion_too_low/${classification} 丢了 python 侧的 repair_hint`);
    if (r.escalations[0].layer !== "pixel") throw new Error("像素层问题被标成分镜层: " + JSON.stringify(r.escalations[0]));
    if (r.escalations[0].detail !== null) throw new Error("escalation 结构变了（detail 应为 null）：" + JSON.stringify(r.escalations[0]));
  }
  // 分类要活着到报告里：分镜看到「真静」和「小面积动作」做的是两件不同的事。
  const traced = repairRenderIR(ir, [{node: "scene-1", type: "motion_too_low", classification: "小面积动作", ratio: "16x9"}]);
  if (!traced.scenes[0].repair_trace.some((entry) => entry.type === "motion_too_low" && entry.classification === "小面积动作")) {
    throw new Error("classification 没随 escalate 留痕进报告，分镜层拿不到分类");
  }
}
{
  // 镜头里没有元素动作时同样不许凭空造一段运镜。
  const noMover = {width: 1280, height: 720, fps: 30, scenes: [{id: "scene-1", motion: [{target: "stage", type: "camera", amount: 0.04}]}]};
  const r = repairRenderIRWithReport(noMover, [{node: "scene-1", type: "motion_too_low", classification: "小面积动作", ratio: "16x9"}]);
  if (r.changed_nodes.length) throw new Error("没有元素动作时凭空改了画面");
  if (!escTypes(r).includes("motion_too_low")) throw new Error("无可加大对象却没升级");
}
{
  // 素材/幕底/时长类：IR 改不动，必须点名，别混进「已自动修复」。
  const stuck = ["freeze", "hold_too_short", "glow_missing", "purple_debris", "background_debris", "motion_sample_too_sparse", "frame_metrics_missing"]
    .map((type) => ({node: "scene-1", type, ratio: "16x9"}));
  const r = repairRenderIRWithReport(ir, stuck);
  if (r.changed_nodes.length) throw new Error("改不动的像素问题被假装修过了");
  for (const type of stuck.map((i) => i.type)) if (!escTypes(r).includes(type)) throw new Error(type + " 没进 escalations");
}
{
  // advisory 指标：不修、不升级、连留痕都不写（写了就像处理过）。
  const r = repairRenderIRWithReport(ir, [{node: "scene-1", type: "visual_regression_fail", ratio: "16x9"}]);
  if (r.changed_nodes.length || r.trace_only_nodes.length || r.escalations.length) {
    throw new Error("advisory 的 visual_regression 又回到修复循环了: " + JSON.stringify({changed: r.changed_nodes, trace: r.trace_only_nodes, esc: r.escalations.length}));
  }
}
{
  // token 表双向对齐：Python 报出来的每个 token 都要有路由；PIXEL_REPAIRS 里也不许留没人报的条目。
  const pySource = fs.readFileSync("scripts/frame_metrics.py", "utf8") + fs.readFileSync("scripts/motion_check.py", "utf8");
  for (const token of FLAG_TOKENS) {
    if (!(token in PIXEL_REPAIRS)) throw new Error("token 没有修复路由: " + token);
    if (!pySource.includes('"' + token + '"')) throw new Error("FLAG_TOKENS 里的 " + token + " 在 Python 侧找不到，多半是改名了");
  }
  for (const token of Object.keys(PIXEL_REPAIRS)) {
    if (token === "visual_regression_fail") continue;
    if (!FLAG_TOKENS.includes(token)) throw new Error("PIXEL_REPAIRS 有条目没人报: " + token);
    if (!pixelRoute({type: token}).fix) throw new Error("PIXEL_REPAIRS." + token + " 没给 fix");
  }
}
{
  // flags → issue 的翻译层本身：severity 决定阻断与否，classification/hint 必须一路带到底。
  const frameReport = {summary: {status: "FAIL", scenes: [
    {id: "scene-1", status: "FAIL", flags: [
      {token: "hero_too_small", severity: "high", detail: "空场 60 帧"},
      {token: "glow_missing", severity: "low", detail: "柔光 0px²"},
    ]},
    {id: "scene-2", status: "WARN", flags: [{token: "purple_debris", severity: "low", detail: "紫色碎片 9 块"}]},
    {id: "scene-3", status: "FAIL", flags: []},
    {id: "scene-4", status: "PASS", flags: []},
  ]}};
  const {issues, warnings} = reportToIssues(frameReport, "16x9", "frame_metrics");
  const kinds = issues.map((i) => i.type).sort().join(",");
  if (kinds !== "frame_metrics_fail,hero_too_small") throw new Error("阻断 issue 集合错: " + kinds);
  const warnKinds = warnings.map((w) => w.type).sort().join(",");
  if (warnKinds !== "glow_missing,purple_debris") throw new Error("警告集合错: " + warnKinds);
  if (warnings.some((w) => w.node === "scene-4")) throw new Error("PASS 镜头被报出来了");
  const motionReport = {summary: {status: "FAIL", scenes: [
    {id: "scene-1", status: "FAIL", flags: [{token: "motion_too_low", severity: "medium", classification: "真静", repair_hint: "给主角加动词动作", detail: "静止 48 帧"}]},
  ]}};
  const translated = reportToIssues(motionReport, "16x9", "motion").issues[0];
  if (translated.classification !== "真静" || translated.repair_hint !== "给主角加动词动作") {
    throw new Error("分类/修复方向在翻译层被丢掉了: " + JSON.stringify(translated));
  }
  // 翻译层 + 路由层串起来跑一遍：这才是「QC 报的问题真有人认领」的证据。
  const chain = repairRenderIRWithReport(ir, [translated]);
  if (chain.changed_nodes.length) throw new Error("真静经完整链路后仍被自动改画面");
  if (chain.escalations[0]?.hint !== "给主角加动词动作") throw new Error("链路末端丢了修复方向: " + JSON.stringify(chain.escalations));
}

// ---- 分镜层（plan-audit）整改：只允许改 IR 里真实存在、渲染层确实会读的字段 ----
const planIr = (scene) => ({
  width: 1280, height: 720, fps: 30,
  scenes: [{id: "scene-1", start: 0, duration: 4, source_ref: {segment_index: 0}, ...scene}],
});

// 1) 坏相机名写在 IR 里 → 换成词表内的预设，算作画面相关改动。
{
  const issues = [{node: "scene-1", type: "camera-unknown-preset", ratio: "16x9", declared: "orbit-drift"}];
  const r = repairRenderIRWithReport(planIr({camera: "orbit-drift", motion: [{target: "stage", type: "camera", preset: "orbit-drift", amount: 0.05}]}), issues);
  const scene = r.ir.scenes[0];
  if (scene.camera !== "push" || scene.motion[0].preset !== "push") throw new Error("camera-unknown-preset 没被换成运镜词表内的预设");
  if (r.changed_nodes.join() !== "scene-1") throw new Error("camera-unknown-preset 应算画面相关改动");
  if (r.auto_fixes.length !== 1) throw new Error("camera-unknown-preset 应归入 auto_fixes");
}

// 2) 坏相机名来自镜头 recipe（IR 里没有）→ 只留痕，绝不报成「已修」。
{
  const issues = [{node: "scene-1", type: "camera-unknown-preset", ratio: "16x9", declared: "orbit-drift"}];
  const r = repairRenderIRWithReport(planIr({motion: [{target: "stage", type: "camera", preset: "push", amount: 0.05}]}), issues);
  if (r.changed_nodes.length) throw new Error("recipe 侧的坏相机名被当成 IR 已修 —— 这就是假修复");
  if (r.trace_only_nodes.join() !== "scene-1") throw new Error("recipe 侧问题没留痕: " + JSON.stringify(r.trace_only_nodes));
}

// 3) 重复 active 标记写在 elements 上 → 降级多余那个。
{
  const issues = [{node: "scene-1", type: "accent-overflow", ratio: "16x9", item: "b"}];
  const r = repairRenderIRWithReport(planIr({elements: [{id: "hero", type: "card", text: "x"}, {id: "a", active: true}, {id: "b", active: true}]}), issues);
  const b = r.ir.scenes[0].elements.find((el) => el.id === "b");
  if (b.active !== false) throw new Error("accent-overflow 没清掉 IR 里多余的 active");
  if (r.changed_nodes.join() !== "scene-1") throw new Error("accent-overflow 应算画面相关改动");
}

// 4) hero-overlong：既不能改文案，就绝不能顺手加大 hero_scale。
{
  const issues = [{node: "scene-1", type: "hero-overlong", ratio: "16x9", fix: REPAIR_ACTIONS["hero-overlong"].fix, detail: "装不进 696px"}];
  const before = planIr({hero_scale: 1, composition: {hero_weight: 0.68}, elements: [{id: "hero", type: "card", text: "a very long sentence"}]});
  const r = repairRenderIRWithReport(before, issues);
  const scene = r.ir.scenes[0];
  if (scene.hero_scale !== 1) throw new Error("hero-overlong 被「加大主角」修了 —— 长句只会更挤");
  if (scene.composition.hero_weight !== 0.68) throw new Error("hero-overlong 被调 hero_weight 修了");
  if (r.changed_nodes.length) throw new Error("hero-overlong 不该产生画面相关改动");
  if (r.escalations.length !== 1 || r.escalations[0].fix !== "author-display-copy-shorter-than-narration") throw new Error("hero-overlong 没进 escalations");
  const plan2 = makeRepairPlan({status: "FAIL", issues}, 2);
  if (plan2.breakdown.needs_storyboard !== 1 || plan2.breakdown.auto_fixable !== 0) throw new Error("makeRepairPlan 分流计数错: " + JSON.stringify(plan2.breakdown));
}

// 5) classifyIssues：像素问题和分镜问题不能混在同一路「加大参数重试」里。
{
  const c = classifyIssues([
    {node: "scene-1", type: "motion_too_low"},
    {node: "scene-1", type: "beat-window-overflow", item: "sk2"},
    {node: "layout-16x9", type: "frame_metrics_fail"},
  ]);
  if (c.pixel.length !== 2 || c.plan.length !== 1 || c.auto.length !== 0 || c.escalate.length !== 1) {
    throw new Error("classifyIssues 分流错误 " + JSON.stringify({pixel: c.pixel.length, plan: c.plan.length, auto: c.auto.length, escalate: c.escalate.length}));
  }
}

// 6) 整片级 issue 会被广播到每个镜头：escalation 的归属必须是问题原本的节点，且只报一条。
{
  const wide = {width: 1280, height: 720, fps: 30, scenes: [
    {id: "scene-1", start: 0, duration: 4, source_ref: {segment_index: 0}},
    {id: "scene-2", start: 4, duration: 4, source_ref: {segment_index: 1}},
    {id: "scene-3", start: 8, duration: 4, source_ref: {segment_index: 2}},
  ]};
  const r = repairRenderIRWithReport(wide, [{node: "layout-16x9", type: "glow_missing", ratio: "16x9", repair_hint: "在图元上开主角光晕"}]);
  if (r.escalations.length !== 1) throw new Error("一条整片级问题被广播成 " + r.escalations.length + " 条 escalation");
  if (r.escalations[0].node !== "layout-16x9") throw new Error("escalation 把广播落点当成了问题归属: " + r.escalations[0].node);
  if (r.escalations[0].hint !== "在图元上开主角光晕") throw new Error("广播路径丢了 repair_hint");
  // 带着上一轮留痕的 IR 再跑一轮：痕是累积写回 IR 的，旧条目不许被重新报成「本轮没人修」，
  // 否则 repair-cycle 会永远停在一个已经交回人工的问题上。
  const again = repairRenderIRWithReport(r.ir, [{node: "layout-16x9", type: "visual_regression_fail", ratio: "16x9"}]);
  if (again.escalations.length) throw new Error("上一轮的 escalate 被重新报成本轮问题: " + JSON.stringify(again.escalations));
}

// 7) 同一个 token 命中多个镜头：pixel_fixes 回答「哪类问题真被 IR 改了」，几个镜头看 changed_nodes。
{
  const two = {width: 1280, height: 720, fps: 30, scenes: [
    {id: "scene-1", start: 0, duration: 4, hero_scale: 1},
    {id: "scene-2", start: 4, duration: 4, hero_scale: 1},
  ]};
  const r = repairRenderIRWithReport(two, [{node: "scene-1", type: "hero_too_small"}, {node: "scene-2", type: "hero_too_small"}]);
  if (r.pixel_fixes.join() !== "hero_too_small") throw new Error("pixel_fixes 按镜头重复计数: " + JSON.stringify(r.pixel_fixes));
  if (r.changed_nodes.join() !== "scene-1,scene-2") throw new Error("changed_nodes 没列出两个镜头: " + JSON.stringify(r.changed_nodes));
}

// 8) 记账链真跑：scripts/repair.mjs 从 QC 报告一路写到三份账，交付门读得到的形状必须在这里就成立。
//
// 为什么这条最晚才出现，却最该有：repair.mjs 以前只读死路径（artifacts/<pid>/qc/report.json），
// 又直接改 fixtures/render-ir-*.json，本地根本没法跑 —— 于是它里面留过一句引用**早已删掉的变量**
// （sourceRepairMap）的代码，`node scripts/repair.mjs` 只要被执行一次就会立刻崩，而全套门禁照样绿。
// 现在 IR 目录可覆盖（IR_DIR），这里用沙盒把它真跑三遍：PASS / IR 真改 / 只能交回分镜。
// 顺带钉住那件刚修好的事：repair 不再写 beats.json（写回生成物不是修复）。
const SANDBOX = path.join("artifacts", "repair-selftest");
const IR_DIR = path.join(SANDBOX, "ir");
const PID = "repair-selftest";
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function freshSandbox() {
  fs.rmSync(SANDBOX, {recursive: true, force: true});
  fs.mkdirSync(path.join(SANDBOX, "qc"), {recursive: true});
  fs.mkdirSync(IR_DIR, {recursive: true});
  fs.writeFileSync(path.join(SANDBOX, "project.json"), JSON.stringify({project_id: PID}), "utf8");
  const scene = {id: "scene-1", start: 0, duration: 4, hero_scale: 1, source_ref: {segment_index: 0}, elements: [{id: "hero", type: "card", text: "x"}], motion: [{target: "flow", type: "element", preset: "travel", amount: 0.05}]};
  for (const ratio of ["16x9", "9x16"]) {
    fs.writeFileSync(path.join(IR_DIR, `render-ir-${ratio}.json`), JSON.stringify({version: "0.3", project_id: PID, width: ratio === "16x9" ? 1280 : 720, height: ratio === "16x9" ? 720 : 1280, fps: 30, scenes: [structuredClone(scene)]}, null, 2), "utf8");
  }
  // beats.json 放个哨兵：它每轮由 buildBeatGraph 重生成，repair 写它 = 写一份没人读的副本。
  fs.writeFileSync(path.join(SANDBOX, "beats.json"), JSON.stringify({beats: [{id: "beat-001", camera: {type: "push", amount: 0.04}}]}), "utf8");
}

function runRepair(reportObj) {
  fs.writeFileSync(path.join(SANDBOX, "qc", "report.json"), JSON.stringify(reportObj), "utf8");
  const r = run("node", ["scripts/repair.mjs"], {
    encoding: "utf8",
    env: {...process.env, PROJECT_FILE: path.join(SANDBOX, "project.json"), IR_DIR: IR_DIR},
  });
  if (r.error) throw new Error("scripts/repair.mjs 起不来：" + r.error);
  return r;
}

const irText = (ratio) => fs.readFileSync(path.join(IR_DIR, `render-ir-${ratio}.json`), "utf8");
const beatsText = () => fs.readFileSync(path.join(SANDBOX, "beats.json"), "utf8");
/** 交付门（verify-delivery / verify-production）只认这两件事，这里提前替它们把关。 */
function checkSourceAudit(file, {wantEntries}) {
  if (file.version !== "0.2") throw new Error("source-repair.json version 变了，交付门会拒绝：" + file.version);
  if (!Array.isArray(file.entries)) throw new Error("source-repair.json entries 不是数组");
  if (file.writeback_count !== 0) throw new Error("源层 writeback_count 必须是 0（beats.json 是生成物，写回它不是修复）：" + file.writeback_count);
  if (file.entries.length !== wantEntries) throw new Error(`源层待办应有 ${wantEntries} 条，实际 ${file.entries.length} 条`);
}

{
  freshSandbox();
  const before = beatsText();
  const r = runRepair({status: "PASS", issues: []});
  if (r.status !== 0) throw new Error("QC 已 PASS 时 repair 该退出 0：" + r.status + " " + String(r.stderr || "").slice(-200));
  const st = readJson(path.join(SANDBOX, "repair", "status.json"));
  if (st.status !== "not-needed" || st.changed_nodes.length) throw new Error("PASS 分支的账写错了: " + JSON.stringify(st));
  checkSourceAudit(readJson(path.join(SANDBOX, "repair", "source-repair.json")), {wantEntries: 0});
  if (beatsText() !== before) throw new Error("QC PASS 分支动了 beats.json");
}
{
  freshSandbox();
  const beforeBeats = beatsText();
  const r = runRepair({status: "FAIL", issues: [{node: "scene-1", type: "hero_too_small", severity: "medium", ratio: "16x9"}]});
  if (r.status !== 0) throw new Error("IR 真改了却退出非 0，repair-cycle 会白白停住：" + r.status);
  const st = readJson(path.join(SANDBOX, "repair", "status.json"));
  if (st.status !== "patched" || st.changed_nodes.join() !== "scene-1") throw new Error("hero_too_small 没被记成画面相关改动: " + JSON.stringify(st));
  if (st.source_writeback_count !== 0) throw new Error("status.json 谎报源层改动数: " + st.source_writeback_count);
  // 带了 ratio 的 issue 只修那一版：横屏量出来的「主角太小」不该去动竖屏的 render-IR。
  const wide = readJson(path.join(IR_DIR, "render-ir-16x9.json"));
  const tall = readJson(path.join(IR_DIR, "render-ir-9x16.json"));
  if (!(wide.scenes[0].hero_scale > 1)) throw new Error("16x9 的 render-IR 里 hero_scale 没被改大");
  if (tall.scenes[0].hero_scale !== 1) throw new Error("16x9 的问题把 9x16 也「修」了 —— 竖屏没被量过就不该动: " + tall.scenes[0].hero_scale);
  if (beatsText() !== beforeBeats) throw new Error("repair 又去 bump beats.json 了 —— 那是生成物，写回它等于假修复");
  checkSourceAudit(readJson(path.join(SANDBOX, "repair", "source-repair.json")), {wantEntries: 0});
}
{
  // 不带 ratio 的 issue（媒体探针那一类）两版都要改到 —— 和上一条一起把 ratio 的两个方向钉住。
  freshSandbox();
  const r = runRepair({status: "FAIL", issues: [{node: "scene-1", type: "hero_too_small", severity: "medium"}]});
  if (r.status !== 0) throw new Error("无 ratio 的 issue 该在两版 IR 上都改到，退出 " + r.status);
  const st = readJson(path.join(SANDBOX, "repair", "status.json"));
  if (st.changed_nodes.join() !== "scene-1,scene-1") throw new Error("无 ratio 的 issue 没修满两版: " + JSON.stringify(st));
  for (const ratio of ["16x9", "9x16"]) {
    if (!(readJson(path.join(IR_DIR, `render-ir-${ratio}.json`)).scenes[0].hero_scale > 1)) throw new Error(`${ratio} 没被无 ratio 的 issue 修到`);
  }
}
{
  freshSandbox();
  const irBefore = irText("16x9");
  const beatsBefore = beatsText();
  const r = runRepair({status: "FAIL", issues: [{node: "scene-1", type: "hero-overlong", ratio: "16x9", detail: "装不进 696px", fix: REPAIR_ACTIONS["hero-overlong"].fix}]});
  // 非零退出是 repair-cycle 的刹车：本轮没有任何影响画面的 IR 改动，不该再渲一轮。
  if (r.status !== 1) throw new Error("只能交回分镜时 repair 该退出 1（让 repair-cycle 停下），实际 " + r.status);
  const st = readJson(path.join(SANDBOX, "repair", "status.json"));
  if (st.status !== "escalated" || st.changed_nodes.length) throw new Error("escalate 分支的账写错了: " + JSON.stringify(st));
  if (irText("16x9") !== irBefore) throw new Error("escalate 分支还改了 render-IR");
  if (beatsText() !== beatsBefore) throw new Error("escalate 分支写了源文件");
  const audit = readJson(path.join(SANDBOX, "repair", "source-repair.json"));
  checkSourceAudit(audit, {wantEntries: 1});
  const demand = audit.entries[0];
  if (demand.layer !== "plan" || demand.changed !== false) throw new Error("源层待办把没做的事写成了做过: " + JSON.stringify(demand));
  if (!demand.must_change.some((f) => f.includes("storyboard_src.md"))) throw new Error("分镜层待办没指向真正手写的分镜源: " + JSON.stringify(demand.must_change));
  if (st.source_demands !== 1) throw new Error("status.json 的 source_demands 和账本条数不一致: " + st.source_demands);
}
fs.rmSync(SANDBOX, {recursive: true, force: true});

console.log("repair PASS (pixel + storyboard-classified + 记账链真跑)");