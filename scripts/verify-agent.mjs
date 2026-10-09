import fs from "node:fs";
import path from "node:path";
import {validate} from "../src/contracts/validate.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {commandAgent} from "../src/providers/agent/command.mjs";
import {runNamedAgent, runNamedAgents} from "../src/agents/orchestrator.mjs";

/**
 * Agent 层门禁：provider 的输入输出形态、信封三态、契约真不真、以及「agent 输出有没有消费者」这件事。
 *
 * 为什么要有这一道：`src/agents/orchestrator.mjs` 与 `src/providers/agent/` 此前**没有任何测试**
 * （grep 确认 `runNamedAgent` 只出现在三个生产者里）。于是这几条只能靠读代码相信：
 *   · 没配 provider 时降级成 skipped，而不是抛错或假装评审过；
 *   · skipped 信封不许带结论（`contracts/agent.schema.json` 的 if/then 到底有没有咬合）；
 *   · 命令失败与「provider 返回 null」走的是两条完全不同的路（前者整批丢，后者只降级一个）；
 *   · 超时会杀子进程，而不是让 build-groups/qc 挂到永远。
 * 这里全部用本地临时脚本当真 provider 跑，不联网、不装东西、不渲染。
 *
 * ⚠ 第 3 节是**变更探测器**，不是质量门：它钉住的是「本文所述消费面为零」这个事实。
 *    谁把 agent 输出接成了判定依据，它就红，并要求同步改 `docs/knowledge/agent-protocol.md` §2。
 */

const failures = [];
const check = (label, cond, detail = "") => {
  if (!cond) failures.push(`${label}${detail ? " — " + detail : ""}`);
  console.log(`${cond ? "ok   " : "FAIL "} ${label} ${detail}`);
};
const throws = async (fn) => {
  try {
    await fn();
    return {threw: false, message: ""};
  } catch (error) {
    return {threw: true, message: String(error?.message || error)};
  }
};
const throwsSync = (fn) => {
  try {
    fn();
    return {threw: false, message: ""};
  } catch (error) {
    return {threw: true, message: String(error?.message || error)};
  }
};

const ENVELOPE = JSON.parse(fs.readFileSync("contracts/agent.schema.json", "utf8"));
const checkEnvelope = (label, envelope, expectValid = true) => {
  const errors = validate(ENVELOPE, envelope);
  check(label, (errors.length === 0) === expectValid, errors.join(" | "));
};

const tmpDir = "artifacts/agent-selftest";
fs.rmSync(tmpDir, {recursive: true, force: true});
fs.mkdirSync(tmpDir, {recursive: true});
const script = (name, source) => {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, source);
  return file.replace(/\\/g, "/");
};

const okAgent = script("ok-agent.mjs", [
  "let s='';process.stdin.on('data',d=>s+=d);",
  "process.stdin.on('end',()=>{const i=JSON.parse(s);console.log(JSON.stringify({verdict:'reviewed',role_seen:i.role,scenes:(i.shots||[]).length}));});",
].join("\n"));
const failAgent = script("fail-agent.mjs", "process.exit(7);\n");
const junkAgent = script("junk-agent.mjs", "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log('not json at all'));\n");
const nullAgent = script("null-agent.mjs", "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log('null'));\n");
const hangAgent = script("hang-agent.mjs", "process.stdin.resume();setTimeout(()=>{console.log('{}');process.exit(0);},15000);\n");

// ---- 1) provider 形态：没配就是 null，配了才存在 ----
check("AGENT_COMMAND 未设置时 provider 为 null（降级而不是报错）", createAgentProvider({}) === null);
check("AGENT_COMMAND 设置后 provider 存在", createAgentProvider({AGENT_COMMAND: "node"}) !== null);
const badArgs = throwsSync(() => createAgentProvider({AGENT_COMMAND: "node", AGENT_ARGS: "not-json"}));
check("AGENT_ARGS 必须是 JSON 数组（写错立刻抛，不静默当无参）", badArgs.threw, badArgs.message);

// ---- 2) 三态信封与 AGENT_STRICT ----
const skipped = await runNamedAgent(null, "qc-agent", {ratio: "16x9"});
check("无 provider → status=skipped", skipped.status === "skipped" && skipped.role === "qc-agent", JSON.stringify(skipped));
checkEnvelope("skipped 信封合契约", skipped);
const strictMissing = await throws(() => runNamedAgent(null, "build-agent", {}, {strict: true}));
check("AGENT_STRICT=1 时无 provider 直接抛并指名角色", strictMissing.threw && /agent provider required for build-agent/.test(strictMissing.message), strictMissing.message);

const emptyOutput = await runNamedAgent({run: async () => undefined}, "director-agent", {});
check("provider 返回 undefined → status=failed + empty-output", emptyOutput.status === "failed" && emptyOutput.output.reason === "empty-output", JSON.stringify(emptyOutput));
checkEnvelope("failed 信封合契约", emptyOutput);
const strictEmpty = await throws(() => runNamedAgent({run: async () => null}, "research-agent", {}, {strict: true}));
check("AGENT_STRICT=1 时空输出直接抛", strictEmpty.threw && /agent returned empty output: research-agent/.test(strictEmpty.message), strictEmpty.message);

// 假评审：没看过的画面不能写成看过的结论 —— 契约里那条 if/then 必须真咬。
// ⚠ 这里故意只多放 `verdict` 一个键：以前顺带放了个契约外的 `scenes`，
// 于是即使把 if/then 放宽成"skipped 也能带结论"，这条照样红（红在错误的理由上），
// 测不出契约本身有没有被改坏。多一个键就少一分针对性。
checkEnvelope(
  "skipped 却带结论的信封被契约拒绝",
  {role: "qc-agent", status: "skipped", output: {reason: "agent-unconfigured", verdict: "PASS"}},
  false,
);
checkEnvelope("completed 信封带任意 output 形状（数组）合契约", {role: "qc-agent", status: "completed", output: [{node: "SC01"}]});

// ---- 3) 真命令 provider：四类结果四种报法 ----
const viaProvider = createAgentProvider({AGENT_COMMAND: process.execPath, AGENT_ARGS: JSON.stringify([okAgent])});
const completed = await runNamedAgent(viaProvider, "build-agent", {shots: [{scene_id: "SC01"}, {scene_id: "SC02"}]});
check("命令 provider：stdin 收 input、stdout 收 JSON → completed", completed.status === "completed" && completed.output.verdict === "reviewed", JSON.stringify(completed));
check("completed 信封带 completed_at", typeof completed.completed_at === "string" && !Number.isNaN(Date.parse(completed.completed_at)), String(completed.completed_at));
check("provider 真的把 role 与 input 原样喂进去了（stdin JSON 里能看到 role 与 shots 数）", completed.output.role_seen === "build-agent" && completed.output.scenes === 2, JSON.stringify(completed.output));
checkEnvelope("completed 信封合契约", completed);

const cmdFail = await throws(() => commandAgent({input: {role: "qc-agent"}, command: process.execPath, args: [failAgent]}));
check("退出码非 0 → agent failed: exit N（不是超时也不是起不来）", cmdFail.threw && /agent failed: exit 7/.test(cmdFail.message), cmdFail.message);
const cmdJunk = await throws(() => commandAgent({input: {role: "qc-agent"}, command: process.execPath, args: [junkAgent]}));
check("stdout 不是 JSON → 指名「output is not JSON」", cmdJunk.threw && /agent output is not JSON/.test(cmdJunk.message), cmdJunk.message);
const cmdMissing = await throws(() => commandAgent({input: {}, command: "reel-forge-definitely-not-installed"}));
check("命令名写错 → 报「无法启动」并指名是哪个命令，而不是裸 ENOENT", cmdMissing.threw && /agent command 无法启动/.test(cmdMissing.message) && /reel-forge-definitely-not-installed/.test(cmdMissing.message), cmdMissing.message);
const nullEnv = await runNamedAgent(createAgentProvider({AGENT_COMMAND: process.execPath, AGENT_ARGS: JSON.stringify([nullAgent])}), "research-agent", {});
check("stdout 恰好是 null 时算「空输出」（failed）而不是 completed", nullEnv.status === "failed" && nullEnv.output.reason === "empty-output", JSON.stringify(nullEnv));

// 超时：以前 opts.timeout 只写在 JSDoc 里，传了也没人看（假开关）。
const started = Date.now();
const cmdTimeout = await throws(() => commandAgent({input: {role: "qc-agent"}, command: process.execPath, args: [hangAgent], timeoutMs: 500}));
const elapsed = Date.now() - started;
check("AGENT_TIMEOUT_MS/timeoutMs 到点杀子进程并指名超时", cmdTimeout.threw && /超时/.test(cmdTimeout.message), cmdTimeout.message);
check("超时是真的中断等待，不是等它跑完（<5s 返回，脚本本身要 15s）", elapsed < 5000, `${elapsed}ms`);
const timeoutViaEnv = createAgentProvider({AGENT_COMMAND: process.execPath, AGENT_ARGS: JSON.stringify([hangAgent]), AGENT_TIMEOUT_MS: "400"});
const envTimeout = await throws(() => timeoutViaEnv.run({role: "qc-agent"}));
check("AGENT_TIMEOUT_MS 环境变量生效（不必改代码就有保险）", envTimeout.threw && /超时/.test(envTimeout.message), envTimeout.message);
const noTimeoutDefault = createAgentProvider({AGENT_COMMAND: process.execPath, AGENT_ARGS: JSON.stringify([okAgent])});
check("默认不设超时（不改变既有行为）", (await noTimeoutDefault.run({role: "qc-agent"})).verdict === "reviewed");

// ---- 4) 批量的失败语义：一条坏 = 整批信封丢 ----
// 这条必须用「一半成功一半失败」的混合 provider 才测得出来：
// 若 runNamedAgents 改成 `return {results,errors}` 或只报第一个错，本断言才可能变红。
const halfBad = script("half-bad-agent.mjs", [
  "let s='';process.stdin.on('data',d=>s+=d);",
  "process.stdin.on('end',()=>{const i=JSON.parse(s);if(i.ratio==='9x16')process.exit(9);console.log(JSON.stringify({verdict:'ok'}));});",
].join("\n"));
const mixed = await throws(() => runNamedAgents(
  createAgentProvider({AGENT_COMMAND: process.execPath, AGENT_ARGS: JSON.stringify([halfBad])}),
  [{role: "qc-agent", input: {ratio: "16x9"}}, {role: "qc-agent", input: {ratio: "9x16"}}],
));
check("批量里一条 provider 抛异常 → runNamedAgents 抛（同批已成功的信封一起丢）", mixed.threw && /exit 9/.test(mixed.message), mixed.message);
check("报错里带失败的 index，能看出是哪一条", mixed.threw && /"index":1/.test(mixed.message), mixed.message);
check("成功那条没有因为抛错而被当成失败上报（errors 里只有 index 1）", mixed.threw && !/"index":0/.test(mixed.message), mixed.message);
const batchSoft = await runNamedAgents(null, [{role: "qc-agent", input: {}}, {role: "build-agent", input: {}}]);
check("批量在「没配 provider」时是两份 skipped 而不是异常", batchSoft.length === 2 && batchSoft.every((x) => x.status === "skipped"), JSON.stringify(batchSoft));
const batchStrict = await throws(() => runNamedAgents(null, [{role: "qc-agent", input: {}}], {strict: true}));
check("批量在 strict 下逐条抛（错误信息保留角色名）", batchStrict.threw && /agent provider required for qc-agent/.test(batchStrict.message), batchStrict.message);

// ---- 5) 消费面静态核对（本文 §2 的事实，改了必须同步文档） ----
const SELF = "scripts/verify-agent.mjs";
const AGENT_OUTPUT_WRITERS = ["scripts/qc.mjs", "scripts/build-groups.mjs", "scripts/run-production.mjs", SELF];
// 形状知情者：verify-contracts 会**读数组来校验信封形状**，但它不消费内容、不参与判定。
// 允许它，但要把允许的理由钉死成一条断言：它必须还是那个 `each:"agent_reviews"` 的形状校验项。
// 谁把它改成「按 agent 结论决定 PASS/FAIL」，这条先红，然后上面那条也会红。
const shapeAware = fs.readFileSync("scripts/verify-contracts.mjs", "utf8");
check("verify-contracts 只是按契约校验 agent 信封的形状（each:agent_reviews）", /each:\s*"agent_reviews"/.test(shapeAware));
const SHAPE_AWARE = ["scripts/verify-contracts.mjs"];
const sources = fs.readdirSync("scripts").filter((f) => /\.mjs$/.test(f)).map((f) => ["scripts/" + f, fs.readFileSync(path.join("scripts", f), "utf8")]);
const consumers = [];
for (const [file, src] of sources) {
  if (AGENT_OUTPUT_WRITERS.includes(file) || SHAPE_AWARE.includes(file)) continue;
  if (/agent_reviews|agent_status|agent-reviews|\.agent\b/.test(src)) consumers.push(file);
}
check("agent 输出没有任何下游消费者（本文 §2 的一句话结论）", consumers.length === 0, consumers.join(","));

const qcSrc = fs.readFileSync("scripts/qc.mjs", "utf8");
check("qc 的 PASS/FAIL 只由 issues.length 决定，不含 agent 结果", /status:issues\.length\?"FAIL":"PASS"/.test(qcSrc) && !/status:[^n]*reviews/.test(qcSrc));
for (const key of ["only_paths", "six_stills_per_shot", "test_render_frames", "semantic_renderer_required", "settle_frames_min"]) {
  const hits = sources.filter(([file, src]) => file !== SELF && src.includes(key)).map(([file]) => file);
  check(`约束键 ${key} 只有写入点（${hits.length} 处）`, hits.length === 1 && hits[0] === "scripts/build-groups.mjs", hits.join(","));
}

// ---- 6) 四个角色的调用点必须还在（角色名改了，文档与 provider 都会对不上） ----
const roleSites = {
  "research-agent": "scripts/run-production.mjs",
  "director-agent": "scripts/run-production.mjs",
  "build-agent": "scripts/build-groups.mjs",
  "qc-agent": "scripts/qc.mjs",
};
for (const [role, file] of Object.entries(roleSites)) {
  check(`角色 ${role} 仍在 ${file} 里被调用`, fs.readFileSync(file, "utf8").includes(`"${role}"`));
}

fs.rmSync(tmpDir, {recursive: true, force: true});

if (failures.length) {
  console.error("AGENT GATE FAIL", JSON.stringify({failures}, null, 2));
  process.exit(1);
}
console.log("AGENT GATE PASS", JSON.stringify({provider: "stdin/stdout json", envelope_states: 3, timeouts: "enforced"}));
