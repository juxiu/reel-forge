import fs from "node:fs";
import path from "node:path";
import {resolveBin, run, runAsync, runNpmScript} from "../src/runtime/spawn.mjs";

/**
 * spawn 层自身的门禁。
 *
 * 它防的是「生产链在 Windows 上静默空跑」这一类事故：老 verify-fast 用
 * spawnSync("npm", …) 拿到 ENOENT + status=null，再被 `?? 1` 变成「检查失败」，
 * 于是既不报错也不执行任何检查。这类 bug 只能靠真的起一个子进程来发现。
 *
 * ⚠ 这里只跑无副作用的命令（node 打印 argv、npm --version），不触碰安装与渲染。
 */

const failures = [];
const check = (label, cond, detail = "") => {
  if (!cond) failures.push(`${label}${detail ? " — " + detail : ""}`);
  console.log(`${cond ? "ok   " : "FAIL "} ${label} ${detail}`);
};

const tmpDir = "artifacts/spawn-selftest";
fs.mkdirSync(tmpDir, {recursive: true});
const echoFile = path.join(tmpDir, "argv.mjs").split(path.sep).join("/");
fs.writeFileSync(echoFile, "console.log(JSON.stringify(process.argv.slice(2)));\n");

check("node resolves to this process's own binary", resolveBin("node") === process.execPath, resolveBin("node"));
check("unknown command resolves to null", resolveBin("reel-forge-definitely-not-installed") === null);

const missing = run("reel-forge-definitely-not-installed", ["x"], {});
check("missing command reports status null", missing.status === null);
check("missing command reports a spawn error, not a silent exit 1", Boolean(missing.error), String(missing.error || ""));

const argv = run("node", [echoFile, "--frame=123", "plain", "with space", "dir with space/x.png"], {encoding: "utf8"});
let parsed = null;
try { parsed = JSON.parse((argv.stdout || "").trim()); } catch { /* 让下面的断言报错 */ }
check("arguments with spaces survive round-trip", argv.status === 0 && JSON.stringify(parsed) === JSON.stringify(["--frame=123", "plain", "with space", "dir with space/x.png"]), JSON.stringify(parsed));

const nonzero = run("node", ["-e", "process.exit(3)"], {encoding: "utf8"});
check("exit codes propagate as numbers (null 会把失败伪装成退出码 1)", nonzero.status === 3, String(nonzero.status));
check("success reads as 0", run("node", ["-e", "0"], {encoding: "utf8"}).status === 0);

// stdio:"pipe" 不给 encoding 时 spawnSync 返回 Buffer，调用方 `r.stdout.split()` 直接炸。
// 读子进程输出的脚本一定会踩，所以这里把「piped 就是字符串」钉住。
const piped = run("node", ["-e", "console.log('line1\\nline2')"], {stdio: "pipe"});
check("piped run returns text, not a Buffer", typeof piped.stdout === "string" && piped.stdout.trim() === "line1\nline2", `${typeof piped.stdout} ${JSON.stringify(String(piped.stdout ?? ""))}`);

// 机械规则：只有 src/runtime/spawn.mjs 能碰 child_process ——
// 否则 Windows 的 ENOENT 静默失败会从某个新脚本或新 provider 里长回来。
const SPAWN_OWNER = "src/runtime/spawn.mjs";
const spawnUsers = [];
const walk = (dir) => fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
  const rel = path.posix.join(dir.split(path.sep).join("/"), e.name);
  return e.isDirectory() ? walk(rel) : [rel];
});
for (const file of [...walk("scripts"), ...walk("src")]) {
  if (!/\.(mjs|js)$/.test(file) || file === SPAWN_OWNER) continue;
  if (/["']node:child_process["']|require\(["']child_process["']\)/.test(fs.readFileSync(file, "utf8"))) spawnUsers.push(file);
}
check(`only ${SPAWN_OWNER} touches child_process`, spawnUsers.length === 0, spawnUsers.join(","));

const npmVersion = run("npm", ["--version"], {encoding: "utf8"});
if (process.platform === "win32") {
  check("npm.cmd resolves to an executable, not the extensionless sh script", /\.cmd$/i.test(resolveBin("npm") || ""), resolveBin("npm") || "null");
  check("npm actually runs on Windows (the historical ENOENT case)", npmVersion.status === 0 && /^\d+\./.test((npmVersion.stdout || "").trim()), `${npmVersion.status} ${(npmVersion.stdout || "").trim()} ${npmVersion.error || ""}`);
}

// runNpmScript 必须按 package.json 走，而不是在脚本里再写一遍路径。
const viaScript = runNpmScript("verify:contracts", [], {encoding: "utf8"});
check("runNpmScript executes the package.json entry", viaScript.status === 0, String(viaScript.status));

// ---- 异步路径：TTS provider / agent command / ffprobe 都走这里，缺了就整条配音链起不来 ----
const stdinEcho = "const b=[];process.stdin.on(\"data\",d=>b.push(d));process.stdin.on(\"end\",()=>console.log(Buffer.concat(b).toString()));";
const asyncRun = await runAsync("node", ["-e", stdinEcho], {input: "hello-spawn"});
check("runAsync pipes stdin and captures stdout", asyncRun.status === 0 && (asyncRun.stdout || "").trim() === "hello-spawn", `${asyncRun.status} ${(asyncRun.stdout || "").trim()} ${asyncRun.error || ""}`);

const asyncMissing = await runAsync("reel-forge-definitely-not-installed", [], {});
check("runAsync reports missing binary instead of hanging or throwing raw", asyncMissing.status === null && Boolean(asyncMissing.error), String(asyncMissing.error || ""));

const asyncFail = await runAsync("node", ["-e", "process.stderr.write('boom');process.exit(4)"], {});
check("runAsync returns non-zero status and stderr", asyncFail.status === 4 && (asyncFail.stderr || "").includes("boom"), `${asyncFail.status} ${asyncFail.stderr}`);

// 超时：以前 JSDoc 写了 timeout 而实现没做，调用方以为有保险其实没有（假开关）。
// 不设 timeout 的正常路径必须带 timed_out:false，否则调用方无法区分「没设」与「设了没触发」。
check("a normal async run reports timed_out false", asyncRun.timed_out === false && asyncFail.timed_out === false, `${asyncRun.timed_out} / ${asyncFail.timed_out}`);
const hangStart = Date.now();
const hung = await runAsync("node", ["-e", "setTimeout(()=>process.exit(0),15000)"], {timeout: 400});
const hangMs = Date.now() - hangStart;
check("runAsync timeout kills the child instead of waiting it out", hung.timed_out === true && hangMs < 5000, `timed_out=${hung.timed_out} ${hangMs}ms status=${hung.status} signal=${hung.signal}`);
check("timeout is reported as a timeout, not as a failed launch", /超时/.test(String(hung.error || "")), String(hung.error || ""));

// <NAME>_PATH 覆盖：Windows 上「PATH 里那个 ffmpeg 不是我要的」只能靠这个逃生口。
const custom = "artifacts/spawn-selftest/fake-tool.mjs";
fs.writeFileSync(custom, "console.log('from-override');\n");
process.env.FAKE_TOOL_PATH = path.resolve(custom);
const overridden = resolveBin("fake_tool");
check("FOO_PATH env override wins over PATH lookup", overridden === path.resolve(custom), String(overridden));
delete process.env.FAKE_TOOL_PATH;

fs.rmSync(tmpDir, {recursive: true, force: true});

if (failures.length) {
  console.error("SPAWN GATE FAIL", JSON.stringify({platform: process.platform, failures}));
  process.exit(1);
}
console.log("SPAWN GATE PASS", JSON.stringify({platform: process.platform, node: resolveBin("node"), npm: resolveBin("npm")}));
