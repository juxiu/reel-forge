import {directSegment} from "./semantic-director.mjs";
import {BEAT} from "../visual/easing.mjs";

const VARIANTS = [["want-", "preference"],["structured", "structured"],["content-digest", "split"],["repr-digest", "split"],["connection", "network"],["transport", "network"],["compare", "comparison"],["versus", "comparison"],["before", "transformation"],["after", "transformation"],["step", "sequence"],["first", "sequence"],["then", "sequence"],["because", "causal"],["therefore", "causal"],["evidence", "evidence"],["source", "evidence"],["code", "code"],["api", "code"]];
function visualVariant(text = "") { const hit = VARIANTS.find(([needle]) => text.toLowerCase().includes(needle)); return hit?.[1] || "generic"; }
export function buildBeatGraph(script, timeline = null) {
  let cursor = 0;
  const decisions = [];
  const sentences = timeline?.sentences || [];
  const beats = script.segments.map((segment, i) => {
    const decision = directSegment(segment, i, decisions);
    decisions.push(decision);
    const timed = sentences[i];
    let start, duration;
    if (timed) {
      // 镜头区间 = [本句 from−8, 下一句 from−9]；章末 / 片末 = 末句 to+2（a2e 分镜表衔接规则）。
      // 为什么要连续：旧口径把区间取成 segment 自身跨度 [from, to]，于是 44 个镜头之间留下
      // 43 处空场（普通 33 帧、章界 58 帧，合计 1492/10117 = 14.7% 的内容区完全没有镜头在演）——
      // a2e 的「相邻镜头正好首尾相接」正是为了消掉这段空舞台。帧号 1-based，含端点。
      const startN = timed.from - BEAT.SHOT_LEAD;
      const next = sentences[i + 1];
      const tiles = next && next.chapter === timed.chapter;
      const endN = tiles ? next.from - BEAT.SHOT_LEAD - 1 : timed.to + BEAT.SHOT_TAIL;
      start = Math.max(0, (startN - 1) / 30);
      duration = Math.max(0.5, (endN - startN + 1) / 30);
    } else {
      start = cursor;
      duration = Math.max(0.5, Math.max(4, Math.min(7, segment.text.length / 8)));
    }
    cursor = start + duration;
    return {id:"beat-"+String(i+1).padStart(3,"0"),start,duration,narrative_job:decision.narrative_job,hero:{type:"concept",size:"large"},state_change:"enter -> transform -> settle",camera:{type:i%2?"pan":"push",amount:0.04,duration_frames:Math.round(duration*30)},settle_frames:30,idle_frames:0,text_role:"narration",asset_need:"diagram-or-code",source_ref:{segment_index:i,script_id:segment.id||null},visual_variant:decision.variant,composition:{focus:"hero-plus-flow",hero_weight:0.68,safe_margin:0.08},light:{mode:"hero-key",key_intensity:0.82,accent:"purple"},ppt_risk:"static-card",semantic_confidence:decision.confidence,matched_rules:decision.matched_rules};
  });
  return {duration:cursor,beats};
}
export function beatToScene(beat, segment) { return {scene_id:"scene-"+beat.id.slice(5),start:beat.start,duration:beat.duration,narration:{text:segment.text},source_ref:beat.source_ref,variant:beat.visual_variant,narrative_job:beat.narrative_job,semantic_confidence:beat.semantic_confidence,matched_rules:beat.matched_rules||[],composition:beat.composition,light:beat.light,// ⚠ hero 元素标成 narration 而不是 card：它带的是**这一镜的解说词全文**，
  //   而 a2e 硬规则是「整句解说词不进画面」（plan.mjs 的 heroTextOf 拒收 >12 宽度单位）。
  //   标成 card 会让 verify:text-provenance 判它「画面文案无出处」—— 门没骂错，是类型标错了。
  //   画面文案由各镜 recipe.stage.items 提供（走 B 段字面量白名单）。
  visual:{type:"explainer",objects:[{id:"hero",type:"narration",text:segment.text},{id:"flow",type:"signal"}]},motion:[{type:"enter",target:"hero",preset:"rise"},{type:"transform",target:"flow",preset:"travel"},{type:"camera",target:"stage",preset:beat.camera.type,amount:beat.camera.amount}]};}
