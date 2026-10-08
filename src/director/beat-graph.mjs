export function buildBeatGraph(script,timeline=null){
  let cursor=0;
  const beats=script.segments.map((segment,i)=>{
    const timed=timeline?.sentences?.[i];
    const start=timed?Math.max(0,(timed.from-1)/30):cursor;
    const end=timed?timed.to/30:start+Math.max(3.5,Math.min(7,segment.text.length/8));
    const duration=Math.max(0.5,end-start);
    cursor=end;
    return{id:"beat-"+String(i+1).padStart(3,"0"),start,duration,narrative_job:i===0?"hook":"explain",hero:{type:"concept",size:"large"},state_change:"enter -> transform -> settle",camera:{type:i%2?"pan":"push",amount:0.04},text_role:"narration",asset_need:"diagram-or-code",ppt_risk:"static-card"};
  });
  return{duration:cursor,beats};
}
export function beatToScene(beat,segment){return{scene_id:"scene-"+beat.id.slice(5),start:beat.start,duration:beat.duration,narration:{text:segment.text},visual:{type:"explainer",objects:[{id:"hero",type:"card",text:segment.text},{id:"flow",type:"signal"}]},motion:[{type:"enter",target:"hero",preset:"rise"},{type:"transform",target:"flow",preset:"travel"},{type:"camera",target:"stage",preset:beat.camera.type}]};}