import fs from "node:fs";
import path from "node:path";

// 画面文字出处门（阻断）
// 依据 anything2explainer 的两条硬判据：
//   SKILL.md 硬性原则 2「事实有出处」——画面上出现的每个数字/英文术语必须能在调研文档里找到来源；
//   examples/rag 的 QC 判据「画面英文/数字逐个核对调研文档」。
// reel-forge 此前声称"事实可回溯"，但没有任何代码检查画面文字；这里补上闭环。
//
// 三部分：
//   A. 事实溯源    —— 每个 scene 的 elements[*].text 必须能在解说词里找到，其中的数字必须能在脚本或调研文档里找到。
//   B. 字面量白名单 —— 渲染源码里所有会上画面的硬编码文案必须显式登记，新增未登记文案即失败。
//   C. 双比例一致  —— 同一 scene 在 16:9 / 9:16 的时长、顺序、变体必须一致。

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

// ---- A. 事实溯源 ----
for (const [ratio, ir] of [["16x9", wide], ["9x16", tall]]) {
  for (const scene of ir.scenes || []) {
    for (const element of scene.elements || []) {
      const text = String(element.text || "").trim();
      if (!text) continue;
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

// ---- B. 字面量白名单 ----
function shotSources() {
  const files = [path.join("src", "shots", "SemanticShots.jsx")];
  for (const group of fs.readdirSync(path.join("src", "shots"), { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    const dir = path.join("src", "shots", group.name);
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith(".jsx")) files.push(path.join(dir, entry));
    }
  }
  return files;
}
const visibleAttributes = /(?:text|title|label|alt|caption|placeholder)=\{?"([^"{}]{2,})"?\}/g;
const jsxText = />([^<>{}"\n][^<>{}"\n]{1,})</g;
const fallbackArray = /(?:labels|rows)\|\|\[([^\]]*)\]/g;
const ignore = /^[\s\d.,:;!?/\\|()[\]{}+\-*=<>]*$/;

function literalsIn(file) {
  const source = fs.readFileSync(file, "utf8");
  const found = new Set();
  const push = (raw) => {
    const value = String(raw || "").replace(/\s+/g, " ").trim().replace(/^["'`]|["'`]$/g, "").trim();
    if (!value || value.length < 2) return;
    if (ignore.test(value)) return;
    if (!/[a-zA-Z一-鿿]/.test(value)) return;
    if (/^(rgba?|calc|var|px|rem|em|flex|none|solid|absolute|relative|center|left|right|top|bottom|hidden)$/i.test(value)) return;
    found.add(value);
  };
  for (const match of source.matchAll(visibleAttributes)) push(match[1]);
  for (const match of source.matchAll(fallbackArray)) for (const part of match[1].split(",")) push(part);
  for (const match of source.matchAll(jsxText)) push(match[1]);
  return [...found].sort();
}

const allowlistFile = "fixtures/visual-literals.json";
const discovered = [];
for (const file of shotSources()) for (const literal of literalsIn(file)) discovered.push({ file, literal });
const unregistered = discovered.filter((entry) => !registered(entry.literal));
function registered(literal) {
  const data = readJson(allowlistFile, { literals: [] });
  return new Set((data.literals || []).map((x) => (typeof x === "string" ? x : x.literal))).has(literal);
}
if (write) {
  const merged = new Map();
  for (const entry of discovered) merged.set(entry.literal, entry.file);
  for (const entry of readJson(allowlistFile, { literals: [] }).literals || []) {
    const literal = typeof entry === "string" ? entry : entry.literal;
    if (!merged.has(literal)) merged.set(literal, "retired");
  }
  const payload = {
    version: "1.0",
    note: "Rendered on-screen literals must be registered here. Structural labels are allowed; factual claims must trace to script/research instead.",
    literals: [...merged.entries()].sort().map(([literal, file]) => ({ literal, file })),
  };
  fs.writeFileSync(allowlistFile, JSON.stringify(payload, null, 2) + "\n");
  console.log("visual literals allowlist written", payload.literals.length, "entries");
  process.exit(0);
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
  version: "1.0",
  project_id: project.project_id,
  status: issues.length ? "FAIL" : "PASS",
  script_segments: script.segments.length,
  traced_elements: facts.length,
  registered_literals: new Set((readJson(allowlistFile, { literals: [] }).literals || []).map((x) => (typeof x === "string" ? x : x.literal))).size,
  discovered_literals: discovered.length,
  blocking: true,
  rationale: "a2e SKILL.md 硬性原则 2「事实有出处」+ 样片 QC「画面英文/数字逐个核对调研文档」的可执行版本",
  issues,
};
fs.mkdirSync(path.join(artifacts, "qc"), { recursive: true });
fs.writeFileSync(path.join(artifacts, "qc", "text_provenance.json"), JSON.stringify(report, null, 2));
if (issues.length) {
  console.error("text provenance FAIL " + JSON.stringify({ unregistered: unregistered.length, issues: issues.length }));
  issues.slice(0, 12).forEach((issue) => console.error("- " + issue));
  process.exit(1);
}
console.log("text provenance PASS", JSON.stringify({
  traced_elements: report.traced_elements,
  registered_literals: report.registered_literals,
  discovered_literals: report.discovered_literals,
}));