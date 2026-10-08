import React from "react";
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from "remotion";

function keyframes(frame, points, fallback=1) {
  if(!Array.isArray(points)||!points.length) return fallback;
  const sorted=points.slice().sort((a,b)=>a[0]-b[0]);
  if(frame<=sorted[0][0]) return Number(sorted[0][1]);
  if(frame>=sorted.at(-1)[0]) return Number(sorted.at(-1)[1]);
  for(let i=1;i<sorted.length;i++){
    const [f1,v1]=sorted[i-1], [f2,v2]=sorted[i];
    if(frame<=f2){ const p=(frame-f1)/Math.max(1,f2-f1); return Number(v1)+(Number(v2)-Number(v1))*p; }
  }
  return fallback;
}

export function FootageClip({spec}) {
  const frame=spec.from+useCurrentFrame();
  const scale=keyframes(frame,spec.zoomKf,1);
  const x=keyframes(frame,spec.panKf,0);
  const y=keyframes(frame,spec.panYKf,0);
  const opacity=keyframes(frame,spec.opacityKf,1);
  return <AbsoluteFill style={{overflow:"hidden",opacity,background:"#08080c"}}>
    <div style={{position:"absolute",inset:0,transform:"translate("+x+"px,"+y+"px) scale("+scale+")",transformOrigin:(spec.originX??640)+"px "+(spec.originY??360)+"px"}}>
      <OffthreadVideo src={staticFile(spec.src)} trimBefore={Math.max(0,Number(spec.srcFrom||0))} muted
        style={{width:"100%",height:"100%",objectFit:"cover",filter:spec.filter||"saturate(.9) contrast(1.05) brightness(.82)"}} />
    </div>
    {(spec.grade||"dark")==="dark" ? <AbsoluteFill style={{background:"radial-gradient(ellipse 100% 95% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,.68) 100%)"}}/> : null}
  </AbsoluteFill>;
}

export function FootageTrack({specs=[]}) {
  return <AbsoluteFill>
    {specs.map(spec=><Sequence key={spec.from+"-"+spec.src} from={Math.max(0,spec.from-1)} durationInFrames={Math.max(1,spec.to-spec.from+1)}>
      <FootageClip spec={spec}/>
    </Sequence>)}
  </AbsoluteFill>;
}
