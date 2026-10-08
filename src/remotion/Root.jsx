import React from "react";
import {AbsoluteFill,Sequence,useCurrentFrame,useVideoConfig,interpolate,Audio,staticFile} from "remotion";

function Scene({scene,captions}){
  const frame=useCurrentFrame(),config=useVideoConfig(),fps=config.fps,local=Math.max(0,frame/fps-scene.start),p=Math.min(1,local/.45),x=Math.sin(local*1.4)*10,y=(1-p)*50+x,scale=interpolate(p,[0,1],[.94,1]),hero=scene.elements.find(e=>e.id==="hero");
  const visible=(captions||[]).find(c=>frame/fps>=c.start&&frame/fps<c.end);
  return <AbsoluteFill style={{background:"#080811",color:"#fff",fontFamily:"Arial,sans-serif"}}>
    <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 45%,#24204c 0%,#080811 62%)"}}/>
    <div style={{position:"absolute",top:"9%",left:"8%",fontSize:20,letterSpacing:4,opacity:.5}}>REEL FORGE</div>
    <div style={{position:"absolute",bottom:"12%",left:"8%",right:"8%",height:6,background:"#202035"}}><div style={{height:"100%",width:Math.min(100,local/scene.duration*100)+"%",background:"#7d68ff"}}/></div>
    <div style={{position:"absolute",top:"23%",left:"10%",right:"10%",transform:"translateY("+y+"px) scale("+scale+")",opacity:p}}>
      <div style={{fontSize:20,letterSpacing:3,color:"#a993ff",marginBottom:20}}>CONCEPT</div>
      <div style={{fontSize:58,fontWeight:700,lineHeight:1.12,textShadow:"0 0 24px rgba(125,104,255,.35)"}}>{hero?.text}</div>
      <div style={{marginTop:28,fontSize:26,opacity:.68}}>enter → transform → settle</div>
    </div>
    {visible&&<div style={{position:"absolute",left:"8%",right:"8%",bottom:"3.5%",padding:"12px 18px",borderRadius:18,background:"rgba(20,20,32,.88)",fontSize:28,textAlign:"center",lineHeight:1.25}}>{visible.text}</div>}
  </AbsoluteFill>;
}
export function ReelForgeComposition({renderIR,captions}){return <AbsoluteFill><Audio src={staticFile("audio.mp3")} volume={1}/>{renderIR.scenes.map(s=><Sequence key={s.id} from={Math.round(s.start*renderIR.fps)} durationInFrames={Math.max(1,Math.round(s.duration*renderIR.fps))}><Scene scene={s} captions={captions}/></Sequence>)}</AbsoluteFill>}
