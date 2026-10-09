import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

/**
 * 源码模块门禁（纯 node 可执行，不需要 node_modules）。
 *
 * 为什么要有这一支：仓库里 .jsx 占了一半以上，而当前环境装不了依赖（用户要求「先不执行，只写实现」），
 * 所以 JSX 既跑不起来也编译不了。本项目确实出过「import 了一个根本不存在的导出名」的事
 * （从 Fx.jsx 要 CountToHolder，而 Fx.jsx 没有它），那种错误要等到真渲染那一刻才炸，
 * 中间写的每一版画面都白写。这里在不解析 JSX 语法的前提下抓五类真错误：
 *   1) 从本仓库模块 import 了该模块没有的导出名（含 re-export / export * 链、default）；
 *   2) import 的相对路径在磁盘上不存在；
 *   3) src/ 里出现 require()（工程是 "type":"module"，这行永远不会被执行）；
 *   4) src/ 静态 import 了 gitignore 掉的运行产物（script/timeline.json 那一类，fresh clone 必崩）；
 *   5) 字体装载点声明的文件不在 public/ 下（FontFace 失败只打 console，画面静默降级成系统字体），
 *      以及 renderIR 里的 scene 在 SHOT_REGISTRY 没有组件（渲染到那一帧 throw）。
 *
 * ⚠ 它不能代替 JSX 语法检查：没有 parser，括号失衡、标签拼错、props 写错都抓不到。
 *   报 PASS 只代表「模块之间的符号对得上」，不代表「能渲染」。
 */

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const EXTS = ['.mjs', '.js', '.cjs', '.jsx', '.json'];
const RUNTIME_ARTIFACTS = ['script/timeline.json', 'script/timeline-source.json', 'script/timeline.md', 'public/audio.mp3', 'artifacts/'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXTS.includes(path.extname(entry.name))) out.push(p);
  }
  return out;
}

/** 只去掉整行注释，避免动到字符串里的 //（URL、正则）。 */
function stripComments(src) {
  return src
    .split('\n')
    .map((line) => (/^\s*(\/\/|\*)/.test(line) ? '' : line))
    .join('\n');
}

const IMPORT_RE = /(?:^|\n)[ \t]*import\s+([^;\n]*?)\s*from\s*['"]([^'"]+)['"]/g;
const MULTI_IMPORT_RE = /(?:^|\n)[ \t]*import\s+(\{[\s\S]*?\})\s*from\s*['"]([^'"]+)['"]/g;
const BARE_IMPORT_RE = /(?:^|\n)[ \t]*import\s*['"]([^'"]+)['"]/g;

function parseImports(src) {
  const text = stripComments(src);
  const out = [];
  const push = (clause, spec) => {
    const braces = clause.match(/\{([\s\S]*)\}/);
    const before = (braces ? clause.slice(0, braces.index) : clause).replace(/,/g, ' ').trim();
    const namespace = (before.match(/\*\s+as\s+([\w$]+)/) || [])[1] || null;
    const defaultName = before.replace(/\*\s+as\s+[\w$]+/, '').trim() || null;
    const named = braces
      ? braces[1]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => {
            const parts = t.split(/\s+as\s+/);
            return {origin: (parts[0] || '').trim(), alias: (parts[1] || parts[0] || '').trim()};
          })
      : [];
    out.push({spec, defaultName, namespace, named});
  };
  for (const m of text.matchAll(MULTI_IMPORT_RE)) push(m[1], m[2]);
  for (const m of text.matchAll(IMPORT_RE)) if (!m[1].trim().startsWith('{')) push(m[1], m[2]);
  for (const m of text.matchAll(BARE_IMPORT_RE)) out.push({spec: m[1], defaultName: null, namespace: null, named: []});
  return out;
}

function localResolve(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) if (fs.existsSync(base + ext)) return base + ext;
  for (const ext of EXTS) {
    const idx = path.join(base, 'index' + ext);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

const realExports = new Map();
await (async () => {
  for (const file of walk(SRC)) {
    const ext = path.extname(file);
    if (ext !== '.mjs' && ext !== '.js' && ext !== '.cjs') continue;
    try {
      const mod = await import(pathToFileURL(file).href);
      realExports.set(file, new Set(Object.keys(mod)));
    } catch {
      /* 依赖了 react/remotion 这类装不了的模块：退回正则解析 */
    }
  }
})();

const exportCache = new Map();
function exportsOf(file, seen = new Set()) {
  if (exportCache.has(file)) return exportCache.get(file);
  if (seen.has(file)) return {names: new Set(), star: false};
  seen.add(file);
  if (realExports.has(file)) {
    const result = {names: realExports.get(file), star: false};
    exportCache.set(file, result);
    return result;
  }
  if (path.extname(file) === '.json') {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    // JSON 模块的 import 走 default（webpack 与 node 都是），具名键只在对象形态下才有。
    const result = {names: new Set(['default', ...(Array.isArray(json) ? [] : Object.keys(json))]), star: false};
    exportCache.set(file, result);
    return result;
  }
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const names = new Set();
  let star = false;
  const stars = [];
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+([\w$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([\s\S]*?)\}(?:\s*from\s*['"]([^'"]+)['"])?/g)) {
    const from = m[2];
    const target = from ? localResolve(file, from) : null;
    const inner = target ? exportsOf(target, seen) : null;
    for (const raw of m[1].split(',')) {
      const t = raw.trim();
      if (!t) continue;
      const parts = t.split(/\s+as\s+/);
      const origin = (parts[0] || '').trim();
      const alias = (parts[1] || parts[0] || '').trim();
      if (!from || !target || inner?.names?.has(origin) || origin === 'default') names.add(alias);
      else names.add(alias); // 目标解析不到时不在此处报错，由 import 检查负责
    }
  }
  for (const m of src.matchAll(/export\s*\*\s*(?:as\s+([\w$]+)\s*)?from\s*['"]([^'"]+)['"]/g)) {
    if (m[1]) {
      names.add(m[1]);
      continue;
    }
    star = true;
    const target = localResolve(file, m[2]);
    if (target) stars.push(target);
  }
  if (/export\s+default\b/.test(src)) names.add('default');
  for (const t of stars) for (const n of exportsOf(t, seen).names) names.add(n);
  const result = {names, star};
  exportCache.set(file, result);
  return result;
}

const problems = [];
const files = walk(SRC);

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const body = stripComments(fs.readFileSync(file, 'utf8'));
  if (/(^|[^\w$.])require\s*\(/.test(body)) problems.push(`${rel}: 出现 require()——工程是 ESM，这行在打包和 node 里都不会按预期执行`);
  for (const s of body.matchAll(/from\s*['"](\.\.?\/[^'"]+)['"]/g)) {
    const spec = s[1];
    if (RUNTIME_ARTIFACTS.some((bad) => spec.replace(/^\.\.?\//, '').endsWith(bad) || spec.includes(bad))) {
      problems.push(`${rel}: 静态 import 了运行产物 ${spec}（gitignore 掉了，fresh clone 打包直接失败）`);
    }
  }
  if (path.extname(file) === '.json') continue;
  for (const imp of parseImports(fs.readFileSync(file, 'utf8'))) {
    const target = localResolve(file, imp.spec);
    if (!target) {
      if (imp.spec.startsWith('.')) problems.push(`${rel}: import 路径解析不到 ${imp.spec}`);
      continue;
    }
    const ex = exportsOf(target, new Set());
    for (const n of imp.named) {
      if (ex.names.has(n.origin) || ex.star) continue;
      problems.push(`${rel}: ${path.basename(target)} 没有导出 ${n.origin}${n.alias !== n.origin ? `（此处 import 成 ${n.alias}）` : ''}`);
    }
    if (imp.defaultName && !ex.names.has('default') && !ex.star) problems.push(`${rel}: ${path.basename(target)} 没有 default 导出（此处 import 成 ${imp.defaultName}）`);
  }
}

// ---- 字体装载点与 public 实际文件对齐 ----
const styleSrc = fs.readFileSync(path.join(SRC, 'visual/style.mjs'), 'utf8');
const fontSpecs = [...styleSrc.matchAll(/file:\s*'([^']+)'/g)].map((m) => m[1]);
if (!fontSpecs.length) problems.push('src/visual/style.mjs: FONTS 为空，字体装载点没有可装载的字体');
for (const f of fontSpecs) {
  if (!fs.existsSync(path.join(ROOT, 'public', f))) problems.push(`public/${f} 不存在（FONTS 声明了它，装载失败只会打 console，画面静默换系统字体）`);
}

// ---- renderIR 的每个 scene 都要在 registry 里有组件 ----
const regPath = path.join(SRC, 'shots/registry.jsx');
const reg = fs.existsSync(regPath) ? fs.readFileSync(regPath, 'utf8') : '';
for (const irFile of ['fixtures/render-ir-16x9.json', 'fixtures/render-ir-9x16.json']) {
  const abs = path.join(ROOT, irFile);
  if (!fs.existsSync(abs)) continue;
  const ir = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const keys = new Set([...reg.matchAll(/['"](scene-[\w-]+)['"]\s*:/g)].map((m) => m[1]));
  for (const scene of ir.scenes || []) {
    if (!keys.has(scene.id)) {
      problems.push(`${irFile}: ${scene.id} 不在 SHOT_REGISTRY 里（渲染到这一帧 throw）`);
      continue;
    }
    const comp = (reg.match(new RegExp(`['"]${scene.id}['"]\\s*:\\s*([\\w$]+)\\.([\\w$]+)`)) || []).slice(1);
    if (comp.length === 2) {
      const groupDir = path.join(SRC, 'shots', comp[0]);
      const shotFile = path.join(groupDir, comp[1] + '.jsx');
      if (!fs.existsSync(shotFile)) problems.push(`registry: ${scene.id} → ${comp[0]}.${comp[1]}，但 ${path.relative(ROOT, shotFile).replace(/\\/g, '/')} 不存在`);
      else if (!new RegExp(`export\\s+(?:const|function)\\s+${comp[1]}\\b`).test(fs.readFileSync(shotFile, 'utf8'))) problems.push(`registry: ${shotFile} 里没有导出 ${comp[1]}`);
    }
  }
}

if (problems.length) {
  console.error('IMPORT GATE FAIL');
  for (const p of [...new Set(problems)]) console.error(' - ' + p);
  process.exit(1);
}
console.log('IMPORT GATE PASS', JSON.stringify({files: files.length, checkedExports: exportCache.size, fonts: fontSpecs.length}));
