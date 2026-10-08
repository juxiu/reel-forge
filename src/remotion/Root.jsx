import React from "react";
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from "remotion";

function Scene({scene}) {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const local=Math.max(0,(frame/fps)-scene.start);
  const opacity=Math.min(1,local/0.25);
  return (
    <AbsoluteFill style={{display:"flex",alignItems:"center",justifyContent:"center",background:"#111",color:"#fff",padding:80,fontFamily:"Arial, sans-serif",opacity}}>
      <div style={{width:"82%",textAlign:"center"}}>
        <div style={{fontSize:28,letterSpacing:2,textTransform:"uppercase",opacity:0.65,marginBottom:24}}>{scene.visual.type}</div>
        <div style={{fontSize:54,fontWeight:700,lineHeight:1.15}}>{scene.narration.text}</div>
        <div style={{marginTop:32,fontSize:24,opacity:0.7}}>Reel Forge · Scene DSL → Remotion</div>
      </div>
    </AbsoluteFill>
  );
}

export const DemoComposition=({scenes})=>(
  <AbsoluteFill style={{background:"#111"}}>
    {scenes.map(scene=>(
      <Sequence key={scene.scene_id} from={Math.round(scene.start*30)} durationInFrames={Math.max(1,Math.round(scene.duration*30))}>
        <Scene scene={scene}/>
      </Sequence>
    ))}
  </AbsoluteFill>
);
