import fs from "node:fs";
import path from "node:path";
import {buildPlan, repairItems} from "../src/shots/plan.mjs";
import {design} from "../src/visual/style.mjs";
import {isCameraPreset} from "../src/visual/camera.mjs";

/**
 * 分镜合规审计（不渲染，纯函数层）。
 *
 * 为什么单独一步：`buildPlan().issues` 是**唯一**能在渲染前说出
 * 「这一镜在现有分镜数据下做不到合规画面」的地方，但它以前只在内存里生成、
 * 谁都不读 —— QC 只看像素，Repair 只能对着截图猜。现在把它落成 JSON 交给 QC/Repair。
 *
 * ⚠ 审计用的是镜头文件里真实的 SHOT_RECIPE（authored 声明），不是 fixture 里的最小 recipe：
 *    用最小 recipe 会漏掉 camera / seed / support_count 这些正主声明，
 *    于是「分镜写了引擎不认识的相机名」这类问题永远查不出来。
 */

const project = JSON.parse(fs.readFileSync(process.env.PROJECT_FILE || "fixtures/project.json", "utf8"));
const captions = fs.existsSync("script/captions.json") ? JSON.parse(fs.readFileSync("script/captions.json", "utf8")) : JSON.parse(fs.readFileSync("fixtures/captions.json", "utf8"));

/** registry.jsx → {sceneId: 镜头源文件}。 */
function shotFileIndex() {
  const registry = fs.readFileSync("src/shots/registry.jsx", "utf8");
  const groups = [...registry.matchAll(/import \* as (G\d+) from "\.\/(G\d+)\/index\.jsx"/g)].map((m) => m[2]);
  const index = new Map();
  for (const group of groups) {
    const entry = path.join("src/shots", group, "index.jsx");
    if (!fs.existsSync(entry)) continue;
    for (const m of fs.readFileSync(entry, "utf8").matchAll(/"([^"]+)":\s*(SC\d+)/g)) {
      const file = path.join("src/shots", group, `${m[2]}.jsx`).split(path.sep).join("/");
      if (fs.existsSync(file)) index.set(m[1], file);
    }
  }
  return index;
}

/** 从镜头源文件里把 SHOT_RECIPE 取成真正的对象（不是字符串包含判断）。 */
function recipeOf(file) {
  const source = fs.readFileSync(file, "utf8");
  const start = source.indexOf("SHOT_RECIPE");
  const brace = source.indexOf("{", start);
  if (start < 0 || brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        const literal = source.slice(brace, i + 1);
        try {
          return new Function(`return (${literal});`)();
        } catch {
          return {__parse_error: file};
        }
      }
    }
  }
  return null;
}

const index = shotFileIndex();
const scenes = [];
const blocking = [];
for (const ratio of ["16x9", "9x16"]) {
  const file = "fixtures/render-ir-" + ratio + ".json";
  if (!fs.existsSync(file)) continue;
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const d = design(ir.width, ir.height);
  for (const scene of ir.scenes || []) {
    const shotFile = index.get(scene.id);
    const authored = shotFile ? recipeOf(shotFile) : null;
    const recipe = {...{shot_id: scene.id, variant: scene.variant || "generic", settle_frames: 30}, ...(authored || {})};
    const plan = buildPlan({scene, recipe, captions, fps: ir.fps, bands: d.bands, logicalH: d.height});
    const items = repairItems(plan);
    const declaredCamera = String(recipe.camera || scene.camera || "").toLowerCase();
    const cameraOk = !declaredCamera || isCameraPreset(declaredCamera);
    scenes.push({
      ratio,
      scene: scene.id,
      shot_file: shotFile || null,
      variant: plan.variant,
      frames: plan.len,
      camera_preset: plan.camera.preset,
      camera_declared: recipe.camera || scene.camera || null,
      camera_recognised: cameraOk,
      parallax: Boolean(plan.camera.depths),
      exit_at: plan.exit.exitAt,
      issues: plan.issues,
      repairs: items,
    });
    for (const {token, message, fix, auto, ...data} of items) blocking.push({ratio, node: scene.id, type: token, detail: message, fix, auto, ...data});
    if (authored && authored.__parse_error) blocking.push({ratio, node: scene.id, type: "recipe-parse-error", detail: `${shotFile} 的 SHOT_RECIPE 不是可求值的对象字面量`, fix: "rewrite-recipe-as-literal", auto: false});
  }
}

const outDir = path.join("artifacts", project.project_id, "qc");
fs.mkdirSync(outDir, {recursive: true});
const report = {
  schema_version: 1,
  status: blocking.length ? "FAIL" : "PASS",
  scene_count: scenes.length,
  scenes,
  blocking,
  generated_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "plan_audit.json"), JSON.stringify(report, null, 2));
console.log("plan audit", report.status, JSON.stringify({scenes: scenes.length, issues: blocking.length, out: path.join(outDir, "plan_audit.json")}));
// 审计是**信息**，不是终判：画面是否合规仍由 frame_metrics / motion_check 定。
// 所以这里只在「分镜自己就矛盾」时非零退出，让 repair-cycle 有机会先改分镜再渲。
if (blocking.length) process.exit(1);
