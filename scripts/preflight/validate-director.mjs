import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const findings = [];
let generatedShotbook = null;
const add = (severity, gate, rule, shotId, evidence, suggestedFix) => findings.push({
  findingId: `DIR-${String(findings.length + 1).padStart(4, "0")}`,
  shotId: shotId ?? null, severity, gate, rule, evidence, suggestedFix,
  owner: gate === "GATE-1" ? "director" : "production",
  status: "open", verification: null,
});
const exists = (p) => fs.existsSync(path.join(root, p));
const irPath = "fixtures/render-ir-16x9.json";
const portraitPath = "fixtures/render-ir-9x16.json";
const scriptPath = "fixtures/script.json";
const timelinePath = "script/timeline.json";
const registryPath = "src/shots/registry.jsx";
for (const p of [irPath, portraitPath, scriptPath, timelinePath, registryPath]) {
  if (!exists(p)) add("BLOCKER", "GATE-3", "required-production-input", null, `Missing ${p}`, `Restore or generate ${p} from the existing production pipeline`);
}
if (findings.some((f) => f.severity === "BLOCKER")) {
  writeReport(null, null, null);
  process.exitCode = 1;
} else {
  try {
    const ir = readJson(irPath);
    const portrait = readJson(portraitPath);
    const script = readJson(scriptPath);
    const timeline = readJson(timelinePath);
    const registryText = fs.readFileSync(path.join(root, registryPath), "utf8");
    const scenes = ir.scenes;
    const portraitScenes = portrait.scenes;
    if (!Array.isArray(scenes) || !scenes.length) add("BLOCKER", "GATE-2", "empty-production-ir", null, "16:9 IR has no scenes", "Materialize IR from the locked script and timeline");
    const sceneIds = new Set();
    const registryIds = new Set([...registryText.matchAll(/["'](scene-[^"']+)["']\s*:/g)].map((m) => m[1]));
    const scriptSegments = script.segments || [];
    const timelineSentences = timeline.sentences || [];
    const fps = Number(ir.fps || 30);
    const durationFrames = Math.round(Number(ir.duration || 0) * fps);
    let mappedCount = 0;
    const shotbookShots = [];
    const risk = (scene) => {
      let score = 0;
      const motion = Array.isArray(scene.motion) ? scene.motion : [];
      const elements = Array.isArray(scene.elements) ? scene.elements : [];
      if (scene.recipe_new === true || scene.new_component === true) score += 25;
      if (elements.length > 5 || String(scene.composition?.focus || "").length > 32 || Number(scene.composition?.safe_margin ?? 0.08) < 0.04) score += 20;
      if (motion.length > 2 || new Set(motion.map((m) => m.target)).size > 2) score += 20;
      const textChars = elements.reduce((n, e) => n + String(e.text || "").length, 0);
      if (textChars > 160) score += 15;
      if (elements.some((e) => e.asset || e.src || e.path) && !scene.assetManifest) score += 10;
      if (scene.transitionIntent || scene.continuityIds?.length) score += 10;
      return Math.min(100, score);
    };
    for (let i = 0; i < scenes.length; i += 1) {
      const s = scenes[i];
      const id = s?.id;
      if (!id || typeof id !== "string") {
        add("BLOCKER", "GATE-2", "shot-id-required", id, `scene index ${i} has no string id`, "Assign the existing stable production scene ID");
        continue;
      }
      if (sceneIds.has(id)) add("BLOCKER", "GATE-2", "duplicate-shot-id", id, "Duplicate ID in 16:9 IR", "Fix the source segment/IR identity; do not rename only one downstream consumer");
      sceneIds.add(id);
      if (!registryIds.has(id)) add("BLOCKER", "GATE-3", "registry-mapping-missing", id, `${id} has no registry key`, "Add/fix the mapping in src/shots/registry.jsx or correct the source IR");
      const sr = s.source_ref || {};
      const seg = Number.isInteger(sr.segment_index) ? scriptSegments[sr.segment_index] : null;
      if (!seg || (sr.script_id && seg.id && sr.script_id !== seg.id)) {
        add("BLOCKER", "GATE-3", "script-segment-mapping", id, JSON.stringify(sr), "Re-materialize IR from fixtures/script.json; keep script_id and segment_index aligned");
      } else mappedCount += 1;
      if (!s.narrative_job || !String(s.narrative_job).trim()) add("BLOCKER", "GATE-1", "story-purpose-missing", id, "narrative_job is empty", "Assign a specific narrative function before implementation");
      if (!s.variant || !String(s.variant).trim()) add("BLOCKER", "GATE-1", "visual-recipe-missing", id, "variant is empty", "Choose a compatible existing visual recipe or submit a recipe change request");
      if (!Array.isArray(s.elements) || !s.elements.length) add("BLOCKER", "GATE-2", "visual-elements-missing", id, "No scene elements", "Add an explicit visual plan to the production IR");
      const start = Number(s.start);
      const duration = Number(s.duration);
      if (!Number.isFinite(start) || !Number.isFinite(duration) || start < 0 || duration <= 0) {
        add("BLOCKER", "GATE-2", "invalid-timing", id, JSON.stringify({start:s.start,duration:s.duration}), "Regenerate scene timing from the authoritative timeline");
      } else if (Math.round((start + duration) * fps) > durationFrames + 1) {
        add("BLOCKER", "GATE-2", "timing-outside-program", id, `end frame ${Math.round((start + duration) * fps)} exceeds duration frame ${durationFrames}`, "Reconcile IR duration with scene intervals and TTS timeline");
      }
      const score = risk(s);
      const level = score >= 50 ? "high" : score >= 25 ? "medium" : "low";
      if (level === "high") add("REVIEW", "GATE-5", "high-risk-shot-review", id, `Risk score ${score}/100; static checks cannot prove motion/layout quality`, "Generate entry/reveal/exit keyframes or a short preview and request independent director review");
      else if (level === "medium") add("WARN", "GATE-5", "medium-risk-shot-review", id, `Risk score ${score}/100`, "Review entry, reveal and exit states with low-cost keyframes");
      if (!s.continuityIds && !s.transitionIntent) add("WARN", "GATE-1", "continuity-intent-unresolved", id, "No explicit continuity/transition contract in current IR", "Add continuity metadata to authored director decisions; do not infer visual continuity from adjacency");
      const segment = Number.isInteger(s.source_ref?.segment_index) ? scriptSegments[s.source_ref.segment_index] : null;
      const startFrame = Math.round(Number(s.start || 0) * fps);
      const endFrame = startFrame + Math.round(Number(s.duration || 0) * fps);
      const textElements = (s.elements || []).filter((e) => e.text);
      const hero = (s.elements || []).find((e) => e.id === "hero") || null;
      shotbookShots.push({
        shotId: id,
        narrationBeat: {scriptId: s.source_ref?.script_id || segment?.id || "", text: segment?.text || "", status: timelineSentences.length ? "locked" : "estimated"},
        storyPurpose: String(s.narrative_job || "unresolved"),
        visualRelationship: s.visualRelationship || "unclassified",
        visualMetaphor: s.visualMetaphor || {status:"unresolved"},
        heroElement: hero?.id || null,
        layerPlan: {background: s.background ? [s.background] : [], subject: (s.elements || []).filter((e) => e.type !== "narration"), text: textElements, additional: []},
        entryState: s.entryState || {status:"unresolved"},
        keyAction: s.keyAction || {motion: s.motion || []},
        holdState: s.holdState || {status:"unresolved"},
        exitState: s.exitState || {status:"unresolved"},
        transitionIntent: s.transitionIntent || {status:"unresolved"},
        continuityIds: s.continuityIds || [],
        timing: {startFrame, endFrame, fps, status: timelineSentences.length ? "locked" : "estimated"},
        layoutBudget: {composition: s.composition || {}, textChars: textElements.reduce((n,e)=>n+String(e.text||"").length,0), status:"source-derived; pixel bounds unverified"},
        assetManifest: s.assetManifest || [],
        motionRecipe: {variant:s.variant || "unresolved", motion:s.motion || []},
        riskLevel: level,
        riskScore: score,
        validationPlan: level === "high" ? ["static-contracts","entry-keyframe","reveal-keyframe","exit-keyframe","independent-review"] : level === "medium" ? ["static-contracts","entry-keyframe","reveal-keyframe","exit-keyframe"] : ["static-contracts"]
      });
    }
    const portraitIds = portraitScenes.map((s) => s.id);
    if (portraitIds.length !== scenes.length || portraitIds.some((id, i) => id !== scenes[i]?.id)) {
      add("BLOCKER", "GATE-3", "cross-ratio-scene-identity", null, "9:16 scene IDs/order differ from 16:9", "Re-materialize both IRs from the same script and timeline");
    }
    for (let i = 1; i < scenes.length; i += 1) {
      const prev = scenes[i - 1], cur = scenes[i];
      const prevEnd = Number(prev.start) + Number(prev.duration);
      if (Number(cur.start) < prevEnd - (1 / fps)) add("BLOCKER", "GATE-2", "scene-overlap", cur.id, `${prev.id} ends at ${prevEnd.toFixed(3)}s; ${cur.id} starts at ${Number(cur.start).toFixed(3)}s`, "Reconcile segment timing with the authoritative TTS timeline");
    }
    if (!timelineSentences.length) add("BLOCKER", "GATE-0", "timeline-empty", null, "timeline.json has no sentences", "Generate a real word-boundary timeline; estimated timing is not locked timing");
    const orphanRegistryIds = [...registryIds].filter((id) => !sceneIds.has(id));
    for (const id of orphanRegistryIds) add("WARN", "GATE-3", "orphan-registry-entry", id, "Registry contains a scene absent from current IR", "Confirm intentional removal or regenerate the registry");
    generatedShotbook = {version:"1.0", projectId:ir.project_id || "unknown-project", source:{ir16x9:irPath,ir9x16:portraitPath,timeline:timelinePath}, shots:shotbookShots};
    writeReport(ir, scenes, {fps, durationFrames, mappedCount, registryCount: registryIds.size, scriptSegments: scriptSegments.length, timelineSentences: timelineSentences.length});
  } catch (error) {
    add("BLOCKER", "GATE-3", "preflight-exception", null, String(error?.stack || error), "Fix malformed input or validator assumptions before allowing rendering");
    writeReport(null, null, null);
    process.exitCode = 1;
  }
}

function writeReport(ir, scenes, stats) {
  const projectId = ir?.project_id || "unknown-project";
  const outDir = path.join(root, "artifacts", projectId, "preflight");
  fs.mkdirSync(outDir, {recursive: true});
  const blockers = findings.filter((f) => f.severity === "BLOCKER");
  const report = {
    version: "1.0",
    gate: "director-preflight",
    status: blockers.length ? "BLOCKED" : findings.some((f) => f.severity === "REVIEW") ? "REVIEW_REQUIRED" : findings.some((f) => f.severity === "WARN") ? "PASS_WITH_WARNINGS" : "PASS",
    sourceOfTruth: ["fixtures/render-ir-16x9.json", "fixtures/render-ir-9x16.json", "fixtures/script.json", "script/timeline.json", "src/shots/registry.jsx"],
    checksExecuted: ["required-inputs", "scene-id-uniqueness", "registry-mapping", "script-segment-mapping", "story-purpose", "visual-recipe", "element-presence", "timing-bounds", "scene-overlap", "timeline-presence", "cross-ratio-identity", "risk-scoring"],
    fullRenderExecuted: false,
    visualEvidence: {generated: false, requiredFor: [...new Set(findings.filter((f) => f.severity === "REVIEW").map((f) => f.shotId))]},
    stats: stats || {sceneCount: scenes?.length || 0},
    findings,
    limitations: ["This report validates source data and deterministic contracts only.", "No pixel geometry, font measurement, animation playback, or complete-video render was performed.", "A PASS here is not a full production PASS."]
  };
  fs.writeFileSync(path.join(outDir, "director-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`director preflight ${report.status}: ${scenes?.length || 0} scenes, ${blockers.length} blockers, ${findings.length} findings`);
  if (blockers.length) process.exitCode = 1;
}
