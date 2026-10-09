import fs from "node:fs";
import path from "node:path";
import {run} from "../src/runtime/spawn.mjs";

/**
 * JSX 表达式容器里的「裸标识符」必须在同一个文件里有声明。
 *
 * 为什么需要单独一道门：`{halo}` 这类笔误（haloBack / haloFront 算出来了，JSX 里却引用了一个
 * 根本不存在的名）在 ESM 严格模式下是 ReferenceError，而它藏在一行 JSX 里，于是现成的门全看不见：
 *   · `node --check` 只判语法，`{halo}` 语法完全合法；
 *   · verify:imports 只判导入，而这里的问题恰恰是「没有对应导入」；
 *   · verify:render-layer 是纯函数门禁，不解析 JSX（它文件头自己承认）。
 * 真实后果是 SceneContent 每次渲染都抛，44 个镜头一帧画面都出不来，而本地门禁全绿 ——
 * 「门禁全绿 + 画面全黑」是最坏的一种绿，所以宁可写一道只查一件小事的门。
 *
 * ⚠ 口径与边界（故意做窄，别把它当成静态类型检查）：
 *   1) 只查**整行只有一个表达式容器**的 `{name}` 形式（前后无其它内容）。这一种覆盖「把局部变量
 *      名写错 / 漏了」的实际情况；内联的 `{a + b}`、对象简写 `{depth}`、模板串里的 `${x}` 会误伤，
 *      不值得为此上一个完整 JS 解析器。
 *   2) 名字收集是**全文件扁平集合**，不做作用域分析：别的函数里声明过也算已声明。所以它只会漏、
 *      不会因为作用域判断错而误报 —— 对本门来说漏报方向是安全的。
 */

const GLOBALS = new Set(["React", "this", "arguments"]);

/** 把解构体拆成绑定名：`{a, b: c, d = 1}` → a, c, d；`[x, ...rest]` → x, rest。 */
function addBindings(names, body) {
  for (const token of String(body || "").replace(/[[\]{}]/g, ",").split(",")) {
    let name = token.trim().replace(/^\.\.\./, "").split("=")[0].trim();
    if (name.includes(":")) name = name.split(":").pop().trim();
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) names.add(name);
  }
}

/** 从 `openIdx` 的括号出发，找到配对右括号并返回其间文本；配不上返回 null（模板串里的引号不管，够用）。 */
function matchParen(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return source.slice(openIdx + 1, i);
    }
  }
  return null;
}

/**
 * 收集本文件里出现过的绑定名：导入、const/let/var（含解构）、函数与箭头参数、for / catch 变量。
 *
 * 箭头参数不能用 `\(([^()]*)\)\s*=>`：本仓库的默认值里带 `rgba(102,45,248,.45)` 这种嵌套括号，
 * 那种正则会在第一个内层括号处断开，于是 `({cx, value, shadow = \`…rgba(…)\`})` 整串参数丢掉，
 * `{value}` 被误报成未声明。所以这里对每个 `=>` 反向找配对左括号。
 */
export function declaredNames(source) {
  const names = new Set(GLOBALS);

  for (const m of source.matchAll(/\bimport\s+(?:([A-Za-z_$][A-Za-z0-9_$]*)|\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)|\{([^}]*)\})/g)) {
    if (m[1]) names.add(m[1]);
    if (m[2]) names.add(m[2]);
    if (m[3]) addBindings(names, m[3]);
  }

  for (const m of source.matchAll(/\b(?:const|let|var)\s*(\[[^\]]*\]|\{[^{}]*\}|[A-Za-z_$][A-Za-z0-9_$]*)/g)) {
    const head = m[1];
    if (head.startsWith("[") || head.startsWith("{")) addBindings(names, head);
    else names.add(head);
  }

  for (const m of source.matchAll(/\bfunction\s*[A-Za-z0-9_$]*\s*\(/g)) {
    const body = matchParen(source, m.index + m[0].length - 1);
    if (body !== null) addBindings(names, body);
  }

  for (const m of source.matchAll(/=>/g)) {
    const before = source.slice(0, m.index).replace(/[ \t\r\n]+$/, "");
    if (before.endsWith(")")) {
      const open = matchingOpenParen(source, before.length - 1);
      if (open >= 0) addBindings(names, matchParen(source, open) || "");
    } else {
      const hit = /([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(before);
      if (hit) names.add(hit[1]);
    }
  }

  for (const m of source.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s*([A-Za-z_$][A-Za-z0-9_$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/g)) names.add(m[1]);
  return names;
}

/** 从右括号倒着数到配对左括号；数不到返回 -1。 */
function matchingOpenParen(source, closeIdx) {
  let depth = 0;
  for (let i = closeIdx; i >= 0; i--) {
    const c = source[i];
    if (c === ")") depth++;
    else if (c === "(") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 整行只有一个表达式容器的 JSX 引用：`        {halo}` —— 前后不能有别的字符。 */
const BARE_CONTAINER = /^\{([A-Za-z_$][A-Za-z0-9_$]*)\}[ \t]*$/;

/** 返回 {found, undeclared}；found 为 0 且整仓库都为 0 时说明这道门已经管不到任何东西。 */
export function bareContainers(source, names = declaredNames(source)) {
  const found = [];
  source.replace(/\r\n/g, "\n").split("\n").forEach((line, index) => {
    const hit = BARE_CONTAINER.exec(line.trim());
    if (hit) found.push({name: hit[1], line: index + 1});
  });
  return {found, undeclared: found.filter((item) => !names.has(item.name)), names};
}

function jsxFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsxFiles(full));
    else if (entry.name.endsWith(".jsx")) out.push(full);
  }
  return out.sort();
}

/**
 * 夹具只有一份：单元自检与沙箱端到端跑的是**同一段源码文本**。
 * 上一版两处各写各的，沙箱那份写成 `return <>{haloBack}{halo}</>;`（单行内联），
 * 而本门口径是「整行只有一个容器」，于是它扫到 0 个 → 门在真问题面前报绿。
 * 共用一份文本，口径漂移就只能由 BARE_CONTAINER 自己负责。
 */
const FIX_BROKEN = `const A = ({N}) => {
  const haloBack = N > 0 ? <i /> : null;
  return (
    <>
      {haloBack}
      {halo}
    </>
  );
};
`;
const FIX_CLEAN = `const A = ({N}) => {
  const haloBack = N > 0 ? <i /> : null;
  return (
    <>
      {haloBack}
    </>
  );
};
`;

/**
 * 自检（变异测试）：判据必须真在跑，也得真的认得常见声明形式。
 * 没有这一段的话，「正则没匹配上」和「画面确实干净」长一模一样 —— 而前者会让这道门永远绿。
 */
function selfTest() {
  const failed = [];
  const ok = (cond, label) => {
    if (!cond) failed.push(label);
  };

  // 1) 未声明的裸容器必须被抓出来（复刻 haloBack/haloFront + {halo} 那次的形状）。
  const caught = bareContainers(FIX_BROKEN);
  ok(caught.found.length === 2, "自检失败：裸容器一个都没扫到（正则失效？）");
  ok(caught.undeclared.map((x) => x.name).join() === "halo", "自检失败：未声明名没被抓准 " + JSON.stringify(caught.undeclared));
  ok(bareContainers(FIX_CLEAN).undeclared.length === 0, "自检失败：修好的 halo 形状仍被判成未声明");

  // 2) 解构参数 / 导入 / 普通 const / 嵌套默认值都要算已声明：误报一次，这道门就没人信了。
  const clean = `import {Box, CText as T} from './x.jsx';
export const Y = ({plan, N, pos}) => {
  const faces = plan.items.map((it) => <Box key={it.id} />);
  return <>{faces}{Box}{T}{pos}{N}</>;
};
export const Z = ({cx, value, shadow = \`6px 6px 0 \${PURPLE}, rgba(102,45,248,.45)\`, unit = (a, b) => a + b}) => (
  <>{value}{unit}{shadow}</>
);
`;
  const checked = bareContainers(clean);
  ok(checked.undeclared.length === 0, "自检失败：把已声明的名误报成未声明 " + JSON.stringify(checked.undeclared));

  // 3) 内联表达式与对象简写不在本门口径内（刻意不管，避免误伤）。
  ok(bareContainers(`const q = ({depth}) => <P a={1 + 2} style={{depth}} />;`).found.length === 0, "自检失败：把内联表达式当成了裸容器");

  // 4) 反向兜住「收集器失效」：若连解构参数都没收进来，第 2 条会假绿。
  const names = declaredNames(clean);
  ok(names.has("value") && names.has("cx") && names.has("unit"), "自检失败：带嵌套括号的默认值把箭头参数收集器打断了");

  return failed;
}

const failed = selfTest();

/** 扫一个目录，返回这个目录里的错误行；供沙箱自测与真实 src 复用同一条代码路径。 */
function scanDir(dir) {
  const rows = [];
  let total = 0;
  for (const file of jsxFiles(dir)) {
    const {found, undeclared} = bareContainers(fs.readFileSync(file, "utf8"));
    total += found.length;
    for (const item of undeclared) {
      rows.push(`${file.split(path.sep).join("/")}:${item.line} JSX 引用了本文件没有的名「{${item.name}}」—— 渲染时是 ReferenceError`);
    }
  }
  // 扫到 0 个裸容器 = 正则口径变了，这道门已经管不到任何东西（和「画面干净」长得一样，必须出声）。
  if (!total) rows.push(`${dir} 里一个裸表达式容器都没扫到：正则口径变了，这道门已经管不到任何东西`);
  return {rows, total};
}

const target = process.argv[2] || "src";

// 端到端自测：真跑一次 CLI，确认「有一个坏文件时它会非零退出并点名」。
// 只测函数是不够的 —— 扫描目录、退出码、报错文案这一段同样可能坏掉，而坏了以后画面全黑、门禁全绿。
// 传了 argv[2] 说明本次就是被这样拉起来的（沙箱子进程），不再套第二层沙箱。
if (!process.argv[2]) {
  const self = process.argv[1];
  const sandbox = path.join("artifacts", "jsx-symbols-selftest");
  fs.rmSync(sandbox, {recursive: true, force: true});
  fs.mkdirSync(path.join(sandbox, "src", "shots"), {recursive: true});
  const broken = path.join(sandbox, "src", "shots", "Broken.jsx");
  fs.writeFileSync(broken, FIX_BROKEN);
  const red = run(process.execPath, [self, sandbox]);
  if (red.error) failed.push(`沙箱 CLI 起不来（${red.error}）—— 端到端自测没跑成`);
  else if (red.status === 0) failed.push("沙箱里放了坏文件，CLI 却退出 0（这道门不会为真问题变红）");
  else if (!String(red.stderr || "").includes("{halo}")) failed.push("CLI 报了错但没点名未声明的名：" + String(red.stderr || "").slice(0, 200));
  fs.writeFileSync(broken, FIX_CLEAN);
  const green = run(process.execPath, [self, sandbox]);
  if (green.status !== 0) failed.push("沙箱里只有合法文件却退出 " + green.status + "：" + String(green.stderr || "").slice(0, 200));
  fs.rmSync(sandbox, {recursive: true, force: true});
}

const scan = scanDir(target);
failed.push(...scan.rows);

if (failed.length) {
  console.error("JSX symbols FAIL");
  for (const line of failed) console.error("  - " + line);
  process.exit(1);
}
console.log("JSX symbols PASS", JSON.stringify({dir: target.split(path.sep).join("/"), files: jsxFiles(target).length, bare_containers: scan.total}));
