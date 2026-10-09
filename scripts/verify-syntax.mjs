import fs from "node:fs";
import path from "node:path";
import {run} from "../src/runtime/spawn.mjs";

/**
 * 全量语法门。
 *
 * 为什么单独有这条：`npm run skill` 的「一键入口」在 git HEAD 里就是 **语法错误** ——
 * 模块顶层写了 `try { … return; … }`（Illegal return statement），node 在解析阶段就退出，
 * 所以那条命令从来没执行过一行。而当时的 verify:fast 因为在 Windows 上 spawn ENOENT，
 * 一条检查都没真跑，于是这个坑藏在「所有门禁都是绿的」下面。
 *
 * ⚠ 覆盖范围只有 .js / .mjs。`.jsx` 需要打包器才能解析，本机没有 esbuild/babel，
 *    也不允许 npm install —— 所以 JSX 仍然只是「结构被静态检查过」，不是「被解析过」。
 *    这条边界写在输出里，别让人把 PASS 读成「渲染层能跑」。
 */

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const rel = path.posix.join(dir.split(path.sep).join("/"), entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(?:mjs|cjs|js)$/.test(entry.name)) files.push(rel);
  }
};
for (const dir of ["scripts", "src"]) if (fs.existsSync(dir)) walk(dir);

const broken = [];
for (const file of files) {
  const r = run("node", ["--check", file], {encoding: "utf8"});
  if (r.error) {
    broken.push({file, message: `无法启动 node --check: ${r.error}`});
  } else if (r.status !== 0) {
    const first = (r.stderr || "").split(/\r?\n/).find((l) => l.trim()) || `exit ${r.status}`;
    broken.push({file, message: first.trim()});
  }
}

const jsxCount = fs.readdirSync("src", {recursive: true}).filter((f) => String(f).endsWith(".jsx")).length;
if (broken.length) {
  console.error("SYNTAX GATE FAIL", JSON.stringify({checked: files.length, broken}, null, 2));
  process.exit(1);
}
console.log("SYNTAX GATE PASS", JSON.stringify({checked: files.length, jsx_not_parseable_locally: jsxCount, caveat: "jsx layers are structurally checked by verify:imports, not parsed"}));
