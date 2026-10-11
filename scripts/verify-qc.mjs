import fs from "node:fs";
import {runMediaQc} from "../src/qc/run.mjs";

// 阻断项：媒体探测、frame/motion 指标、画面文字出处。
// 非阻断项：visual-pixel 回归记录（参考资产为 64x36 合成图，embedding 非语义模型）。
const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const qcDir = "artifacts/" + project.project_id + "/qc";
// 验收范围：与 qc.mjs / verify-production.mjs 同一口径（用户决策 —— 16:9 是验收基准）。
// 范围外比例仍查：成片在位、媒体探测、测量文件在位、visual 仍是 advisory；
// 豁免的只有 frame/motion 的 PASS 判定，豁免结果显式写进输出，不许静默。
const ACCEPT = new Set((process.env.ACCEPT_RATIOS || "16x9,9x16").split(",").map((s) => s.trim()).filter(Boolean));
if (!ACCEPT.has("16x9")) throw new Error("ACCEPT_RATIOS 必须包含 16x9（16:9 是验收基准，不可移出范围）");
const results = [];
for (const ratio of ["16x9", "9x16"]) {
  const file = "artifacts/render/reel-forge-" + ratio + ".mp4";
  if (!fs.existsSync(file)) throw new Error("render missing: " + file);
  const report = await runMediaQc(file);
  if (report.status !== "PASS") throw new Error("QC failed for " + ratio + ": " + JSON.stringify(report.issues));

  const frameFile = qcDir + "/frame_metrics_" + ratio + ".json";
  const motionFile = qcDir + "/motion_" + ratio + ".json";
  for (const [label, file] of [["frame metrics", frameFile], ["motion", motionFile]]) {
    if (!fs.existsSync(file)) throw new Error(label + " missing: " + file);
    if (ACCEPT.has(ratio)) {
      const report = JSON.parse(fs.readFileSync(file, "utf8"));
      if (report.summary?.status !== "PASS") throw new Error(label + " failed for " + ratio);
    }
  }

  const visualFile = qcDir + "/visual_regression_" + ratio + ".json";
  if (!fs.existsSync(visualFile)) throw new Error("visual regression record missing: " + visualFile);
  const visual = JSON.parse(fs.readFileSync(visualFile, "utf8"));
  if (visual.gate !== "advisory" || visual.blocking !== false) throw new Error("visual regression must stay advisory: " + ratio);

  results.push({
    ratio,
    status: report.status,
    motion_frames: report.motion_frames,
    black_segments: report.black_segments,
    duration: Number(report.probe?.format?.duration || 0),
    visual_record: visual.status,
    mean_reference_similarity: Number((visual.scenes || []).reduce((sum, s) => sum + Number(s.reference_similarity || 0), 0) / Math.max(1, (visual.scenes || []).length).toFixed(3)),
  });
}
const provenanceFile = qcDir + "/text_provenance.json";
if (!fs.existsSync(provenanceFile)) throw new Error("text provenance missing: " + provenanceFile);
const provenance = JSON.parse(fs.readFileSync(provenanceFile, "utf8"));
if (provenance.status !== "PASS") throw new Error("text provenance failed: " + JSON.stringify((provenance.issues || []).slice(0, 8)));
for (const item of results) {
  if (!(item.duration > 0)) throw new Error("invalid duration: " + item.ratio);
  if (!(item.motion_frames >= 2)) throw new Error("insufficient motion: " + item.ratio);
}
console.log("qc PASS", JSON.stringify({ accept_ratios: [...ACCEPT], media: results, text_provenance: provenance.status, ir_text_elements: provenance.ir_text_elements, rendered_texts: provenance.rendered_texts, unsourced: (provenance.unsourced_rendered_text || []).length }));