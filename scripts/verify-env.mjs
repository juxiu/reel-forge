import fs from "node:fs";
import {run as spawnRun} from "../src/runtime/spawn.mjs";

// 为什么要单独一个 env 门：这条流水线里最贵的一类「绿」，是门禁根本没执行。
// python3 不叫 python3、没装 ffmpeg、没装 numpy —— 脚本要么安静退出 0，要么在流水线深处
// 抛一个和真实原因无关的错误。这里一次性把「这台机器能跑到哪一步」说清楚，缺什么就指名，
// 并给出该平台能照做的安装动作。
//
// 用法：node scripts/verify-env.mjs [--stage measure|qc|render|tts|full]
// 退出码：0 = 该阶段要的东西都在；1 = 缺东西（stderr 列出缺哪个、谁需要它）。
const stage = (() => {
  const i = process.argv.indexOf("--stage");
  return i > -1 ? process.argv[i + 1] : "full";
})();
const MIN_PYTHON = [3, 9]; // 测量层用了 math.lcm（3.9+）与 f-string；低于此直接判不可用

const report = [];
const firstLine = (s) => (s || "").split(/\r?\n/)[0].trim();
// 返回 {ok, out}：只看「有没有输出」会把 ModuleNotFoundError 的 traceback 当成成功——
// 一个把缺依赖报成「装着」的环境门，比没有这个门更糟。
const probe = {
  // stdout 全量返回：python 那个探测要读两行（版本 + 解释器路径），只留首行会把第二条信息丢掉。
  // 走 src/runtime/spawn.mjs 而不是自己 spawnSync：Windows 上 python3 可能只是 Store 占位别名、
  // ffmpeg 可能是 .cmd，而 verify-spawn 钉着「只有那个模块能碰 child_process」——
  // 环境门要是自己踩了 ENOENT，报出来的就是「缺 python」这种错账。
  run(cmd, args) {
    const r = spawnRun(cmd, args);
    // status === null 是「根本没起来」（命令不存在 / .cmd 起不来），非零退出码是「跑了但失败」，
    // 两者都算不可用，但 r.error 只在前者有值：把它带出去才不会把 PATH 问题说成版本问题。
    if (r.status === null) return {ok: false, out: r.error || `${cmd} 起不来`, absent: true};
    return {ok: r.status === 0, out: `${r.stdout || ""}${r.stderr || ""}`.trim(), absent: false};
  },
};

function pythonCandidate() {
  // Windows 上 python.org 装的是 python.exe，python3.exe 常常只有 Store 别名才有；
  // 三个名字都试（spawn.mjs 的别名表也是这个顺序），第一个能打印版本的算数，
  // 并告诉调用者 npm scripts 里写死 python3 会不会炸。
  const tried = [];
  for (const name of ["python3", "python", "py"]) {
    const r = probe.run(name, ["-c", "import sys;print('%d.%d.%d'%sys.version_info[:3]);print(sys.executable)"]);
    if (!r.ok) {
      tried.push(`${name}: ${r.absent ? r.out : firstLine(r.out) || "退出码非 0"}`);
      continue;
    }
    const [version, executable] = r.out.split(/\r?\n/);
    const parts = version.split(".").map(Number);
    const ok = parts[0] > MIN_PYTHON[0] || (parts[0] === MIN_PYTHON[0] && parts[1] >= MIN_PYTHON[1]);
    return {name, version, executable, ok, parts};
  }
  return {failed: tried.join(" | ")};
}

const py = pythonCandidate();
report.push({
  need: "python",
  ok: Boolean(py.ok),
  detail: py.ok || py.version ? `${py.name} ${py.version} @ ${py.executable}${py.ok ? "" : ` (需要 >= ${MIN_PYTHON.join(".")})`}` : `找不到能打印版本的解释器 — ${py.failed}`,
});

function moduleAvailable(mod) {
  // 解释器都没起来的时候不能说「未安装」：那是两回事，混起来会让人去 pip 一个不存在的 python。
  if (!py.name) return {ok: false, detail: "python 不可用，未检查"};
  const r = probe.run(py.name, ["-c", `import ${mod};print(getattr(${mod},'__version__','installed'))`]);
  // traceback 的首行永远是 `Traceback (most recent call last):`，能定性的信息在最后一行
  // （ModuleNotFoundError: No module named 'edge_tts'）。
  const lastLine = (s) => (s || "").trim().split(/\r?\n/).pop() || "无输出";
  return {ok: r.ok, detail: r.ok ? firstLine(r.out) : "未安装（import 失败：" + lastLine(r.out) + "）"};
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
report.push({need: "node", ok: nodeMajor >= 18, detail: `v${process.versions.node}${nodeMajor >= 18 ? "" : " (Remotion 4 需要 >= 18)"}`});

const ffmpeg = probe.run("ffmpeg", ["-version"]);
const ffprobe = probe.run("ffprobe", ["-version"]);
const versionOf = (s) => firstLine(s).split(/\s+/).slice(1, 3).join(" ");
// 「装了但起不来」和「PATH 上根本没有」要给的话不一样：后者是安装问题，前者通常是 .cmd/别名问题。
const whyMissing = (r) => (r.absent ? `（${r.out}）` : `（能启动但退出码非 0：${firstLine(r.out) || "无输出"}）`);
report.push({need: "ffmpeg", ok: ffmpeg.ok, detail: ffmpeg.ok ? versionOf(ffmpeg.out) : "缺：scripts/render.sh 抽帧、src/qc/run.mjs 媒体探测都要它 " + whyMissing(ffmpeg)});
report.push({need: "ffprobe", ok: ffprobe.ok, detail: ffprobe.ok ? versionOf(ffprobe.out) : "缺：verify:qc 读不到时长/帧率就会误判成片 " + whyMissing(ffprobe)});

const numpy = moduleAvailable("numpy");
report.push({need: "numpy (只给 native_tts_provider)", ok: numpy.ok, detail: numpy.detail});
const edgeTts = moduleAvailable("edge_tts");
report.push({need: "edge-tts", ok: edgeTts.ok, detail: edgeTts.detail});
report.push({
  need: "node_modules/@remotion",
  ok: fs.existsSync("node_modules/@remotion"),
  detail: fs.existsSync("node_modules/@remotion") ? "已安装" : "缺：npm install（渲染层与 materialize 的 remotion 依赖）",
});

const REQUIRE = {
  measure: ["python"],
  qc: ["python", "ffmpeg", "ffprobe"],
  render: ["python", "ffmpeg", "ffprobe", "node", "node_modules/@remotion"],
  tts: ["python", "ffmpeg", "ffprobe", "numpy (只给 native_tts_provider)", "edge-tts"],
  full: ["python", "ffmpeg", "ffprobe", "node", "node_modules/@remotion", "numpy (只给 native_tts_provider)", "edge-tts"],
};
const wanted = REQUIRE[stage];
if (!wanted) {
  console.error("verify-env: 未知 --stage " + stage + "，可选：" + Object.keys(REQUIRE).join(" / "));
  process.exit(2);
}
const missing = report.filter((r) => wanted.includes(r.need) && !r.ok);
console.log(JSON.stringify({stage, checks: report, missing: missing.map((m) => m.need)}, null, 2));
if (missing.length) {
  console.error(
    "\n环境缺 " + missing.length + " 项（stage=" + stage + "）：\n" +
    missing.map((m) => "  - " + m.need + "：" + m.detail).join("\n") +
    "\n装法：Windows `winget install Gyan.FFmpeg`；macOS `brew install ffmpeg`；Ubuntu `sudo apt-get install -y ffmpeg`；" +
    "Python 依赖 `pip install -r requirements.txt`。\n" +
    "测量层（frame_metrics / motion_check / visual_regression / test_measurement）只需要 python >= 3.9，不需要上面任何一项。"
  );
  process.exit(1);
}
console.log("verify-env PASS (stage=" + stage + ")");
