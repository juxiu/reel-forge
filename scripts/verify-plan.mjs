import fs from "node:fs";
import path from "node:path";
import {PIXEL_REPAIRS} from "../src/repair/engine.mjs";
import {REPAIR_ACTIONS} from "../src/shots/plan.mjs";

/**
 * 计划文档 ↔ 真实代码的一致性门（原来只是 4 次 t.includes(...)）。
 *
 * 旧写法能给出的唯一保证是「md 里出现过这几行字」，代码怎么改它都不在乎 ——
 * 这是最典型的假门禁：它对失败的预期是 0，所以它没有信息量。
 * 现在钉住三件可核对的事：
 *   1. 文档里点名的每个文件路径必须找得到，`.mjs` 还要真 import 一次
 *      （能 import = 至少语法通、顶层不炸）；
 *   2. 文档里写的每条 `npm run X` 必须真在 package.json 的 scripts 里；
 *   3. Scoped Repair 的「确定性修复」清单必须和代码里的两张表**逐条**对上
 *      （PIXEL_REPAIRS 的 ir 真值 + REPAIR_ACTIONS 的 auto 真值），
 *      而两张表里登记的每个 token 都必须在文档里说一句 ——
 *      「代码里有、文档里没」和「文档里有、代码里没」是同一类漂移的两个方向。
 */

const planDoc = "docs/IMPLEMENTATION_PLAN.md";
if (!fs.existsSync(planDoc)) throw new Error(planDoc + " missing");
if (!fs.existsSync("docs/REFERENCE_PROCESS.md")) throw new Error("reference process doc missing");
const doc = fs.readFileSync(planDoc, "utf8").replace(/\r\n/g, "\n");

for (const k of ["P1 Agent Runtime", "P7 Persistent Production", "真实 TTS", "Scoped Repair"]) {
  if (!doc.includes(k)) throw new Error("plan missing " + k);
}

const scripts = Object.keys(JSON.parse(fs.readFileSync("package.json", "utf8")).scripts || {});
const citedCommands = [...new Set(Array.from(doc.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g), (m) => m[1]))];
for (const cmd of citedCommands) {
  if (!scripts.includes(cmd)) throw new Error(`计划里写着 "npm run ${cmd}"，package.json 没有这条 script`);
}

/** 文档里的路径 token 找得到才算数；占位写法（src/shots/Gn/SCnn.jsx）展开成真实文件再核。 */
function locatable(token) {
  if (fs.existsSync(token)) return token;
  if (!/Gn|SCx|SCn/i.test(token)) return null;
  // 占位段按位置逐段展开：Gn → G\d+、SCxx/SCnn → SC\d+。
  let hits = [""], done = true;
  for (const seg of token.split("/")) {
    const rx = seg.replace(/\./g, "\\.").replace(/Gn/g, "G\\d+").replace(/SC(?:x{2}|n{2})/g, "SC\\d+");
    const next = [];
    for (const prefix of hits) {
      const dir = prefix || ".";
      if (!fs.existsSync(dir)) {done = false; break;}
      for (const entry of fs.readdirSync(dir)) if (new RegExp("^" + rx + "$").test(entry)) next.push(prefix ? prefix + "/" + entry : entry);
    }
    if (!done) return null;
    hits = next;
    if (!hits.length) return null;
  }
  return hits[0].replace(/^\//, "");
}

// 扩展名列在前面短的会吃掉长的（`js` 抢先匹配 `json` 的前两个字母），所以长的排前 + 词边界。
// 前导字符按「不是路径字符」判，而不是只列几个括号：文档里路径常跟在中文冒号后面
// （「持久化执行状态：src/core/runtime.mjs」），只认 ASCII 括号会漏掉一整批点名。
const PATH_RX = /(^|[^A-Za-z0-9_./-])((?:src|scripts|fixtures|docs|script)\/[A-Za-z0-9_./-]+\.(?:jsx|mjs|json|md|py|js)\b)/g;
const pathTokens = [...new Set(Array.from(doc.matchAll(PATH_RX), (m) => m[2]))];
const missing = [];
let imported = 0;
for (const token of pathTokens) {
  const found = locatable(token);
  if (!found) {
    missing.push(token);
    continue;
  }
  if (/^src\//.test(found) && found.endsWith(".mjs")) {
    // 只有 src 下的库模块才 import：scripts/*.mjs 是入口脚本，import 就等于跑它
    // （verify-visual-regression.mjs 一上来就找 QC 产物，直接抛错）。
    // 脚本的语法由 verify:syntax 用 node --check 统一管。
    try {
      await import("../" + found);
      imported++;
    } catch (error) {
      throw new Error(`${found} 文档点名要能用，但 import 失败：${error.message}`);
    }
  } else if (fs.statSync(found).size === 0) {
    missing.push(found + "（空文件）");
  }
}
if (missing.length) throw new Error("计划点名但仓库里找不到的文件：" + missing.join(", "));

// Scoped Repair 的问题类型：两边都从**结构**里取，不做松散的单词扫描
// （松散扫描会把 plan_audit.json / hero_scale 这种文件名和字段名也当成「承诺支持的类型」）。
// 真源是两张表，不是引擎里的 `issue.type === "x"` 字面量：像素层现在按 PIXEL_REPAIRS 路由，
// 再按字面量扫就只能看见分镜层那两个分支，像素层等于没被核对过。
const repairSection = /## Scoped Repair\n([\s\S]*?)(?=\n## |$)/.exec(doc)?.[1];
if (!repairSection) throw new Error("计划里没有 ## Scoped Repair 段落");
const autoInCode = new Set([
  ...Object.keys(PIXEL_REPAIRS).filter((token) => PIXEL_REPAIRS[token].ir),
  ...Object.keys(REPAIR_ACTIONS).filter((token) => REPAIR_ACTIONS[token].auto),
]);
const promised = new Set(
  Array.from(repairSection.matchAll(/确定性修复（IR 上真改）[：:]\s*([A-Za-z0-9_/\- ]+)/g), (m) => m[1])
    .flatMap((list) => list.split("/").map((t) => t.trim()).filter(Boolean)),
);
if (!promised.size) throw new Error("计划 Scoped Repair 没列出任何「确定性修复」类型");
for (const type of promised) {
  if (!autoInCode.has(type)) throw new Error(`计划写着 Scoped Repair 确定性修复 ${type}，但 PIXEL_REPAIRS/REPAIR_ACTIONS 里它不是 IR 能改的`);
}
// 反向：表里真能自动改的，文档必须说到（写了没人知道的开关＝下一个假门禁）。
for (const type of autoInCode) {
  if (!promised.has(type)) throw new Error(`${type} 在代码里是 IR 自动修，但计划的「确定性修复」没列它`);
}
// 每个登记过的 token 都要在计划里说一句 —— 升级类（ir:false）也一样，
// 否则下一个人只会往表里再加一条「ir:false」就当处理完了。
const allTokens = [...new Set([...Object.keys(PIXEL_REPAIRS), ...Object.keys(REPAIR_ACTIONS)])];
const undocumented = allTokens.filter((token) => !doc.includes(token));
if (undocumented.length) throw new Error("整改 token 没写进计划（分镜层与像素层都要说一句）：" + undocumented.join(", "));

console.log("plan PASS", JSON.stringify({
  doc_path_tokens: pathTokens.length,
  mjs_imported: imported,
  cited_commands: citedCommands.length,
  repair_types_promised: promised.size,
  repair_types_auto_in_code: autoInCode.size,
  repair_tokens_documented: allTokens.length,
}));
