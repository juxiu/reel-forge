import fs from "node:fs";
import path from "node:path";
import {groupIdOf} from "../src/build/limits.mjs";

/**
 * Contact sheet 与媒体索引：把「计划要看的帧」变成「真能看的东西」。
 *
 * 为什么要有这一步（论述见 `docs/knowledge/agent-protocol.md` §2 第 3 条、§4 结尾与
 * `docs/knowledge/lessons.md:86`）：本仓库此前**只有** manifest 里的计划帧号，没有任何
 * 等价物把图交到人或 agent 眼前 —— 上游 a2e 的做法是 QC agent 直接 Read 那 6–10 张 still，
 * 外加组界 `boundary_*.png` 与相邻镜头对比。没有这一层，「图形光环贴住白字」这类缺陷
 * 在链路上是**看不见**的，而不是"看见了但门没判"。
 *
 * 产物两件：
 *   `artifacts/<pid>/qc/media_index.json`   机器读的：每镜计划帧 → 盘上真的存在哪些 PNG / 缺哪些。
 *   `artifacts/<pid>/qc/contact_sheet.html` 人读的：逐镜一行缩略图 + 点击看原图（放大帧），
 *                                            纯静态 HTML，不开服务器也能在浏览器里核对。
 *
 * ⚠ 它**不判画面**：这里没有任何视觉判据，也不因为"图存在"就认为有人看过。它做的只有一件事
 *    —— 把「要看图」这件事从"需要渲染 + 需要人手工翻目录"降成"打开一个文件"。
 *    真实判据仍然在 `frame_metrics.py` / `motion_check.py` / `verify:text-provenance` 那几处。
 * ⚠ still 只有 `STRICT_STILLS=1` 才真渲（`scripts/still-benchmark.mjs:9,48-60`）。没渲过时
 *    本脚本如实写 `status:"PLANNED-ONLY"`，不假装成"图都在"。
 */

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const pid = project.project_id;
const qcDir = path.join("artifacts", pid, "qc");
const manifestFile = path.join(qcDir, "still-manifest.json");
if (!fs.existsSync(manifestFile)) {
  console.error("缺 " + manifestFile + " —— 先跑 npm run still-benchmark（它写 still-manifest.json）");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

// still 落盘位置在两处出现过：`artifacts/stills/<Gn>/<scene_id>/`（still-benchmark 的 strict 分支）
// 与 `artifacts/<pid>/stills/`。与其规定一个，不如把候选都查一遍并如实报告——
// 规定一个而渲染写另一个，产出的就是一张"图都在"的空表。
const stillRoots = [path.join("artifacts", "stills"), path.join("artifacts", pid, "stills")];
const relPathsFor = (sceneId, frame, fileField) => {
  const shot = Number(String(sceneId).split("-").at(-1));
  const padded = "f" + String(frame).padStart(5, "0") + ".png";
  const candidates = [];
  for (const root of stillRoots) {
    candidates.push(path.join(root, groupIdOf(shot), sceneId, padded));
    candidates.push(path.join(root, sceneId, padded));
    if (fileField) candidates.push(path.join(root, path.dirname(fileField), padded));
  }
  return candidates;
};

const scenes = (manifest.scenes || []).map((scene) => {
  const planned = (scene.frames || []).map((item) => item.frame);
  const existing = [];
  const missing = [];
  for (const item of scene.frames || []) {
    const found = relPathsFor(scene.scene_id, item.frame, item.file).find((candidate) => {
      try { return fs.statSync(candidate).size > 0; } catch { return false; }
    });
    (found ? existing : missing).push({frame: item.frame, kind: item.kind, file: found || null});
  }
  return {
    scene_id: scene.scene_id,
    highlight: scene.highlight === true,
    required_frames: scene.required_frames ?? null,
    planned_frames: planned,
    existing,
    missing,
  };
});

const videos = [];
for (const dir of [path.join("artifacts", "render"), path.join("artifacts", pid, "render")]) {
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    if (/\.(mp4|webm|mov)$/i.test(entry)) videos.push(path.join(dir, entry));
  }
}

const totalPlanned = scenes.reduce((n, s) => n + s.planned_frames.length, 0);
const totalExisting = scenes.reduce((n, s) => n + s.existing.length, 0);
const status = totalExisting ? "HAS-IMAGES" : "PLANNED-ONLY";

const rel = (abs) => path.relative(qcDir, abs).split(path.sep).join("/");
const rows = scenes.map((scene) => [
  "<section class=\"scene\">",
  "  <h2>" + scene.scene_id + (scene.highlight ? " <span class=\"hl\">highlight</span>" : "") + "</h2>",
  "  <p class=\"meta\">计划 " + scene.planned_frames.length + " 帧"
    + (scene.required_frames ? "（下限 " + scene.required_frames + "）" : "")
    + " · 盘上 " + scene.existing.length + " 张 · 缺 " + scene.missing.length + " 张</p>",
  "  <div class=\"strip\">",
  ...scene.existing.map((item) => "    <a href=\"" + rel(item.file) + "\"><figure><img src=\"" + rel(item.file) + "\" alt=\"" + scene.scene_id + " f" + item.frame + "\" loading=\"lazy\"><figcaption>f" + item.frame + " · " + (item.kind || "") + "</figcaption></figure></a>"),
  ...scene.missing.map((item) => "    <figure class=\"gap\"><div class=\"ph\"></div><figcaption>f" + item.frame + " 缺</figcaption></figure>"),
  "  </div>",
  "</section>",
].join("\n")).join("\n");

const html = "<!doctype html>\n<html lang=\"zh\"><head><meta charset=\"utf-8\"><title>Contact sheet — " + pid + "</title>\n<style>\n"
  + "body{margin:24px;background:#111;color:#ddd;font:14px/1.6 system-ui,sans-serif}\n"
  + "h1{font-size:18px;font-weight:600}h2{font-size:15px;margin:0 0 4px}\n"
  + ".scene{border-top:1px solid #2a2a2a;padding:16px 0}\n"
  + ".meta{color:#8a8a8a;margin:0 0 10px;font-size:12px}.hl{color:#ffd166;font-size:11px;border:1px solid #5a4a1a;padding:1px 6px;border-radius:10px}\n"
  + ".strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px}\n"
  + "figure{margin:0;flex:0 0 180px}img{width:180px;height:auto;display:block;border:1px solid #333}\n"
  + "figcaption{font-size:11px;color:#8a8a8a;margin-top:4px}\n"
  + ".gap .ph{width:180px;height:101px;border:1px dashed #444}\n"
  + "a:hover img{outline:2px solid #ffd166}\n"
  + ".videos li{font-size:12px;color:#8a8a8a}\n"
  + "</style></head><body>\n"
  + "<h1>" + pid + " · contact sheet</h1>\n"
  + "<p class=\"meta\">fps " + (manifest.fps ?? "?") + " · 镜头 " + scenes.length + " · 计划帧 " + totalPlanned
  + " · 盘上 " + totalExisting + " · 状态 " + status + " · 生成于 " + new Date().toISOString() + "</p>\n"
  + "<p class=\"meta\">这一页只负责把帧交到你眼前，不判画面好不好。点开任意图等于「放大看那一帧」；"
  + "虚线格是 manifest 里计划了但盘上没有的帧（没跑 STRICT_STILLS=1 时整片都会是虚线）。</p>\n"
  + (videos.length ? "<ul class=\"videos\">" + videos.map((v) => "<li><a href=\"" + rel(v) + "\">" + path.basename(v) + "</a></li>").join("") + "</ul>" : "<p class=\"meta\">没有发现成片（artifacts/render/ 为空）。</p>")
  + "\n" + rows + "\n</body></html>\n";

fs.mkdirSync(qcDir, {recursive: true});
fs.writeFileSync(path.join(qcDir, "contact_sheet.html"), html);
const index = {
  project_id: pid,
  generated_at: new Date().toISOString(),
  status,
  fps: manifest.fps ?? null,
  still_roots_searched: stillRoots,
  videos,
  scenes,
};
fs.writeFileSync(path.join(qcDir, "media_index.json"), JSON.stringify(index, null, 2));

const incomplete = scenes.filter((scene) => status === "HAS-IMAGES" && scene.missing.length);
console.log("contact sheet " + status, JSON.stringify({
  scenes: scenes.length,
  planned_frames: totalPlanned,
  images_on_disk: totalExisting,
  videos: videos.length,
  // 有图但某镜缺帧 = 计划与盘上不一致，这条必须显眼，不能被总数盖住。
  scenes_with_gaps: incomplete.map((scene) => scene.scene_id),
  html: path.join(qcDir, "contact_sheet.html"),
}));
