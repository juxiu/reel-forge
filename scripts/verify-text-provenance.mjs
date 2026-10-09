import fs from "node:fs";
import path from "node:path";
import {buildPlan} from "../src/shots/plan.mjs";

// 画面文字出处门（阻断）
// 依据 anything2explainer 的两条硬判据：
//   SKILL.md 硬性原则 2「事实有出处」——画面上出现的每个数字/英文术语必须能在调研文档里找到来源；
//   examples/rag 的 QC 判据「画面英文/数字逐个核对调研文档」。
// reel-forge 此前声称"事实可回溯"，但没有任何代码检查画面文字；这里补上闭环。
//
// 四部分：
//   A1 IR 文案      —— fixtures/render-ir-* 的 elements[*].text 必须能在解说词里找到，其中的数字必须有出处。
//   A2 真上画面的文案 —— 经 src/shots/plan.mjs 归一后**确实会被渲染**的 hero / support 文案：
//                        数字一律要出处（白名单豁免不了数字）；没出处的非数字文案出声、暂不阻断（理由见 §A2）。
//   B  字面量白名单  —— 渲染源码里所有会上画面的硬编码文案必须显式登记，新增未登记文案即失败。
//   C  双比例一致    —— 同一 scene 在 16:9 / 9:16 的时长、顺序、变体必须一致。
//
// ⚠ 为什么 A2 必须存在（2026-10 实测，别把这段当解释）：
//   A1 查的是 IR 里的整句解说词，而 plan 层**故意不把整句画上画面**——
//     heroTextOf 拒收 >12 宽度单位的句子（src/shots/plan.mjs:153），
//     pickSupport 把 textEm>12 的 box 元素直接跳过（src/shots/plan.mjs:190）。
//   于是 A1 查到的那 4 条恰好是**唯一不会上画面**的文字；真正画上屏幕的是
//   recipe.labels（src/shots/Gn/SCnn.jsx 的对象数组）、变体骨架标签（src/shots/plan.mjs:246-256）、
//   以及 hero-overlong 兜底时的 scene.narrative_job 枚举 token（src/shots/plan.mjs:145）。
//   实测 digest 样片：A1 看 4 条，画面真上 20 条，两者交集 1 条 —— 只有 A1 的门
//   在「满屏无出处英文 token」的片子上会全绿。同理 B 段以前的三条正则
//   只认 `text={"…"}` / `labels||[…]` / `>文案<` 三种形状，本仓库一条都没有，
//   于是 discovered_literals 恒为 0、unregistered 恒为空、门恒绿；登记的 34 条里 30 条
//   早就从源码里消失了。所以现在加了「扫描器自检」和「零发现即失败」两条反脱节断言。

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const artifacts = path.join("artifacts", project.project_id);
const write = process.argv.includes("--write");

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}
const norm = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

const script = readJson(path.join(artifacts, "script.json"), readJson("fixtures/script.json", { segments: [] }));
const research = readText(path.join(artifacts, "research.md")) + "\n" + readText(path.join(artifacts, "research.json"));
const narration = script.segments.map((s) => String(s.text || "")).join("\n");
const narrationNorm = norm(narration);
const researchNorm = norm(research);

const wide = readJson("fixtures/render-ir-16x9.json", { scenes: [] });
const tall = readJson("fixtures/render-ir-9x16.json", { scenes: [] });
const issues = [];
const facts = [];
const rendered = [];
const unsourced = [];

// ---- A1. IR 文案 ----
for (const [ratio, ir] of [["16x9", wide], ["9x16", tall]]) {
  for (const scene of ir.scenes || []) {
    for (const element of scene.elements || []) {
      const text = String(element.text || "").trim();
      if (!text) continue;
      // ⚠ `type:"narration"` 的元素是**解说词本身**，不是画面文案 ——
      //   IR 用它带时间轴（这一镜从第几帧到第几帧在说这句），而 a2e 硬规则明确
      //   「整句解说词不进画面」（plan.mjs 的 heroTextOf 也拒收 >12 宽度单位的句子）。
      //   所以它不该按「画面文字」判出处。A1 段早先没这个分支，于是整段解说词被判
      //   「无出处」，88 条issues —— 门在抱怨一件本来就不该发生的事。
      //   判据：只有会被当画面文案用的类型（card/text/label 之类）才查。
      const elType = String(element.type || "").toLowerCase();
      if (elType === "narration" || elType === "caption" || elType === "subtitle") continue;
      facts.push({ ratio, scene: scene.id, element: element.id, chars: text.length });
      const probe = norm(text).slice(0, 80);
      if (probe && !narrationNorm.includes(probe)) {
        issues.push(ratio + "/" + scene.id + ": on-screen text is not traceable to the script: " + text.slice(0, 60));
      }
      for (const number of text.match(/\d+(?:\.\d+)?/g) || []) {
        if (!narrationNorm.includes(number) && !researchNorm.includes(number)) {
          issues.push(ratio + "/" + scene.id + ": on-screen number has no source: " + number);
        }
      }
    }
  }
}

// ---- A2. 真上画面的文案 ----
// registry.jsx → scene id → 镜头源文件；recipe 取法与 scripts/plan-audit.mjs:39-56 同一形状
// （括号配对 + new Function 求值），不是字符串包含判断 —— 字符串判断会把
// `labels:["a","b"]` 看成"没有文案"，而它每个元素都要上画面。
function shotIndexByScene() {
  const index = new Map();
  for (const m of readText("src/shots/registry.jsx").matchAll(/["']([^"']+)["']\s*:\s*(G\d+)\.([A-Za-z0-9_]+)/g)) {
    index.set(m[1], path.join("src", "shots", m[2], m[3] + ".jsx"));
  }
  return index;
}
function recipeFrom(shotFile) {
  const source = readText(shotFile);
  const start = source.indexOf("SHOT_RECIPE");
  const brace = source.indexOf("{", start);
  if (start < 0 || brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}" && --depth === 0) {
      try {
        return new Function("return (" + source.slice(brace, i + 1) + ");")();
      } catch {
        return null;
      }
    }
  }
  return null;
}
const sceneShotFiles = shotIndexByScene();

function renderedTexts(ir) {
  const rows = [];
  let withoutShot = 0;
  for (const scene of ir.scenes || []) {
    const file = sceneShotFiles.get(String(scene.id)) || null;
    const available = file && fs.existsSync(file);
    if (!available) withoutShot += 1;
    const plan = buildPlan({scene, recipe: available ? (recipeFrom(file) || {}) : {}, captions: [], fps: 30});
    const push = (role, value) => {
      const text = String(value ?? "").trim();
      if (text) rows.push({scene: String(scene.id), role, text, shot_file: available ? file : null});
    };
    push("hero", plan.hero?.text);
    push("hero.sub", plan.hero?.sub);
    push("hero.unit", plan.hero?.unit);
    for (const item of plan.items || []) {
      push("support:" + item.kind, item.text);
      push("support.unit", item.unit);
    }
  }
  return {rows, withoutShot};
}

const allowlistFile = "fixtures/visual-literals.json";
function registeredSet() {
  return new Set((readJson(allowlistFile, { literals: [] }).literals || []).map((x) => (typeof x === "string" ? x : x.literal)));
}
const allow = registeredSet();
let scenesWithoutShot = 0;

for (const [ratio, ir] of [["16x9", wide], ["9x16", tall]]) {
  const {rows, withoutShot} = renderedTexts(ir);
  scenesWithoutShot = Math.max(scenesWithoutShot, withoutShot);
  for (const row of rows) {
    rendered.push({ratio, ...row});
    // 数字：注册进白名单也不能豁免。白名单管的是「结构标签可以不念」，
    // 不是「登记过的字就可以没有出处」—— a2e 事实规则第 1 条要的是数字/年份/机构/人名逐个有出处。
    for (const number of row.text.match(/\d+(?:\.\d+)?/g) || []) {
      if (!narrationNorm.includes(number) && !researchNorm.includes(number)) {
        issues.push(ratio + "/" + row.scene + ": rendered " + row.role + " number has no source: " + number + "（文案：" + row.text.slice(0, 40) + "）");
      }
    }
    const probe = norm(row.text).slice(0, 80);
    const traced = probe && (narrationNorm.includes(probe) || researchNorm.includes(probe));
    if (!traced && !allow.has(row.text)) unsourced.push({ratio, scene: row.scene, role: row.role, text: row.text, shot_file: row.shot_file});
  }
}

// ---- B. 字面量白名单 ----
// ⚠ 通道清单必须与「画面文字的出身」对齐（src/shots/plan.mjs 的 DISPLAY_KEYS 与 pickHero/pickSupport）：
//   少一条通道，B 就退化成"扫不到东西所以永远绿"，而那正是它上一版失效的原因。
// ⚠ 双引号串必须允许转义（`(?:[^"\\\n]|\\.){2,}`）：报文/头字段类文案天然带引号，
//   例如 text: "username=\"Mufasa\""。旧式 `[^"'\n]{2,}` 会在第一个 \" 处截断，
//   把整条文案登记成碎片 `username=\` —— 白名单里躺着一条谁也认不出的垃圾，
//   而真正上画面的 `username="Mufasa"` 从未被登记。这正是本脚本注释里
//   记着的「扫不到东西所以全绿」那类假绿，只是发生在引号上。
const attrLiteral = /\b(?:text|title|label|alt|caption|placeholder|display|headline|sub|unit|fallback_hero)\s*[:=]\s*\{?\s*(?:"((?:[^"\\\n]|\\.){2,})"|'([^'\n]{2,})')/g;
const stringArray = /\b(?:labels|rows|key_terms|chips|steps)\s*:\s*\[([^\]]*)\]/g;
const legacyFallback = /\b(?:labels|rows)\|\|\[([^\]]*)\]/g;
const jsxChildren = />([^<>{}"\n][^<>{}"\n]{1,})</g;
const quotedChildren = />\s*["']([^"'<>{}\n]{2,})["']\s*</g;
const ignore = /^[\s\d.,:;!?/\\|()[\]{}+\-*=<>]*$/;

function pushLiteral(found, raw) {
  // 源码里是转义写法（\"），登记的是上屏的真实文案 —— 两边必须一致，
  // 否则白名单里躺着 `username=\` 这种碎片，而真文案永远缺登记。
  let value = String(raw || "").replace(/\\(["'`\\])/g, "$1").replace(/\s+/g, " ").trim();
  //⚠ 只在**整条都被同一种引号包住**时才剥引号。
  //   旧写法 /^["'`]|["'`]$/g 是「开头或结尾」两条独立分支，会把
  //   username="mutK" 这种**结尾真引号**也吃掉，登记成 username="mutK，
  //   于是刚修好的转义引号支持又被这里弄坏，报错信息还指向扫描器（误导）。
  const wrapped = value.match(/^(["'`])([\s\S]*)\1$/);
  if (wrapped) value = wrapped[2].trim();
  if (!value || value.length < 2) return;
  if (ignore.test(value)) return;
  if (!/[a-zA-Z一-鿿]/.test(value)) return;
  if (/^(rgba?|calc|var|px|rem|em|flex|none|solid|absolute|relative|center|left|right|top|bottom|hidden)$/i.test(value)) return;
  found.add(value);
}

function literalsInSource(source) {
  const found = new Set();
  for (const m of source.matchAll(attrLiteral)) pushLiteral(found, m[1] ?? m[2]);
  for (const m of source.matchAll(stringArray)) for (const part of m[1].split(",")) pushLiteral(found, part);
  for (const m of source.matchAll(legacyFallback)) for (const part of m[1].split(",")) pushLiteral(found, part);
  for (const m of source.matchAll(jsxChildren)) pushLiteral(found, m[1]);
  for (const m of source.matchAll(quotedChildren)) pushLiteral(found, m[1]);
  return found;
}

function shotSources() {
  const files = [path.join("src", "shots", "SemanticShots.jsx"), path.join("src", "shots", "plan.mjs")];
  for (const group of fs.readdirSync(path.join("src", "shots"), { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    const dir = path.join("src", "shots", group.name);
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith(".jsx")) files.push(path.join(dir, entry));
    }
  }
  return files.filter((file) => fs.existsSync(file));
}

function literalsIn(file) {
  return [...literalsInSource(fs.readFileSync(file, "utf8"))].sort();
}

// 扫描器自检：源码形状会变（JSX 属性改成对象字段、引号换成单引号…），
// 变了就要在这里红，而不是悄悄退回成"零发现所以全绿"。
function scannerSelfTest() {
  const probes = [
    ["recipe labels 数组", 'export const SHOT_RECIPE = {labels:["mutA","mutB"]};', ["mutA", "mutB"]],
    ["recipe 字符串字段", 'export const SHOT_RECIPE = {hero:{display:"mutC",unit:"mutD"}};', ["mutC", "mutD"]],
    ["JSX 属性（表达式容器）", '<CText text={"mutE"} />', ["mutE"]],
    ["JSX 属性（裸字符串）", '<CText text="mutF" />', ["mutF"]],
    ["JSX 子元素", '<CText>mutG</CText>', ["mutG"]],
    ["骨架 labels（冒号后带空格、单引号）", "labels: ['mutH', 'mutI']", ["mutH", "mutI"]],
    ["带引号的子元素", '<CText> "mutJ" </CText>', ["mutJ"]],
    // 带转义引号的头字段文案：报文类镜头天然会写text: "username=\"mutK\""。
    // 旧式捕获类不含转义时会截断成 `username=\`，白名单被碎片污染而真文案从未登记。
    ["带转义引号的字符串字段", 'stage:{items:[{id:"a",text:"username=\\"mutK\\""}]}', ["username=\"mutK\""]],
    ["带转义引号的 JSX 属性", '<MonoText text={"q=\\"mutL\\""} />', ['q="mutL"']],
  ];
  const dead = [];
  for (const [name, source, expect] of probes) {
    const found = literalsInSource(source);
    for (const want of expect) if (!found.has(want)) dead.push(name + "（不再扫到 " + want + "）");
  }
  return dead;
}
for (const dead of scannerSelfTest()) issues.push("B 段扫描器自检失败：" + dead + " —— 白名单正在变成装饰");

const discovered = [];
for (const file of shotSources()) for (const literal of literalsIn(file)) discovered.push({file, literal});
const unregistered = discovered.filter((entry) => !allow.has(entry.literal));

if (write) {
  // 只写「现在真在源码里扫到的」。老实现把扫不到的条目留成 "retired" 永久保留，
  // 结果 34 条登记里 30 条对应的源码文案早就不存在了 —— 只增不减的白名单等于把门越开越宽。
  const payload = {
    version: "2.0",
    note: "Rendered on-screen literals must be registered here. Structural labels are allowed; any digit is still checked against script/research and cannot be waived by this file.",
    channels: ["attrLiteral", "stringArray", "legacyFallback", "jsxChildren", "quotedChildren"],
    literals: [...new Map(discovered.map((entry) => [entry.literal, entry.file])).entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([literal, file]) => ({literal, file})),
  };
  fs.writeFileSync(allowlistFile, JSON.stringify(payload, null, 2) + "\n");
  console.log("visual literals allowlist written", payload.literals.length, "entries; dropped previously-registered:", [...allow].filter((x) => !payload.literals.some((e) => e.literal === x)).length);
  process.exit(0);
}
if (!discovered.length) {
  issues.push("B 段在渲染源码里一条硬编码文案都没扫到 —— 扫描形状与源码已脱节，白名单不再拦任何东西");
}
for (const entry of unregistered) {
  issues.push("unregistered on-screen literal in " + entry.file + ": " + JSON.stringify(entry.literal));
}

// ---- C. 双比例一致 ----
if (wide.scenes.length !== tall.scenes.length) {
  issues.push("ratio scene count mismatch: " + wide.scenes.length + " vs " + tall.scenes.length);
} else {
  for (let i = 0; i < wide.scenes.length; i++) {
    const a = wide.scenes[i], b = tall.scenes[i];
    if (a.id !== b.id) issues.push("ratio scene id mismatch at " + i + ": " + a.id + " vs " + b.id);
    if (Math.abs(a.duration - b.duration) > 1 / 30) issues.push("ratio duration mismatch: " + a.id);
    if ((a.variant || "") !== (b.variant || "")) issues.push("ratio variant mismatch: " + a.id);
  }
}

const report = {
  version: "2.0",
  project_id: project.project_id,
  status: issues.length ? "FAIL" : "PASS",
  script_segments: script.segments.length,
  ir_text_elements: facts.length,
  rendered_texts: rendered.length,
  scenes_without_shot_file: scenesWithoutShot,
  unsourced_rendered_text: unsourced,
  registered_literals: allow.size,
  discovered_literals: discovered.length,
  research_bytes: research.trim().length,
  blocking: true,
  blocking_scope: "A1 IR 文案溯源 + A2 画面数字 + B 未登记字面量 + C 双比例一致；A2 的非数字无出处文案暂只出声",
  rationale: "a2e SKILL.md 硬性原则 2「事实有出处」+ 样片 QC「画面英文/数字逐个核对调研文档」+ narration-guidance.md §11「画面与解说分工」的可执行版本",
  issues,
};
fs.mkdirSync(path.join(artifacts, "qc"), { recursive: true });
fs.writeFileSync(path.join(artifacts, "qc", "text_provenance.json"), JSON.stringify(report, null, 2));
if (unsourced.length) {
  console.warn("⚠ 画面有 " + unsourced.length + " 条文案既不在解说词/调研里、也没登记成结构标签（不阻断，理由见脚本 §A2 注释）：");
  for (const row of unsourced.slice(0, 8)) console.warn("  - " + row.ratio + "/" + row.scene + " " + row.role + ": " + row.text + (row.shot_file ? "  ← " + row.shot_file : "  ← scene 数据"));
}
if (issues.length) {
  console.error("text provenance FAIL " + JSON.stringify({unregistered: unregistered.length, issues: issues.length, rendered: rendered.length}));
  issues.slice(0, 12).forEach((issue) => console.error("- " + issue));
  process.exit(1);
}
console.log("text provenance PASS", JSON.stringify({
  ir_text_elements: report.ir_text_elements,
  rendered_texts: report.rendered_texts,
  registered_literals: report.registered_literals,
  discovered_literals: report.discovered_literals,
  unsourced_rendered_text: unsourced.length,
}));
