export function validateScene(scene) {
  const errors=[];
  if(!scene?.scene_id) errors.push("missing scene_id");
  if(!(scene?.duration>0)) errors.push("invalid duration");
  if(!scene?.narration?.text) errors.push("missing narration");
  if(!scene?.visual?.type) errors.push("missing visual type");
  return errors;
}

export function affectedDownstream(graph, failedNode) {
  const outgoing=new Map();
  for(const edge of graph.edges) {
    if(!outgoing.has(edge.from)) outgoing.set(edge.from,[]);
    outgoing.get(edge.from).push(edge.to);
  }
  const seen=new Set([failedNode]);
  const queue=[failedNode];
  while(queue.length) {
    const node=queue.shift();
    for(const next of outgoing.get(node)||[]) {
      if(!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return [...seen];
}
