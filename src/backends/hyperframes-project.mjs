export function buildHyperFramesProject(renderIR){
  return{version:"0.1",canvas:{width:renderIR.width,height:renderIR.height,fps:renderIR.fps},scenes:renderIR.scenes.map(scene=>({id:scene.id,start:scene.start,duration:scene.duration,components:scene.elements.map(e=>({id:e.id,type:e.type,text:e.text||""})),motion:scene.motion}))};
}