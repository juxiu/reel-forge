import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * 产物指纹：**产物对应的是哪一版输入**。
 *
 * ⚠ 为什么需要它（2026-10-09 实测事故）：
 *   `verify:production` 当时报 PASS，理由是「required 文件都在、各自 status 是 PASS、delivery 的
 *   sha256 能对上」。但它**从不检查这些产物是不是当前 fixture 生成的**——
 *   于是 2026-10-08 那个 4 镜 / 37.3s 的 run 的产物，一路配着 2026-10-09 才换成 44 镜的
 *   render-ir 照样报 PASS（delivery_files: 29，qc/report.json 的 generated_at 还是 10-08）。
 *   也就是说这道「生产完成门」在最需要它的时候（片子刚改过）**给出的是假绿**。
 *
 * 这和本仓库反复记过的「假开关」是同一类：门在查「东西存不存在」，没在查「东西对不对」。
 *
 * 指纹覆盖「决定画面的那几样」：双比例 IR（只取与画面有关的字段）、44 个镜头源文件、
 * 解说词、字幕块、画面字面量白名单。**不覆盖** artifacts/ 自身（否则自我循环）。
 *
 * ⚠ 判据与生产者共用本文件（qc.mjs 写进 report.json，verify-production 重算比对）——
 *   校验算法在两处各写一份的话，换一次算法就会有一边永远绿。
 */

/** 与画面无关的字段不进指纹：改了它们不该让「产物过期」，否则每次跑 QC 都无谓失效。 */
function irEssence(file) {
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  return JSON.stringify({
    version: ir.version,
    fps: ir.fps,
    duration: ir.duration,
    width: ir.width,
    height: ir.height,
    scenes: (ir.scenes || []).map((s) => ({
      id: s.id, start: s.start, duration: s.duration,
      variant: s.variant, narrative_job: s.narrative_job,
      elements: (s.elements || []).map((e) => ({ id: e.id, type: e.type, text: e.text })),
      motion: s.motion,
    })),
  });
}

const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

/**
 * @returns {{fingerprint: string, inputs: object}}
 */
export function releaseFingerprint() {
  const inputs = {};

  // 1) 双比例 IR 的画面相关字段
  for (const f of ["fixtures/render-ir-16x9.json", "fixtures/render-ir-9x16.json"]) {
    if (fs.existsSync(f)) inputs[f] = sha(irEssence(f));
  }

  // 2) 镜头源文件：44 个 SC*.jsx（画面真源，逐字节）
  const shots = {};
  const shotsRoot = "src/shots";
  if (fs.existsSync(shotsRoot)) {
    for (const group of fs.readdirSync(shotsRoot, {withFileTypes: true}).filter((d) => d.isDirectory() && /^G\d+$/.test(d.name))) {
      for (const name of fs.readdirSync(path.join(shotsRoot, group.name))) {
        if (!/^SC\d+\.jsx$/.test(name)) continue;
        const rel = `${shotsRoot}/${group.name}/${name}`;
        shots[rel] = sha(fs.readFileSync(rel, "utf8"));
      }
    }
    // 组私有舞台与套件同样是画面输入
    for (const group of fs.readdirSync(shotsRoot, {withFileTypes: true}).filter((d) => d.isDirectory() && /^G\d+$/.test(d.name))) {
      const stage = `${shotsRoot}/${group.name}/stage.jsx`;
      if (fs.existsSync(stage)) shots[stage] = sha(fs.readFileSync(stage, "utf8"));
    }
    const kit = `${shotsRoot}/stage-kit.jsx`;
    if (fs.existsSync(kit)) shots[kit] = sha(fs.readFileSync(kit, "utf8"));
  }
  inputs["src/shots/**"] = shots;

  // 3) 解说词 / 字幕块 / 画面字面量白名单
  for (const f of ["script/narration.txt", "script/storyboard_src.md", "fixtures/captions.json", "fixtures/visual-literals.json"]) {
    if (fs.existsSync(f)) inputs[f] = sha(fs.readFileSync(f, "utf8"));
  }

  // 4) 镜数与组数单独留一份可读的摘要，便于报错时直接看出差在哪
  let scenes = 0;
  let groups = 0;
  try {
    scenes = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8")).scenes.length;
    groups = Object.keys(shots).filter((k) => /^src\/shots\/G\d+\/SC\d+\.jsx$/.test(k)).length;
  } catch {}

  return {fingerprint: sha(JSON.stringify(inputs)), inputs, scenes, shots: groups};
}