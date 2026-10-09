import fs from "node:fs";
import path from "node:path";
import {validate} from "../src/contracts/validate.mjs";

/**
 * 契约门：contracts/*.schema.json 必须真能量到产物。
 *
 * 旧写法是整个文件：
 *   for (const f of readdirSync("contracts")) JSON.parse(readFileSync(f));
 * 那是「这 17 个文件是合法 JSON」，一条契约断言都没执行过 —— 典型的假门禁：
 * 它对失败的预期是 0，所以它没有信息量，而 README/状态文档会让人以为产物被校验着。
 * 现在钉住三件事：
 *   1. 校验器自己先被变异用例跑一遍（校验器写错了比没有校验器更糟）；
 *   2. 每个 schema 都必须在 CONTRACTS 里**认领一个产物**，没认领的一律 FAIL（不许有装饰性契约）；
 *   3. 认领了但产物还没生成的（流水线后段），明确打 unexercised 并指名是谁该写出它，
 *      而不是悄悄算通过。
 */

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

// ---- 1) 校验器自测：每条都对应契约文件里真用到的一个关键字 ----
const selfTests = [
  ["缺必填字段要报出来", () => validate({type: "object", required: ["a"], properties: {a: {type: "string"}}}, {}).length === 1],
  ["additionalProperties:false 拒多余字段", () => validate({type: "object", properties: {a: {}}, additionalProperties: false}, {a: 1, b: 2}).length === 1],
  ["additionalProperties:false 不收已登记字段", () => validate({type: "object", properties: {a: {}}, additionalProperties: false}, {a: 1}).length === 0],
  ["integer 不收小数", () => validate({type: "integer"}, 1.5).length === 1],
  ["number 收整数", () => validate({type: "number"}, 3).length === 0],
  ["const 要精确匹配", () => validate({type: "integer", const: 30}, 25).length === 1 && validate({type: "integer", const: 30}, 30).length === 0],
  ["enum 成员外要报", () => validate({enum: ["PASS", "FAIL"]}, "WARN").length === 1],
  ["pattern 生效", () => validate({type: "string", pattern: "^assets/"}, "public/x.mp4").length === 1],
  ["minItems / maxItems 生效", () => validate({type: "array", minItems: 1}, []).length === 1 && validate({type: "array", maxItems: 1}, [1, 2]).length === 1],
  ["items 递归到每个元素", () => validate({type: "array", items: {type: "object", required: ["x"], properties: {x: {}}}}, [{x: 1}, {}]).length === 1],
  ["exclusiveMinimum 是严格大于", () => validate({type: "number", exclusiveMinimum: 0}, 0).length === 1],
  ["if/then 只在命中时施加约束", () => {
    const schema = {type: "array", allOf: [{if: {minItems: 1}, then: {maxItems: 1}}]};
    return validate(schema, [1, 2]).length === 1 && validate(schema, []).length === 0 && validate(schema, [1]).length === 0;
  }],
  ["类型不符时不再刷子字段错误", () => validate({type: "object", required: ["a"], properties: {a: {}}}, []).length === 1],
  // 注记关键字（description / $schema）跳过不校验，但它们**不产生任何约束**：
  // 只有 description 的契约等于没契约，别让人以为写了说明就等于管住了。
  ["description 是注记：不校验也不顶替约束", () => validate({description: "注记"}, 42).length === 0 && validate({description: "注记", type: "string"}, 42).length === 1],
  ["if/then 里的子约束真的生效", () => {
    const schema = {type: "object", properties: {status: {enum: ["ok", "skipped"]}, output: {}}, allOf: [{if: {properties: {status: {const: "skipped"}}, required: ["status"]}, then: {properties: {output: {type: "object", required: ["reason"], properties: {reason: {type: "string"}}, additionalProperties: false}}}}]};
    const missingReason = validate(schema, {status: "skipped", output: {}}).length === 1;
    const smuggledVerdict = validate(schema, {status: "skipped", output: {reason: "r", verdict: "PASS"}}).length === 1;
    const cleanSkip = validate(schema, {status: "skipped", output: {reason: "r"}}).length === 0;
    const notTriggered = validate(schema, {status: "ok", output: "任意"}).length === 0;
    return missingReason && smuggledVerdict && cleanSkip && notTriggered;
  }],
  ["不认识的关键字必须抛错，不能静默通过", () => {
    try {
      validate({format: "date"}, "2026-01-01");
      return false;
    } catch (error) {
      return /不支持的关键字/.test(String(error.message));
    }
  }],
  // 静态对撞用的取键器（见文件下方 objectLiteralKeys）。它本身也要被测：
  // 取错键方向的门会把「契约与生产者一致」说成不一致，或把不一致说成一致。
  ["取键：只取第一层，嵌套对象的键不外泄", () => objectLiteralKeys('const o={a:1,b:{c:2},d:3}', "const o=").keys.join(",") === "a,b,d"],
  ["取键：字符串里的花括号与逗号不切段", () => objectLiteralKeys('const o={a:"x{y,}",b:2}', "const o=").keys.join(",") === "a,b"],
  ["取键：shorthand 也算字段", () => objectLiteralKeys('const o={a:1,engine,voice}', "const o=").keys.join(",") === "a,engine,voice"],
  ["取键：认出展开写法并如实说「测不全」", () => objectLiteralKeys('const o={...base,a:1}', "const o").spread === true],
  ["取键：锚点找不到时返回 null 而不是空键表", () => objectLiteralKeys('const o={a:1}', "const nope=") === null],
];
const selfFailed = [];
for (const [name, fn] of selfTests) {
  let ok = false;
  let note = "";
  try {
    ok = fn() === true;
  } catch (error) {
    ok = false;
    note = " — " + error.message;
  }
  if (!ok) selfFailed.push(name + note);
  console.log((ok ? "ok   " : "FAIL ") + "校验器：" + name);
}
if (selfFailed.length) {
  console.error("\nCONTRACT VERIFY FAIL 校验器自测未通过：" + selfFailed.join(" / "));
  process.exit(1);
}

/**
 * 从源码文本里，把 anchor 处那个**对象字面量第一层**的键名取出来。
 *
 * 只用来静态对撞「生产者写了哪些键 / 契约承认哪些键」，不解释值、不求值。
 * 返回 `{keys, spread}`；锚点在文件里找不到时返回 null（调用方必须把它当失败，
 * 而不是当「没有键要对」—— 锚点过期就等于这条门不再检查任何东西）。
 *
 * shorthand（`{engine,voice}`）也算真字段：tts_build 的时间轴与 voice-manifest 都这么写，
 * 漏掉它会让「契约 required 的键必须被写出来」这一向假失败。
 */
function objectLiteralKeys(source, anchor) {
  const at = source.indexOf(anchor);
  if (at < 0) return null;
  const open = source.indexOf("{", at);
  if (open < 0) return null;

  // 1) 取最外层花括号里的正文（字符串原样带过，嵌套括号只保配对）。
  let body = "";
  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      body += ch;
      if (ch === "\\") { body += source[++i] ?? ""; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; body += ch; continue; }
    if (ch === "{" || ch === "[" || ch === "(") { depth++; if (depth > 1) body += ch; continue; }
    if (ch === "}" || ch === "]" || ch === ")") { depth--; if (depth === 0) break; body += ch; continue; }
    if (depth >= 1) body += ch;
  }

  // 2) 只在最外层按逗号切段，然后每段判「键:」/ shorthand / 展开。
  const parts = [];
  let current = "";
  let d = 0;
  let q = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (q) {
      current += ch;
      if (ch === "\\") current += body[++i] ?? "";
      else if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; current += ch; continue; }
    if (ch === "{" || ch === "[" || ch === "(") { d++; current += ch; continue; }
    if (ch === "}" || ch === "]" || ch === ")") { d--; current += ch; continue; }
    if (ch === "," && d === 0) { parts.push(current); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);

  const keys = [];
  let spread = false;
  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;
    if (text.startsWith("...")) { spread = true; continue; }
    const pair = /^([A-Za-z_$][\w$]*)\s*:/.exec(text);
    if (pair) { keys.push(pair[1]); continue; }
    if (/^[A-Za-z_$][\w$]*$/.test(text)) keys.push(text);
  }
  return {keys: [...new Set(keys)], spread};
}

// ---- 2) 契约 ↔ 产物 ----
const schemaDir = "contracts";
const schemaNames = fs.readdirSync(schemaDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.schema\.json$/, ""));

/**
 * 每个契约在这里认领它的产物。
 *   file    产物路径（<pid> 由 fixtures/project.json 的 project_id 代入，换片子不用改门）。
 *   each    取该数组字段，逐个按 schema 校验（schema 描述的是元素而不是文件）。
 *   sub     each 之后再多钻一层（scene.motion 是「镜头里的数组」，schema 描述的是一条 motion）。
 *   pick    取该字段后按 schema 校验；optionalPick = 字段可以不存在（footage 就是可选层）。
 *   make    即时由代码生成产物再校验 —— 这类契约每次都真跑，不依赖流水线。
 *   stage   产物由哪一步写出；还没生成时打 skip 并指名它，绝不静默算通过。
 */
const PID = readJson("fixtures/project.json").project_id;
const CONTRACTS = [
  {name: "project", file: "fixtures/project.json"},
  {name: "script", file: "fixtures/script.json"},
  {name: "render-ir", file: "fixtures/render-ir.json"},
  {name: "render-ir", file: "fixtures/render-ir-16x9.json"},
  {name: "render-ir", file: "fixtures/render-ir-9x16.json"},
  {name: "captions", file: "fixtures/captions.json"},
  {name: "visual-benchmark", file: "fixtures/visual-benchmark.json"},
  {name: "footage", file: "fixtures/render-ir-16x9.json", pick: "footage", optionalPick: true},
  {name: "motion", file: "fixtures/render-ir-16x9.json", each: "scenes", sub: "motion"},
  {name: "beat", file: "artifacts/demo-production/beats.json", each: "beats", stage: "npm run verify:visual"},
  {name: "scene", file: "artifacts/demo-production/scene.json", each: "scenes", stage: "npm run verify:visual"},
  {name: "hyperframes", file: "fixtures/render-ir-16x9.json", make: (ir) => import("../src/backends/hyperframes-project.mjs").then((m) => m.buildHyperFramesProject(ir)), stage: "src/backends/hyperframes-project.mjs"},
  {name: "timeline", file: "script/timeline.json", stage: "npm run tts"},
  {name: "word-timing", file: "script/timeline-source.json", stage: "npm run tts"},
  {name: "voice-manifest", file: `artifacts/${PID}/audio/voice-manifest.json`, stage: "npm run tts"},
  {name: "qc", file: `artifacts/${PID}/qc/report.json`, stage: "npm run qc"},
  {name: "agent", file: `artifacts/${PID}/qc/report.json`, each: "agent_reviews", stage: "npm run qc（信封在 report.agent_reviews 里）"},
  {name: "delivery", file: `artifacts/delivery/${PID}/delivery-manifest.json`, stage: "npm run deliver"},
  {name: "research", file: `artifacts/${PID}/research.json`, stage: "npm run run-production"},
];

function itemsOf(entry, doc) {
  let values = [doc];
  if (entry.each) {
    if (!Array.isArray(doc[entry.each])) return null;
    values = doc[entry.each];
  }
  if (entry.sub) values = values.flatMap((v) => (Array.isArray(v?.[entry.sub]) ? v[entry.sub] : []));
  if (entry.pick) {
    if (!(entry.pick in doc)) return entry.optionalPick ? [] : null;
    values = [doc[entry.pick]];
  }
  return values;
}

const exercised = [];
const unexercised = [];
const failures = [];
for (const entry of CONTRACTS) {
  const schemaFile = path.join(schemaDir, entry.name + ".schema.json");
  if (!fs.existsSync(schemaFile)) {
    failures.push(`${entry.name}：契约在这里被认领，但 ${schemaFile} 不存在（改名了还是删了？）`);
    continue;
  }
  let schema;
  try {
    schema = readJson(schemaFile);
  } catch (error) {
    // 契约自己写坏了要指名道姓：裸 JSON.parse 回溯只给「position 709」，
    // 而这一门管着 18 个 schema，人不该靠数数字找文件。
    failures.push(`${entry.name}：${schemaFile} 不是合法 JSON（${error.message}）`);
    continue;
  }
  if (entry.make) {
    // make 是异步的（要 import 生成器）；这类契约每次真生成一遍产物，等价于永远 exercised。
    continue;
  }
  if (!fs.existsSync(entry.file)) {
    unexercised.push({name: entry.name, file: entry.file, stage: entry.stage || "未声明由谁生成"});
    continue;
  }
  const doc = readJson(entry.file);
  const values = itemsOf(entry, doc);
  if (values === null) {
    failures.push(`${entry.name}：${entry.file} 里找不到要校验的字段（契约认领错了？）`);
    continue;
  }
  // 0 项不算 exercised：那等于「这道门这一轮什么都没检查却报了 ok」。footage 没启用、
  // 镜头没有 motion 都是真的没东西可校验，就照实说没东西可校验。
  if (!values.length) {
    unexercised.push({name: entry.name, file: entry.file + (entry.pick ? " / " + entry.pick : ""), stage: entry.stage || "该产物当前为空，没有可校验的元素"});
    continue;
  }
  const errors = values.flatMap((value, index) => validate(schema, value, `${entry.file}[${index}]`));
  const label = `${entry.name} ← ${entry.file}${entry.each ? " / " + entry.each : entry.pick ? " / " + entry.pick : ""}（${values.length} 项）`;
  if (errors.length) failures.push(`${label}\n     ` + errors.slice(0, 8).join("\n     ") + (errors.length > 8 ? `\n     …共 ${errors.length} 条` : ""));
  else exercised.push(label);
}

// 生成式契约（hyperframes）单独处理：await import 后立刻校验。
for (const entry of CONTRACTS.filter((e) => e.make)) {
  const schema = readJson(path.join(schemaDir, entry.name + ".schema.json"));
  const doc = fs.existsSync(entry.file) ? readJson(entry.file) : null;
  if (!doc) {
    failures.push(`${entry.name}：生成器需要 ${entry.file}，文件不在`);
    continue;
  }
  const generated = await entry.make(doc);
  const errors = validate(schema, generated, `${entry.name}(generated from ${entry.file})`);
  if (errors.length) failures.push(`${entry.name}（由 ${entry.stage} 现场生成）\n     ` + errors.slice(0, 8).join("\n     "));
  else exercised.push(`${entry.name} ← ${entry.stage}(现场生成)`);
}

// 反向：contracts/ 里每个 schema 都要有人认领 —— 没人认领的契约就是下一个假门禁。
const claimed = new Set(CONTRACTS.map((e) => e.name));
const orphans = schemaNames.filter((name) => !claimed.has(name));
if (orphans.length) failures.push("没有任何产物被这些契约认领（装饰性契约）：" + orphans.join(", "));

// ---- 3) 生产者 ↔ 契约字段的静态对撞 ----
// 上面那一段只在**产物存在时**才校验它。timeline / voice-manifest 由 scripts/tts_build.mjs 写出，
// 而它在本地和 CI 都要真跑配音才有输出 —— 于是「契约少登记一个字段」这种错要等到第一次真跑
// TTS 才红，而那时人在等音频，不会去查 schema。历史形状就出在这里：voice-manifest 契约
// additionalProperties:false 却不认生产者一直在写的 rate / timing_mode。
// 这里不执行 TTS，只读生产者的对象字面量，与契约的 properties / required 对撞。
const PRODUCER_ALIGN = [
  {name: "timeline", source: "scripts/tts_build.mjs", anchor: "const timeline={"},
  {name: "voice-manifest", source: "scripts/tts_build.mjs", anchor: '"voice-manifest.json"),JSON.stringify({'},
];
const alignNotes = [];
const aligned = [];
for (const producer of PRODUCER_ALIGN) {
  const schemaFile = path.join(schemaDir, producer.name + ".schema.json");
  if (!fs.existsSync(producer.source) || !fs.existsSync(schemaFile)) {
    failures.push(`${producer.name}：对撞两端缺一端（${producer.source} 或 ${schemaFile} 不在）`);
    continue;
  }
  const produced = objectLiteralKeys(fs.readFileSync(producer.source, "utf8"), producer.anchor);
  if (!produced) {
    failures.push(`${producer.name}：${producer.source} 里找不到锚点「${producer.anchor}」—— 生产者写法变了，这条静态对撞已经测不到任何东西`);
    continue;
  }
  const schema = readJson(schemaFile);
  const declared = Object.keys(schema.properties || {});
  const required = schema.required || [];
  const undeclared = produced.keys.filter((key) => !declared.includes(key));
  const missingRequired = produced.spread ? [] : required.filter((key) => !produced.keys.includes(key));
  const unused = declared.filter((key) => !produced.keys.includes(key));
  if (undeclared.length) {
    failures.push(`${producer.name}：${producer.source} 在写契约里没有的字段 ${undeclared.join(", ")}（additionalProperties:false 会在产物真出现时把它判死）`);
  }
  if (missingRequired.length) {
    failures.push(`${producer.name}：契约 required ${missingRequired.join(", ")}，但 ${producer.source} 没写这些键`);
  }
  if (produced.spread) alignNotes.push(`${producer.name}：生产者用了展开写法（…base），静态对撞只能查已显式写出的键，required 方向跳过`);
  if (unused.length) alignNotes.push(`${producer.name}：契约登记了但生产者当前没写：${unused.join(", ")}`);
  if (!undeclared.length && !missingRequired.length) {
    aligned.push(`${producer.name} ← ${producer.source} 的字段表（${produced.keys.length} 个键）`);
  }
}

for (const line of exercised) console.log("ok   " + line);
for (const line of aligned) console.log("ok   静态对撞（不等产物）：" + line);
for (const note of alignNotes) console.log("note " + note);
for (const item of unexercised) {
  console.log(item.stage.startsWith("npm") || item.stage.startsWith("src")
    ? `skip ${item.name} ← ${item.file} 还没生成（由 ${item.stage} 写出；一存在本门就真校验它）`
    : `skip ${item.name} ← ${item.file}：${item.stage}`);
}
if (failures.length) {
  console.error("\nCONTRACT VERIFY FAIL " + JSON.stringify({failures: failures.length, exercised: exercised.length}));
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`contracts PASS ${exercised.length} 个契约真校验了产物，${aligned.length} 个与生产者的字段表静态对撞，${unexercised.length} 个等产物生成，0 个装饰性契约`);
