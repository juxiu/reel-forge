import {spawn, spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * 全项目唯一的子进程启动层（同步 + 异步）。
 *
 * 为什么要有这个文件：Windows 上 `npm` / `npx` 是 **npm.cmd / npx.cmd**，
 * `spawn("npm", …)` 不开 shell 会直接 ENOENT —— 此时 `status === null`，
 * 而老代码一律写 `return r.status ?? 1`，表现成「命令跑了但退出 1」，
 * 完全不提示「二进制根本没找到」。实际事故有两个：
 *   · verify:fast 在 Windows 上一条检查都没执行，却报 failed_check=verify:skill / 9ms；
 *   · skill.mjs 的「一键入口」在 git HEAD 里是语法错误，两者叠起来就是
 *     「门禁绿、命令跑得起来」的假象，而真实生产链一步都没走过。
 *
 * 规则：
 *   1. 命令一律先解析成绝对路径（PATH + PATHEXT），解析不到就报**明确**的 not found；
 *   2. `.cmd` / `.bat` 必须走 shell（Node ≥18.20/20.12 起直接 spawn 会 EINVAL），
 *      二进制和参数自己加引号；
 *   3. `node` 用 `process.execPath`，不依赖 PATH；
 *   4. `python3` 在 Windows 上常常只叫 `python` 或 `py`，按别名表依次试；
 *   5. 任何模块想知道 `status`，也必须能知道 `error` —— 不许再用 `?? 1` 把两者合并。
 */

const IS_WIN = process.platform === "win32";
const PATHEXT = IS_WIN
  ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean).map((e) => e.toLowerCase())
  : [""];

const ALIASES = {
  node: () => [process.execPath],
  python3: () => ["python3", "python", "py"],
  python: () => ["python", "python3"],
  npm: () => ["npm", "npm.cmd"],
  npx: () => ["npx", "npx.cmd"],
};

const cache = new Map();

function existsFile(cand) {
  try {
    return fs.statSync(cand).isFile();
  } catch {
    return false;
  }
}

function searchPath(name) {
  if (name.includes("/") || name.includes("\\")) return existsFile(name) ? name : null;
  const dirs = (process.env.PATH || process.env.Path || "").split(path.delimiter).filter(Boolean);
  // Windows 上 npm/npx 同时存在「无扩展名的 sh 脚本」和「.cmd」：前者 spawn 不了。
  // 所以先按 PATHEXT 找可执行体，找不到再退到裸名。
  const tried = IS_WIN ? [...PATHEXT.map((ext) => name + ext), name] : [name];
  for (const dir of dirs) {
    for (const cand of tried) {
      const full = path.join(dir, cand);
      if (existsFile(full)) return full;
    }
  }
  return null;
}

/** 把命令名解析成绝对路径；解析不到返回 null（调用方负责给出可执行的错误信息）。 */
export function resolveBin(cmd) {
  if (cache.has(cmd)) return cache.get(cmd);
  // 显式覆盖优先：FFMPEG_PATH / PYTHON3_PATH / NPM_PATH…
  const overrideKey = `${cmd.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_PATH`;
  const override = process.env[overrideKey];
  if (override && existsFile(override)) {
    cache.set(cmd, override);
    return override;
  }
  const variants = ALIASES[cmd] ? ALIASES[cmd]() : [cmd];
  let found = null;
  for (const v of variants) {
    if (path.isAbsolute(v)) {
      if (existsFile(v)) { found = v; break; }
      continue;
    }
    const hit = searchPath(v);
    if (hit) { found = hit; break; }
  }
  cache.set(cmd, found);
  return found;
}

/** cmd.exe 参数引用：只有一小撮字符可以裸写，其余一律加双引号并转义内嵌引号。 */
function quoteWinArg(arg) {
  const a = String(arg);
  if (a === "") return '""';
  if (/^[\w:.\\/\-=[\]]+$/.test(a) && !a.includes("\\")) return a;
  return '"' + a.replace(/"/g, '\\"') + '"';
}

function needsShell(bin) {
  if (!IS_WIN) return false;
  const ext = path.extname(bin).toLowerCase();
  return ext === ".cmd" || ext === ".bat";
}

function missing(cmd) {
  return `${cmd} not found on PATH — 安装它，或设置 ${cmd.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_PATH 指向可执行文件`;
}

/**
 * 同步执行。返回 {status, bin, stdout, stderr, error?}；找不到命令时 status=null 且 error 有值。
 *
 * 调用方显式要 pipe（stdio:"pipe"）时默认按 utf8 收：spawnSync 不给 encoding 会返回 Buffer，
 * 于是 `r.stdout.split(...)` 在调用方炸掉 —— 而这类写法在读 QC 输出、解析 npm 结果的脚本里很自然。
 */
export function run(cmd, args = [], opts = {}) {
  const capture = opts.stdio === "pipe" || opts.stdio === undefined || (Array.isArray(opts.stdio) && opts.stdio[1] === "pipe");
  const merged = capture && !opts.encoding ? {...opts, encoding: "utf8"} : opts;
  const bin = opts.bin || resolveBin(cmd);
  if (!bin) return {status: null, bin: null, error: missing(cmd), stdout: merged.encoding === "utf8" ? "" : undefined, stderr: undefined};
  const argv = args.map((a) => String(a));
  if (needsShell(bin)) {
    const line = [/[ "\t]/.test(bin) ? `"${bin}"` : bin, ...argv.map(quoteWinArg)].join(" ");
    return {...spawnSync(line, {...merged, shell: true}), bin};
  }
  return {...spawnSync(bin, argv, merged), bin};
}

/**
 * 异步执行（给需要 stdin / 流式输出 / 并发重试的调用方）。
 * opts: {env, cwd, input?, stdio?: "inherit"|"pipe", timeout?, killSignal?}
 * 返回 {status, bin, stdout, stderr, timed_out, error?}，**不抛错**，由调用方决定怎么处理，
 * 但「没找到命令」和「退出码非 0」在返回里是两个不同的字段。
 *
 * `timeout`（毫秒，>0 生效）：到点用 `killSignal`（默认 SIGTERM）杀子进程，
 * 返回 `timed_out:true` 并把 `error` 写成超时，而不是让它等于「无法启动」。
 * ⚠ 这条实现以前只在本文档里存在（`spawn` 本身没有 `timeout` 选项，`spawnSync` 才有），
 * 于是调用方传 `{timeout:60000}` 会静默无效 —— 假开关。`run()`（同步）本来就靠
 * `spawnSync` 支持它，两条路径此前口径不一致。
 * ⚠ 已知局限：Promise 仍在 `close` 时兑现。若子进程留下继承 stdio 管道的孙子进程，
 * 杀掉本人也不会有 `close`——超时保证「不再等它跑完」，不保证「立刻返回」。
 */
export function runAsync(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const bin = opts.bin || resolveBin(cmd);
    if (!bin) {
      resolve({status: null, bin: null, stdout: "", stderr: "", timed_out: false, error: missing(cmd)});
      return;
    }
    const inherit = opts.stdio === "inherit";
    const argv = args.map((a) => String(a));
    const shell = needsShell(bin);
    const target = shell ? [/[ "\t]/.test(bin) ? `"${bin}"` : bin, ...argv.map(quoteWinArg)].join(" ") : bin;
    const child = spawn(target, shell ? [] : argv, {
      env: opts.env,
      cwd: opts.cwd,
      shell,
      stdio: inherit ? "inherit" : ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let spawnError = null;
    let timedOut = false;
    const ms = Number(opts.timeout);
    const timer = Number.isFinite(ms) && ms > 0
      ? setTimeout(() => {
        timedOut = true;
        try {
          child.kill(opts.killSignal || "SIGTERM");
        } catch {
          /* 已经退了：让 close 正常兑现 */
        }
      }, ms)
      : null;
    if (!inherit) {
      child.stdout?.on("data", (d) => { stdout += String(d); });
      child.stderr?.on("data", (d) => { stderr += String(d); });
    }
    child.on("error", (e) => { spawnError = e.message || String(e); });
    if (opts.input != null && child.stdin) child.stdin.end(String(opts.input));
    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      resolve({
        status: code,
        signal,
        bin,
        stdout,
        stderr,
        timed_out: timedOut,
        error: timedOut
          ? `${cmd} 超时被终止（${ms}ms，killSignal=${opts.killSignal || "SIGTERM"}）`
          : spawnError || (code === null && !signal ? `${cmd} 无法启动` : null),
      });
    });
  });
}

/** 异步执行并在失败时抛错，错误里区分「起不来」和「退出码非 0」。 */
export async function runAsyncOrThrow(cmd, args = [], opts = {}) {
  const r = await runAsync(cmd, args, opts);
  if (r.error) throw new Error(`${cmd} 无法启动: ${r.error}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status ?? "signal " + r.signal}${r.stderr ? " | " + String(r.stderr).slice(-500) : ""}`);
  return r;
}

/** package.json 里的一条 script 拆成 {cmd, args}（只在这一处解释，调用方别再写一遍路径）。 */
export function scriptSpec(name) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const entry = (pkg.scripts || {})[name];
  if (!entry) throw new Error(`package.json has no script named ${name}`);
  const argv = entry.trim().split(/\s+/);
  return {cmd: argv[0], args: argv.slice(1)};
}

/** 直接按 package.json 执行 script：node 类命令不绕 npm（省一次启动，也少一层退出码转手）。 */
export function runNpmScript(name, extraArgs = [], opts = {}) {
  const spec = scriptSpec(name);
  const args = spec.cmd === "node" ? [...spec.args, ...extraArgs] : ["run", name, ...(extraArgs.length ? ["--", ...extraArgs] : [])];
  const cmd = spec.cmd === "node" ? "node" : "npm";
  const r = run(cmd, args, opts);
  if (r.error) throw new Error(`${cmd} 无法启动: ${r.error}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status ?? "signal " + r.signal}`);
  return r;
}
