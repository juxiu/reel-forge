import fs from "node:fs";
import {Config} from "@remotion/cli/config";

// 本机 `npx remotion …` 拉 Chrome Headless Shell 会被限速（约 3MB/min，完整包 ~120MB），
// 于是 still / preview / studio / render / debug:shot 全部卡在下载那一步 —— 想快速调效果，
// 却连一帧都渲染不出来。这里一次性把浏览器指向系统 Chrome：显式 REMOTION_BROWSER_EXECUTABLE
// 优先，其次探测常见安装路径。放在 config 里而不是给每个脚本打补丁，是为了让所有 remotion
// 命令（包括新加的 debug:shot）自动继承，不必逐个记得传 --browser-executable。
//
// 用 .js 而不是官方模板的 .ts：.ts 需要项目根有 tsconfig.json，这个仓库没有，会被
// load-config 直接拒掉；config 由 esbuild 打包后 eval，所以这里用 ESM import 语法没问题。
const CANDIDATES = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const browser = CANDIDATES.find((p) => fs.existsSync(p));
if (browser) {
  Config.setBrowserExecutable(browser);
}

// 这台 i5-1340P 在并发 4 已打满 P 核，再往上只会更慢（实测 600 帧：并发 10 = 81.1s > 并发 4 = 73.4s）。
Config.setConcurrency(4);