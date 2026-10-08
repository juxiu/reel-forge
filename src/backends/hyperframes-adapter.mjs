export function sceneToRenderIR(scene, options={}) {
  const width=options.width??1280;
  const height=options.height??720;
  const fps=options.fps??30;
  return {
    version:"0.1",
    width,
    height,
    fps,
    scenes:[{
      id:scene.scene_id,
      start:scene.start,
      duration:scene.duration,
      elements:scene.visual.objects.map((o)=>({
        id:o.id,
        kind:o.type,
        text:o.text??o.label??"",
        style:{position:"center",safeArea:true}
      })).concat([{
        id:"caption",
        kind:"caption",
        text:scene.narration.text,
        style:{position:"bottom",safeArea:true}
      }])
    }]
  };
}

export function renderIRToHyperFramesHtml(ir) {
  const scenes=ir.scenes.map((s)=>`<section data-scene="${s.id}" data-start="${s.start}" data-duration="${s.duration}">${s.elements.map(e=>`<div data-id="${e.id}" data-kind="${e.kind}">${escapeHtml(e.text)}</div>`).join("")}</section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:#111;color:#fff;font-family:Arial,sans-serif}section{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:10%;box-sizing:border-box}div{font-size:48px;text-align:center}</style></head><body>${scenes}</body></html>`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
