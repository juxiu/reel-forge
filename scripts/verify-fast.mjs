import fs from "node:fs";
import {run, scriptSpec} from "../src/runtime/spawn.mjs";

const checks = [
  "verify:skill",
  // Optional external shot recipe library: SKIP when VIDEO_SHOTCRAFT_DIR is unset; validate it when configured.
  "verify:shotcraft",
  "verify:plan",
  "verify:contracts",
  "verify:imports",
  "verify:syntax",
  "verify:timeline",
  // 分镜表链（render_storyboard → selfcheck）用合成时间轴真跑 + 变异；
  // 它的输入是 .gitignore 里的运行产物，不这样跑就本地/CI 都碰不到。
  "verify:storyboard",
  // 时序单真源：镜区间、字幕块必须与 script/timeline.json（TTS 真实词边界）同源。
  // 事故：这三份数据曾各自独立，导致 IR 7657 帧 vs 配音 13235 帧 —— 成片比配音短 186 秒，
  // 而没有任何门发现，因为没有第二个真源跟它 disagreement。
  "verify:timeline-source",
  "verify:render-layer",
  // JSX 里 `{halo}` 这种「引用了本文件没有的名」是 ReferenceError，而 node --check /
  // verify:imports / verify:render-layer 三道都看不见它（语法合法、不是导入问题、纯函数门禁不解析 JSX）。
  // 真实后果是 44 个镜头全黑而门禁全绿，所以这道门必须进 fast。
  "verify:jsx-symbols",
  // wrapper 已定位时内部又写一遍同样的绝对坐标 = 偏移两次。comparetable 的框被推出画外、
  // reshape 的形整个消失，肉眼才知道；syntax / imports / jsx-symbols / render-layer 全绿。
  //判据是「子坐标表达式与 wrapper 原点表达式相同」，所以对 `cx={s/2}` 这类正确的相对坐标零误报。
  "verify:relative-coords",
  "verify:spawn",
  // agent 层此前完全无测：三态信封、契约里那条「skipped 不许带结论」、超时会不会真断，
  // 都只能靠读代码相信。它跑的是本地临时脚本当真 provider，不联网、不渲染。
  "verify:agent",
  "verify:approval",
  "verify:build",
  "verify:scheduler",
  "verify:store",
  "verify:visual",
  "verify:visual-contracts",
  "verify:visual-grammar",
  "verify:visual-benchmark",
  // 秒级：contracts 漂移 + 「测量层还是不是纯标准库」+ 判据有没有退回成脚本字面量 + vision.objects 暴力对照。
  // 完整的合成帧跑法（test_measurement.py，约 5–6 分钟）留在 verify:measure / CI，不进 fast。
  "verify:measure:quick",
  "verify:semantic-director",
  "verify:footage",
  // a2e 硬性原则 2「事实有出处」在本仓库**只有这一个执行者**，而它此前只在一键链里跑
  // （skill.mjs:119）—— 本地 fast 与 CI 都不碰它。它的 B 段就是这样在没人跑的地方
  // 悄悄退化成「扫到 0 条所以永远绿」的（详见 docs/knowledge/research-brief.md §4）。
  // 输入全是 tracked 的 fixtures + src/shots，不联网、不渲染，秒级，没有理由不进 fast。
  "verify:text-provenance",
  // 分组数与 still 数量（基础 6 / 高光 ≥10）的真源门：八个调用点里任何一处把 6/8/44 写回去、
  // 或把取值函数换成常量就变红。它守着的是下面两道蓝图门的前提，所以必须在蓝图门之前跑。
  "verify:limits",
  "verify:reference-sample",
  // authored 合规此前只在 PR 上兜（verify-fast.yml 单独跑它，一键链和本地 fast 都不碰），
  // 于是「新增一镜不进蓝图就完全不过门」这件事在本地永远看不见。它只读 44 个 .jsx 文本，秒级。
  "verify:authored-shots",
  "verify:tts-parity",
  // project.language 与解说词实际字符集必须一致。真实事故：language 一直是 "en"（旧英文样片留下的），
  // 于是英文声音去念中文，edge-tts 每句报「NoAudioReceived」并把矛头指向参数 ——
  // 先怀疑文本、再怀疑限流、再怀疑重试退避，真因是这个字段。合成之前就该拦。
  "verify:language",
  // 原生 TTS 通道（kokoro / piper / kokoro_onnx / 用户 wav）真跑一遍 dispatch。
  // verify:tts-parity 只比对那份「支持哪些引擎」的名单，而名单是脚本里的常量，
  // 删掉 native.mjs 的 kokoro 分支它照样绿 —— 声明与实现之间没有任何连线。
  // 这道门用 stub provider 真调dispatch，并确认坏输出会被拒绝。秒级、不联网、不需要装模型。
  "verify:tts-native",
  "verify:repair",
  "verify:hyperframes",
  // claims 里的指令性文字过滤：抓回来的网页句子会带着 claim 编号变成"事实"并喂给 agent，
  // 而 `verify:research` 要联网、只测「抓得到东西」不测内容性质，且不在 fast 里。
  // 本门纯 node、用合成来源跑，判的是过滤真的装在生产者侧且没被抄回本地（docs/knowledge/agent-protocol.md §6）。
  "verify:instruction-filter",
];

/**
 * 子命令从 package.json 的 scripts 里取（lib/scriptSpec），不在这里再写一遍路径 ——
 * 写两遍就会出现「门禁脚本改了名但 fast 还在跑旧文件」。
 *
 * ⚠ 历史事故：原先这里 spawnSync("npm", ["run", name, "--silent"])，Windows 上 npm 是
 *    npm.cmd，不开 shell 直接 ENOENT，status=null 被 `?? 1` 当成「verify:skill 失败」，
 *    于是 `npm run verify:fast` 一条检查都没执行、耗时 9ms 就退出。
 *    现在由 verify:spawn 专门守着这个启动层。
 */

const started = Date.now();
const results = [];
const failures = [];
for (const name of checks) {
  const begin = Date.now();
  console.log("\n>>> " + name);
  const spec = scriptSpec(name);
  const result = run(spec.cmd, spec.args, {stdio: "inherit", env: process.env});
  const ms = Date.now() - begin;
  if (result.error) {
    console.error(`[${name}] 命令起不来 ${spec.cmd}: ${result.error}`);
    failures.push({check: name, error: result.error, ms});
    results.push({check: name, ms, ok: false});
    if (process.env.FAIL_FAST === "1") break;
    continue;
  }
  const ok = result.status === 0;
  results.push({check: name, ms, ok});
  if (!ok) {
    failures.push({check: name, exit: result.status ?? 1, signal: result.signal || undefined, ms});
    console.error(`\n[${name}] FAILED exit=${result.status ?? "signal " + result.signal} (${ms}ms)`);
    if (process.env.FAIL_FAST === "1") break; // 只想要第一个错时保留旧行为
  }
  console.log(`<<< ${name} ${ok ? "PASS" : "FAIL"} ${ms}ms`);
}

console.log("\nFAST VERIFY SUMMARY", JSON.stringify({
  checks: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failures.length,
  elapsed_ms: Date.now() - started,
}));

if (failures.length) {
  // 逐条列出而不是只报第一个：修一个跑一遍太慢，且后面的坑看不见。
  console.error("FAST VERIFY FAIL", JSON.stringify({failed_checks: failures}));
  process.exit(1);
}

console.log("FAST VERIFY PASS", JSON.stringify({checks: checks.length, elapsed_ms: Date.now() - started}));
