import fs from "node:fs";
import path from "node:path";
import {CHECKPOINTS} from "../src/runtime/checkpoints.mjs";

/**
 * SKILL.md 是对外承诺的能力清单，所以这里不能只做「文档里有没有这句话」的字符串 grep ——
 * 那种门禁改改文案就能过，文档和实现照样会漂移。
 * 真正的断言是三类**跨产物一致性**：
 *   1. 文档里引用的每条 `npm run X` 必须在 package.json 里存在；
 *   2. 文档里的人工确认点必须与 src/runtime/checkpoints.mjs 的 CHECKPOINTS 完全一致；
 *   3. 文档里承诺的环境开关（STRICT_STILLS=1 这种）必须真被 scripts/ 或 src/ 的实现读取。
 *
 * ⚠ 行尾：仓库在 Windows 上签出就是 CRLF。frontmatter 按 `---\n` 逐字节匹配会直接把
 *    整条 verify:fast 打断（历史事故：SKILL.md frontmatter missing）。所以一律先归一化再解析。
 */

/** 读文本并归一化行尾，顺便去掉 BOM —— 解析类断言只在归一化后的文本上做。 */
function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

const skill = readText("SKILL.md");
if (!skill.startsWith("---\n")) throw new Error("SKILL.md frontmatter missing");
const end = skill.indexOf("\n---\n", 4);
if (end < 0) throw new Error("SKILL.md frontmatter malformed");
const frontmatter = skill.slice(4, end);
const body = skill.slice(end + 5);

for (const field of ["name:", "description:"]) {
  if (!frontmatter.split("\n").some((line) => line.startsWith(field))) throw new Error("SKILL.md missing frontmatter field: " + field);
}
const required = ["# reel-forge Skill", "## 目标", "## 四个人工确认点", "## 样片级硬规则", "### Build Agent", "## Video Shotcraft 接入（可选）", "### TTS", "### B-roll", "### Still / 性能", "### QC", "## 一键入口", "## 完成定义"];
for (const section of required) {
  if (!body.includes(section)) throw new Error("SKILL.md missing section: " + section);
}
for (const token of ["tts-word-boundary", "STRICT_STILLS=1", "G1…Gn", "npm run skill --", "--resume"]) {
  if (!body.includes(token)) throw new Error("SKILL.md missing contract token: " + token);
}
const nameMatch = /^name:\s*(.+)$/m.exec(frontmatter);
const name = nameMatch ? nameMatch[1].trim() : "";
if (name !== "reel-forge") throw new Error("invalid skill name: " + name);

const script = readText("scripts/skill.mjs");
for (const token of ["--source", "--auto-approve", "scripts/run-production.mjs", "scripts/visual_regression.py", "verify:production"]) {
  if (!script.includes(token)) throw new Error("skill runner missing token: " + token);
}

// ---- 1. 文档承诺的命令必须存在 ----
const scripts = Object.keys(JSON.parse(readText("package.json")).scripts || {});
const citedCommands = [...new Set([...body.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]))];
if (!citedCommands.length) throw new Error("SKILL.md cites no npm run command — contract grep is broken");
for (const cmd of citedCommands) {
  if (!scripts.includes(cmd)) throw new Error(`SKILL.md promises "npm run ${cmd}" but package.json has no such script`);
}

// ---- 2. 人工确认点必须与运行时定义一致（双向：文档不多不少）----
const checkpointSection = body.slice(body.indexOf("## 四个人工确认点"), body.indexOf("## 样片级硬规则"));
const documented = [...new Set(Array.from(checkpointSection.matchAll(/\*\*([a-z][a-z-]+)\*\*/g), (m) => m[1]))];
if (!documented.length) throw new Error("SKILL.md 四个人工确认点 section 没有列出任何 id");
const missing = CHECKPOINTS.filter((c) => !documented.includes(c));
const extra = documented.filter((c) => !CHECKPOINTS.includes(c));
if (missing.length || extra.length) {
  throw new Error(`checkpoint drift — doc=${documented.join(",")} runtime=${CHECKPOINTS.join(",")} missing=${missing.join(",")} not_in_runtime=${extra.join(",")}`);
}

// ---- 3. 文档承诺的环境开关必须被实现读取 ----
const implementationFiles = [];
for (const dir of ["scripts", "src"]) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true, recursive: true})) {
    if (!entry.isFile()) continue;
    const rel = path.join(entry.parentPath || entry.path || dir, entry.name).split(path.sep).join("/");
    if (rel.startsWith("scripts/verify-")) continue; // 门禁自己写着开关名不算实现
    if (/\.(mjs|js|py|sh)$/.test(entry.name)) implementationFiles.push(rel);
  }
}
const implementation = implementationFiles.map((f) => readText(f)).join("\n");
const envFlags = [...new Set(Array.from(body.matchAll(/\b([A-Z][A-Z0-9_]{3,})=(\S+)/g), (m) => m[1]))];
for (const flag of envFlags) {
  const readJs = new RegExp(`process\\.env\\.${flag}\\b|process\\.env\\[["']${flag}["']\\]`);
  const readPy = new RegExp(`environ\\.get\\(["']${flag}["']|environ\\[["']${flag}["']\\]`);
  if (!readJs.test(implementation) && !readPy.test(implementation)) {
    throw new Error(`SKILL.md promises ${flag} but no script/src reads process.env.${flag}`);
  }
}

// ---- 4. 一键链里**步骤之间的顺序**也是契约 ----
// 历史形状：scripts/qc.mjs 在 artifacts/<pid>/qc/plan_audit.json 不存在时，把 plan_audit_missing
// 记成**阻断** issue；而 skill.mjs 的 run() 见非零就 throw。两者相遇的结果是
// 「分镜合规审计从没跑过」在一键链里表现为「qc 失败并中断」，而不是可修的「审计缺失」。
// 所以这里断言的是顺序 + 调用形态，而不是「有没有出现过 plan-audit」——
// 把调用挪到 qc 之后照样 grep 得过，却把坑原样留着。
//
// ⚠ 一律锚到**行首的调用语句**：正文注释里也会写到 run("npm",["run","qc"])（就是在解释这个坑），
//    不锚行首的话注释会先命中，于是「qc 在 plan-audit 之前」这种假失败真的会自己冒出来。
function callSite(pattern) {
  const match = pattern.exec(script);
  if (!match) return null;
  const start = script.lastIndexOf("\n", match.index) + 1;
  const end = script.indexOf("\n", match.index);
  return {index: match.index, line: script.slice(start, end < 0 ? undefined : end).trim(), at: script.slice(0, match.index).split("\n").length};
}
const qcCall = callSite(/^\s*run\(\s*"npm"\s*,\s*\[\s*"run"\s*,\s*"qc"\s*\]/m);
if (!qcCall) throw new Error("scripts/skill.mjs 里找不到 qc 的调用语句（行首 run(\"npm\",[\"run\",\"qc\"])）—— 这条顺序断言已经测不到任何东西");
const auditCall = callSite(/^\s*(run|runSoft)\(\s*"node"\s*,\s*\[\s*"scripts\/plan-audit\.mjs"/m);
if (!auditCall) throw new Error("scripts/skill.mjs 没有跑 plan-audit：qc 会把缺 plan_audit.json 记成阻断 issue 并掐断一键链");
if (auditCall.index > qcCall.index) throw new Error(`plan-audit 必须在 qc 之前（现在 plan-audit:L${auditCall.at} 在 qc:L${qcCall.at} 之后，qc 读到的仍是「审计缺失」）`);
// 容忍型：审计在「分镜自己就矛盾」时非零退出，那是留给 repair-cycle 消化的输入，不是让链停在这里的理由。
if (!auditCall.line.startsWith("runSoft(")) throw new Error(`plan-audit 必须用容忍型调用（runSoft），现在是：${auditCall.line}`);
const repairCycle = callSite(/^\s*run\(\s*"npm"\s*,\s*\[\s*"run"\s*,\s*"repair-cycle"\s*\]/m);
if (!repairCycle) throw new Error("scripts/skill.mjs 不再跑 repair-cycle：plan-audit 的软失败没人消化了，这条容忍必须改成硬失败");

console.log("skill contract PASS", JSON.stringify({name, sections: required.length, cli: "npm run skill", commands: citedCommands.length, checkpoints: documented.length, env_flags: envFlags.length, pipeline_order: "plan-audit → qc（容忍型）"}));
