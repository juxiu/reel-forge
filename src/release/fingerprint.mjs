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
 * 指纹覆盖「决定画面的那几样」：双比例 IR（只取与画面有关的字段）、镜头源（44 个 SC*.jsx +
 * 组私有 stage.jsx + 共用 stage-kit.jsx/plan.mjs/registry 等）、通用渲染层（src/remotion）、
 * 视觉真源（src/visual）、解说词、字幕块、画面字面量白名单。**不覆盖** artifacts/ 自身（否则自我循环）。
 *
 * ⚠ 2026-10-11 补漏：此前只覆盖 src/shots 下的「G 组目录里的 SC 镜头源、组私有 stage.jsx、
 *   共用 stage-kit.jsx」，于是 `src/shots/plan.mjs`（焦点拍表真源：focusMarks/focusSlots 全由它算出）、
 *   `src/remotion/Primitives.jsx`（图元几何）、`src/visual/easing.mjs`（节拍常量）这些
 *   **实实在在改画面**的文件改了之后，指纹纹丝不动 —— QC 产物照样「新鲜」，还是假绿。
 *   判据是「这个文件改了，像素会不会变」；会变就必须进指纹，跟它在哪个目录无关。
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

  // 2) 画面真源：镜头源 + 通用渲染层 + 视觉真源。判据只有一个 —— 改了它像素会不会变。
  //    逐字节哈希；递归收集 .jsx/.js/.mjs，跳过文档与构建产物。
  const code = {};
  for (const dir of ["src/shots", "src/remotion", "src/visual"]) {
    for (const rel of walkCode(dir)) code[rel] = sha(fs.readFileSync(rel, "utf8"));
  }
  inputs["src/shots/**+remotion+visual"] = code;

  // 3) 解说词 / 字幕块 / 画面字面量白名单
  for (const f of ["script/narration.txt", "script/storyboard_src.md", "fixtures/captions.json", "fixtures/visual-literals.json"]) {
    if (fs.existsSync(f)) inputs[f] = sha(fs.readFileSync(f, "utf8"));
  }

  // 4) 镜数与组数单独留一份可读的摘要，便于报错时直接看出差在哪
  let scenes = 0;
  let groups = 0;
  try {
    scenes = JSON.parse(fs.readFileSync("fixtures/render-ir-16x9.json", "utf8")).scenes.length;
    groups = Object.keys(code).filter((k) => /^src\/shots\/G\d+\/SC\d+\.jsx$/.test(k)).length;
  } catch {}

  return {fingerprint: sha(JSON.stringify(inputs)), inputs, scenes, shots: groups};
}

/** 递归收集一个目录下的代码文件（相对路径，字典序，跨平台稳定）。 */
function walkCode(dir) {
  const out = [];
  const visit = (d) => {
    for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) visit(p);
      else if (/\.(jsx|js|mjs)$/.test(ent.name)) out.push(p);
    }
  };
  if (fs.existsSync(dir)) visit(dir);
  return out.sort();
}