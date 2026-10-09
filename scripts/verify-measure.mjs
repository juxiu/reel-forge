import fs from "node:fs";
import path from "node:path";
import {run as spawnRun, resolveBin} from "../src/runtime/spawn.mjs";

// 测量层自己也要被门禁跑一遍，否则「QC 说画面合格」这件事从来没被执行过。
// 这里做四件事，全是本机可执行、不需要 ffmpeg / numpy / Pillow 的：
//   1. 判据数字只有一份真源：contracts 必须由 field.mjs 导出且与仓库里那份一致；
//   2. 测量层必须留在标准库里（一 import numpy/PIL，换台机器就静默不跑）；
//   3. 判据不许退回脚本里的字面量；
//   4. 用合成 PNG 把 frame_metrics / motion_check / visual_regression 真跑一遍。
//
// --quick：跳过 test_measurement.py（约 5–6 分钟），只跑秒级检查；verify:fast 用这个。
const QUICK = process.argv.includes("--quick");
// 解释器名字交给 src/runtime/spawn.mjs 的别名表（python3 → python → py）：
// 自己 spawnSync 探 .error 的话，Windows 上「Store 占位别名存在但一跑就失败」会被读成
// 「python3 可用」，于是后面每条 python 检查都报一个和真因无关的错误。
const PY = process.env.PYTHON || "python3";
const PY_BIN = resolveBin(PY) || `${PY}（未找到）`;
const failed = [];

function step(name, fn) {
  try {
    const detail = fn();
    console.log("ok   " + name + (detail ? " — " + detail : ""));
  } catch (err) {
    failed.push({name, reason: String(err.message || err)});
    console.log("FAIL " + name + " — " + (err.detail ? err.detail + "\n" : "") + (err.message || err));
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnRun(cmd, args, {env: {...process.env, PYTHONIOENCODING: "utf-8"}, ...opts});
  // status === null 是进程根本没起来（命令不存在 / .cmd 起不来）：这和非零退出码是两回事，
  // 混成「退出码 null」就等于把安装问题说成脚本问题。
  if (r.status === null) {
    const e = new Error(`无法执行 ${cmd}：${r.error || "进程没起来"}`);
    e.detail = `${cmd} ${args.join(" ")}`;
    throw e;
  }
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.status !== 0) {
    const e = new Error(`${cmd} ${args.join(" ")} 退出码 ${r.status}`);
    e.detail = out.slice(-1500);
    throw e;
  }
  return out;
}

const MEASURE_LAYER = ["vision.py", "pngio.py", "frame_metrics.py", "motion_check.py", "visual_regression.py", "test_measurement.py", "test_vision_objects.py"];
// 允许出现在模块顶层的字面量：描述符本身的尺度参数（改它们必须连 DESCRIPTOR 一起升版本），
// 和「什么都没量到」的结构性零值。判据数字（阈值、像素下限、秒数）一个都不许在这里。
const LITERAL_OK = {
  "frame_metrics.py": ["EMPTY_STATS"],
  "motion_check.py": [],
  "visual_regression.py": ["DESCRIPTOR", "THUMB", "GRID"],
  "vision.py": [],
  "pngio.py": ["SIGNATURE", "COLOR_CHANNELS"],
};
const THIRD_PARTY = /\b(?:import|from)\s+(numpy|PIL|cv2|scipy|matplotlib)\b/;

step("contracts 与 field.mjs 一致（单一真源未漂）", () =>
  run("node", [path.join("scripts", "export-visual-contracts.mjs"), "--check"]).split(/\r?\n/).pop());

step("contracts 内部不变式", () => run("node", [path.join("scripts", "verify-visual-contracts.mjs")]).split(/\r?\n/).pop());

step("测量层只用标准库", () => {
  const offenders = MEASURE_LAYER.filter((f) => THIRD_PARTY.test(fs.readFileSync(path.join("scripts", f), "utf8")));
  if (offenders.length) {
    const e = new Error("这些脚本 import 了第三方库，换台没装的机器就会静默不跑：" + offenders.join(", "));
    e.detail = "测量层（解码 → 取景区 → 连通域 → 判据）必须留在标准库；需要数值库的只有 scripts/native_tts_provider.py。";
    throw e;
  }
  return `${MEASURE_LAYER.length} 个文件`;
});

step("判据没有退回成脚本字面量", () => {
  const bad = [];
  for (const [file, allow] of Object.entries(LITERAL_OK)) {
    const lines = fs.readFileSync(path.join("scripts", file), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = /^([A-Z][A-Z_0-9]*)\s*=\s*(.+)$/.exec(line);
      if (!m || allow.includes(m[1])) return;
      const rhs = m[2].replace(/"[^"]*"|'[^']*'/g, "").replace(/#.*$/, "");
      const digits = rhs.match(/\b\d+(?:\.\d+)?\b/g);
      if (digits) bad.push(`${file}:${i + 1} ${m[1]} = ${line.split("=").slice(1).join("=").trim()}  ← ${digits.join("/")}`);
    });
  }
  if (bad.length) {
    const e = new Error("模块顶层出现了数字：判据只允许住在 src/visual/field.mjs，导出来给 QC 读");
    e.detail = bad.join("\n") + "\n改 field.mjs → npm run export-visual-contracts → 用 C[...] / MD[...] 取值。";
    throw e;
  }
  return "顶层数字 0 个";
});

step(`python 可用且版本够（${PY} → ${PY_BIN}）`, () => {
  const out = run(PY, ["-c", "import sys;assert sys.version_info>=(3,9);print('%d.%d.%d'%sys.version_info[:3])"]);
  return out.trim();
});

step("vision.objects 与暴力法一致", () => run(PY, [path.join("scripts", "test_vision_objects.py")]).trim().split(/\r?\n/).pop());

if (QUICK) {
  console.log("skip test_measurement.py（--quick；完整跑约 5–6 分钟，去掉 --quick 即可）");
} else {
  const started = Date.now();
  step("合成帧把测量层真跑一遍", () => run(PY, [path.join("scripts", "test_measurement.py")]).trim().split(/\r?\n/).filter((l) => l.startsWith("MEASURE TEST")).pop());
  console.log(`     耗时 ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

if (failed.length) {
  console.error("\nMEASURE VERIFY FAIL " + JSON.stringify(failed.map((f) => f.name), null, 0));
  process.exit(1);
}
console.log("verify:measure PASS" + (QUICK ? " (quick)" : ""));
