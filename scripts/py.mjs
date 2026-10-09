#!/usr/bin/env node
import {run, resolveBin} from "../src/runtime/spawn.mjs";

/**
 * package.json 里的 python 入口统一走这里。
 *
 * 为什么：那些 script 原先直接写 `python3 scripts/xxx.py`。Linux CI 上没问题，
 * Windows 上 python3 常常只叫 `python` 或 `py` —— 于是 `npm run selfcheck` 报
 * 「'python3' 不是内部或外部命令」，而这句话来自 cmd，完全不会告诉你其实装了 Python。
 * 这正是 src/runtime/spawn.mjs 存在的理由（npm/npx 的 .cmd 事故同一个形状）。
 *
 * 这里只做三件事，不解释参数：按别名表找出解释器 → 原样转发参数 → 原样转手退出码。
 * 参数仍然可以按 npm 的老写法传：`npm run frame-metrics -- --frames … --out …`。
 */

const PY = process.env.PYTHON || "python3";
const bin = resolveBin(PY);

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error("用法：node scripts/py.mjs <脚本.py> [参数…]（给 package.json 的 python 入口用）");
  process.exit(2);
}
if (!bin) {
  console.error(`${PY} 没找到（依次试过 ${PY} / python / py）：装 Python 3，或设 PYTHON=<解释器绝对路径>`);
  process.exit(127);
}

// 中文输出在 Windows 控制台默认按 GBK 编码，python 那边直接 UnicodeEncodeError；
// 这一层是唯一的 python 入口，所以编码也只在这里设一次。
const r = run(bin, [script, ...args], {stdio: "inherit", env: {...process.env, PYTHONIOENCODING: "utf-8"}});
if (r.error) {
  console.error(`${bin} 无法启动：${r.error}`);
  process.exit(127);
}
if (r.status === null) {
  console.error(`${bin} ${script} 被信号 ${r.signal || "?"} 终止（不是退出码非 0，是进程没跑完）`);
  process.exit(1);
}
process.exit(r.status);
