import {directSegment} from "./semantic-director.mjs";

const VARIANTS = [["want-", "preference"],["structured", "structured"],["content-digest", "split"],["repr-digest", "split"],["connection", "network"],["transport", "network"],["compare", "comparison"],["versus", "comparison"],["before", "transformation"],["after", "transformation"],["step", "sequence"],["first", "sequence"],["then", "sequence"],["because", "causal"],["therefore", "causal"],["evidence", "evidence"],["source", "evidence"],["code", "code"],["api", "code"]];
function visualVariant(text = "") { const hit = VARIANTS.find(([needle]) => text.toLowerCase().includes(needle)); return hit?.[1] || "generic"; }
export function buildBeatGraph(script, timeline = null) {
  let cursor = 0;
  const decisions = [];
  const beats = script.segments.map((segment, i) => {
    const decision = directSegment(segment, i, decisions);
    decisions.push(decision);
    const timed = timeline?.sentences?.[i]; const start = timed ? Math.max(0, (timed.from - 1) / 30) : cursor;
    const end = timed ? timed.to / 30 : start + Math.max(4, Math.min(7, segment.text.length / 8)); const duration = Math.max(0.5, end - start); cursor = end;
    return {id:"beat-"+String(i+1).padStart(3,"0"),start,duration,narrative_job:decision.narrative_job,hero:{type:"concept",size:"large"},state_change:"enter -> transform -> settle",camera:{type:i%2?"pan":"push",amount:0.04,duration_frames:Math.round(duration*30)},settle_frames:30,idle_frames:0,text_role:"narration",asset_need:"diagram-or-code",source_ref:{segment_index:i,script_id:segment.id||null},visual_variant:decision.variant,composition:{focus:"hero-plus-flow",hero_weight:0.68,safe_margin:0.08},light:{mode:"hero-key",key_intensity:0.82,accent:"purple"},ppt_risk:"static-card",semantic_confidence:decision.confidence,matched_rules:decision.matched_rules};
  });
  return {duration:cursor,beats};
}
export function beatToScene(beat, segment) { return {scene_id:"scene-"+beat.id.slice(5),start:beat.start,duration:beat.duration,narration:{text:segment.text},source_ref:beat.source_ref,variant:beat.visual_variant,narrative_job:beat.narrative_job,semantic_confidence:beat.semantic_confidence,matched_rules:beat.matched_rules||[],composition:beat.composition,light:beat.light,visual:{type:"explainer",objects:[{id:"hero",type:"card",text:segment.text},{id:"flow",type:"signal"}]},motion:[{type:"enter",target:"hero",preset:"rise"},{type:"transform",target:"flow",preset:"travel"},{type:"camera",target:"stage",preset:beat.camera.type,amount:beat.camera.amount}]};}
