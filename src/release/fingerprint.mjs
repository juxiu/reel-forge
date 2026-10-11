import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function irEssence(file) {
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  return JSON.stringify({
    version: ir.version, fps: ir.fps, duration: ir.duration, width: ir.width, height: ir.height,
    scenes: (ir.scenes || []).map((s) => ({
      id: s.id, start: s.start, duration: s.duration, variant: s.variant, narrative_job: s.narrative_job,
      elements: (s.elements || []).map((e) => ({id: e.id, type: e.type, text: e.text})),
      motion: s.motion,
    })),
  });
}
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

/** @returns {{fingerprint: string, inputs: object}} */
export function releaseFingerprint() {
  const inputs = {};
  const irFile = "fixtures/render-ir-16x9.json";
  if (fs.existsSync(irFile)) inputs[irFile] = sha(irEssence(irFile));

  // Include semantic/provenance inputs, not only their potentially unchanged render projection.
  for (const file of ["fixtures/project.json", "fixtures/script.json"]) {
    if (fs.existsSync(file)) inputs[file] = sha(fs.readFileSync(file, "utf8"));
  }
  try {
    const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
    const research = "artifacts/" + project.project_id + "/research.json";
    if (fs.existsSync(research)) inputs[research] = sha(fs.readFileSync(research, "utf8"));
  } catch {
    // Missing or malformed project inputs are reported by the production validator.
  }

  // A change to the authored-pack identity can change which component files are active.
  const authoredProjectFile = "src/shots/AUTHORED_PROJECT.json";
  if (fs.existsSync(authoredProjectFile)) inputs[authoredProjectFile] = sha(fs.readFileSync(authoredProjectFile, "utf8"));

  // Hash every code file capable of affecting pixels, including fallback sources and generated indexes.
  const code = {};
  for (const dir of ["src/shots", "src/remotion", "src/visual"]) {
    for (const rel of walkCode(dir)) code[rel] = sha(fs.readFileSync(rel, "utf8"));
  }
  inputs["src/shots/**+remotion+visual"] = code;

  for (const file of ["script/narration.txt", "script/storyboard_src.md", "fixtures/captions.json", "fixtures/visual-literals.json"]) {
    if (fs.existsSync(file)) inputs[file] = sha(fs.readFileSync(file, "utf8"));
  }

  let scenes = 0;
  let activeShots = 0;
  try {
    scenes = JSON.parse(fs.readFileSync(irFile, "utf8")).scenes.length;
    // Count active component imports, not every retained historical SCxx.jsx file.
    for (const file of walkCode("src/shots")) {
      if (!/^src\/shots\/G\d+\/index\.jsx$/.test(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      activeShots += [...source.matchAll(/import\s+\{SC\d+\}\s+from\s+["']\.\/(?:fallback-)?SC\d+\.jsx["']/g)].length;
    }
  } catch {}
  return {fingerprint: sha(JSON.stringify(inputs)), inputs, scenes, shots: activeShots};
}

function walkCode(dir) {
  const out = [];
  const visit = (d) => {
    for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) visit(p);
      else if (/\.(jsx|js|mjs)$/.test(ent.name)) out.push(p.split(path.sep).join("/"));
    }
  };
  if (fs.existsSync(dir)) visit(dir);
  return out.sort();
}
