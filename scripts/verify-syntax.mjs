import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {run} from "../src/runtime/spawn.mjs";

/**
 * 全量语法门：.mjs/.cjs/.js 走 `node --check`，**.jsx 走 esbuild 真正解析**。
 *
 * 为什么单独有这条：`npm run skill` 的一键入口在 git HEAD 里就是语法错误，
 * 而当时 verify:fast 在 Windows 上 spawn ENOENT、一条检查都没真跑，
 * 于是这个坑藏在「所有门禁都是绿的」下面。
 *
 * ⚠⚠ 2026-10-09：这道门以前把 57 个 .jsx **跳过**并如实打印
 * `jsx_not_parseable_locally: 57`，理由是「.jsx 需要打包器，本机没有 esbuild」。
 *    **这个前提早已不成立** —— esbuild 就在 node_modules 里（Remotion 的依赖）。
 *    代价是三个真实缺陷一路绿灯走到渲染才炸：
 *      · Primitives.jsx:594 `<SoftIn>` 开标签未闭合 → esbuild 报 3 个错，整条渲染路径构建失败；
 *      · Shot.jsx / stage-kit.jsx 的注释里写了 `shots_src/G` + `*` + `/`，其中的星号斜杠提前闭合块注释，
 *        后面的 `layout.tsx` / `的做法` 被当成代码解析。
 *    三者都被 syntax / imports / jsx-symbols 三道门放过了，因为没有一道真解析过 JSX。
 *    所以现在：esbuild 解析不到就**判红**，不再降级成 caveat。
 */

const require = createRequire(import.meta.url);

/** esbuild 是 Remotion 的传递依赖；解析不到就装一条明确的指引，而不是跳过 JSX。 */
function loadEsbuild() {
  for (const id of ["esbuild", "@remotion/bundler/node_modules/esbuild"]) {
    try {
      return require(id);
    } catch {}
  }
  return null;
}

const esbuild = loadEsbuild();
if (!esbuild) {
  console.error(
    "SYNTAX GATE FAIL " +
      JSON.stringify({
        reason: "esbuild 不可用，无法解析 .jsx",
        detail:
          "过去这道门在这里打印 caveat 并放行 57 个 .jsx，于是未闭合标签、注释里提前闭合的 " +
          "*/ 全部绿灯到渲染才炸（见文件头注释）。现在改成硬失败。",
        fix: "npm install（esbuild 是 @remotion/cli 的依赖，装完即有）；不要改成跳过。",
      }, null, 2),
  );
  process.exit(1);
}

const files = [];
const jsxFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const rel = path.posix.join(dir.split(path.sep).join("/"), entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(?:mjs|cjs|js)$/.test(entry.name)) files.push(rel);
    else if (entry.name.endsWith(".jsx")) jsxFiles.push(rel);
  }
};
for (const dir of ["scripts", "src"]) if (fs.existsSync(dir)) walk(dir);

const broken = [];

for (const file of files) {
  const r = run("node", ["--check", file], {encoding: "utf8"});
  if (r.error) {
    broken.push({file, mode: "node --check", message: `无法启动 node --check: ${r.error}`});
  } else if (r.status !== 0) {
    const first = (r.stderr || "").split(/\r?\n/).find((l) => l.trim()) || `exit ${r.status}`;
    broken.push({file, mode: "node --check", message: first.trim()});
  }
}

// JSX：esbuild 真解析。loader 固定 jsx，target 取 esnext 以免旧语法误报。
for (const file of jsxFiles) {
  try {
    esbuild.transformSync(fs.readFileSync(file, "utf8"), {loader: "jsx", target: "esnext", jsx: "automatic"});
  } catch (error) {
    const errs = (error && error.errors) || [];
    broken.push({
      file,
      mode: "esbuild",
      message: errs.length
        ? errs.map((e) => `${e.text} @${e.location ? `${e.location.file}:${e.location.line}:${e.location.column}` : "?"}`).join(" | ")
        : String(error && error.message),
    });
  }
}

if (broken.length) {
  console.error("SYNTAX GATE FAIL", JSON.stringify({checked: files.length + jsxFiles.length, jsx_parsed: jsxFiles.length, broken}, null, 2));
  process.exit(1);
}
console.log(
  "SYNTAX GATE PASS",
  JSON.stringify({
    checked: files.length + jsxFiles.length,
    jsx_parsed_by_esbuild: jsxFiles.length,
    note: "JSX 已真解析，不再是 caveat",
  }),
);