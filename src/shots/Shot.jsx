import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {PALETTE, safeArea, clamp01, easeOut} from "../visual/style.mjs";

function motionAmount(scene) {
  const camera = scene.motion && scene.motion.find((item) => item.target === "stage");
  return Number(camera?.amount ?? 0.04);
}

function NetworkDiagram({frame, width, height, tall}) {
  const centerX = tall ? width / 2 : width * 0.58;
  const centerY = tall ? height * 0.5 : height * 0.5;
  const radiusX = tall ? width * 0.28 : width * 0.24;
  const radiusY = tall ? height * 0.18 : height * 0.13;
  const nodes = [0,1,2,3].map((index) => ({
    x: centerX + Math.cos(index * Math.PI * 2 / 4) * radiusX,
    y: centerY + Math.sin(index * Math.PI * 2 / 4) * radiusY,
  }));
  const pulse = ((frame * 0.09) % 1);
  return <div style={{position:"absolute",inset:0}}>
    {nodes.map((node, i) => <React.Fragment key={i}>
      {i > 0 ? <div style={{position:"absolute",left:Math.min(node.x,nodes[i-1].x),top:Math.min(node.y,nodes[i-1].y),width:Math.abs(node.x-nodes[i-1].x)||2,height:2,background:PALETTE.purple,opacity:.35}}/> : null}
      <div style={{position:"absolute",left:node.x-15,top:node.y-15,width:30,height:30,borderRadius:999,background:PALETTE.purpleLight,boxShadow:"0 0 24px rgba(125,104,255,.45)"}}/>
    </React.Fragment>)}
    <div style={{position:"absolute",left:centerX-radiusX,top:centerY-1,width:radiusX*2,height:3,background:"linear-gradient(90deg,transparent,"+PALETTE.purpleLight+",transparent)",transform:"translateX("+(pulse*radiusX*1.6-radiusX*.8)+"px)",opacity:.9}}/>
  </div>;
}

function SplitDigestDiagram({frame, width, height}) {
  const y = height * 0.52;
  const pulse = (frame * 8) % Math.max(1, width);
  return <div style={{position:"absolute",inset:0}}>
    <div style={{position:"absolute",left:width*.13,top:y-42,width:width*.26,height:84,border:"2px solid "+PALETTE.line,borderRadius:20,background:"rgba(17,17,26,.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800}}>message</div>
    <div style={{position:"absolute",left:width*.43,top:y-2,width:width*.12,height:3,background:PALETTE.purple}}/>
    <div style={{position:"absolute",left:width*.58,top:y-88,width:width*.26,height:70,border:"2px solid "+PALETTE.purple,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:PALETTE.purpleLight}}>Content-Digest</div>
    <div style={{position:"absolute",left:width*.58,top:y+18,width:width*.26,height:70,border:"2px solid "+PALETTE.line,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:PALETTE.white}}>Repr-Digest</div>
    <div style={{position:"absolute",left:(pulse%(width*.65))+width*.18,top:y-2,width:24,height:24,borderRadius:999,background:PALETTE.white,boxShadow:"0 0 20px rgba(255,255,255,.55)"}}/>
  </div>;
}

function PreferenceDiagram({frame, width, height}) {
  const labels = ["Want-Content-Digest","Want-Repr-Digest","sender preference"];
  return <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",gap:16,paddingLeft:"12%",paddingRight:"12%"}}>
    {labels.map((label, i) => {
      const enter = easeOut(clamp01((frame - i * 10 + 1) / 18));
      const pulse = .35 + .65 * ((Math.sin(frame / 9 + i) + 1) / 2);
      return <div key={label} style={{transform:"translateX(" + ((1-enter)*70) + "px)",opacity:enter,display:"flex",alignItems:"center",gap:18}}>
        <div style={{width:18,height:18,borderRadius:999,background:PALETTE.purpleLight,boxShadow:"0 0 18px rgba(125,104,255,"+pulse.toFixed(2)+")"}}/>
        <div style={{flex:1,height:58,border:"2px solid "+(i===0?PALETTE.purple:PALETTE.line),borderRadius:18,display:"flex",alignItems:"center",paddingLeft:24,fontSize:26,fontWeight:800,background:"rgba(17,17,26,.88)",color:i===0?PALETTE.purpleLight:PALETTE.white}}>{label}</div>
      </div>;
    })}
  </div>;
}

function StructuredDiagram({frame, width, height}) {
  const p = easeOut(clamp01((frame - 12) / 34));
  return <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:28}}>
    <div style={{width:width*.22,height:130,border:"2px solid "+PALETTE.line,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,opacity:1-p}}>Digest</div>
    <div style={{width:90,height:4,background:PALETTE.purple,transform:"scaleX("+(.4+.6*p)+")",boxShadow:"0 0 16px rgba(125,104,255,.45)"}}/>
    <div style={{width:width*.30,height:160,border:"2px solid "+PALETTE.purple,borderRadius:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,fontWeight:900,color:PALETTE.purpleLight,transform:"translateY("+((1-p)*28)+"px) scale("+(.92+.08*p)+")",opacity:.2+.8*p}}>Structured Fields</div>
  </div>;
}

function VariantDiagram({variant, frame, width, height, tall}) {
  if (variant === "network") return <NetworkDiagram frame={frame} width={width} height={height} tall={tall}/>;
  if (variant === "split") return <SplitDigestDiagram frame={frame} width={width} height={height}/>;
  if (variant === "preference") return <PreferenceDiagram frame={frame} width={width} height={height}/>;
  if (variant === "structured") return <StructuredDiagram frame={frame} width={width} height={height}/>;
  return null;
}

export function ExplainerShot({scene, variant = "generic"}) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const area = safeArea(config.width, config.height);
  const len = Math.max(1, Math.round(scene.duration * config.fps));
  const enter = easeOut(Math.min(1, (frame + 1) / 22));
  const exit = clamp01((len - frame) / 12);
  const hold = Math.min(1, Math.max(0, (frame - 28) / 30));
  const cameraAmount = Math.max(0, Math.min(0.12, motionAmount(scene)));
  const push = 1 + Math.min(cameraAmount, frame / Math.max(1, len) * cameraAmount);
  const drift = Math.sin(frame / 34) * (6 + cameraAmount * 80);
  const tall = config.height > config.width;
  const cx = tall ? config.width / 2 : config.width * 0.52;
  const cy = tall ? config.height * 0.41 : config.height * 0.42;
  const cardW = tall ? config.width * 0.84 : Math.min(config.width * 0.72, 800);
  const cardH = tall ? 420 : 330;
  const titleSize = tall ? 42 : 52;
  const hero = scene.elements && scene.elements.find((item) => item.id === "hero");
  const heroText = hero && hero.text ? hero.text : (scene.narration && scene.narration.text) || "Explainer";
  const heroScale = Number(scene.hero_scale ?? 1);

  return <div style={{position:"absolute",inset:0,opacity:exit}}>
    <div style={{position:"absolute",left:cx-cardW/2,top:cy-cardH/2+drift+(1-enter)*48,width:cardW,height:cardH,transform:"scale("+push*heroScale+")",opacity:enter}}>
      <div style={{position:"absolute",inset:0,border:"2px solid "+PALETTE.line,borderRadius:26,background:"linear-gradient(145deg,rgba(17,17,26,.96),rgba(8,8,13,.9))",boxShadow:"0 0 0 1px rgba(125,104,255,.15),0 0 52px rgba(85,64,196,.22)"}}/>
      <div style={{position:"absolute",left:26,top:22,fontFamily:"Arial,sans-serif",fontSize:16,letterSpacing:4,color:PALETTE.purpleLight}}>CORE CONCEPT</div>
      <div style={{position:"absolute",left:26,right:26,top:60,fontFamily:"Arial,sans-serif",fontWeight:900,fontSize:titleSize,lineHeight:1.08,color:PALETTE.white,textShadow:"0 0 22px rgba(125,104,255,.28)"}}>{heroText}</div>
      <VariantDiagram variant={variant} frame={frame} width={cardW} height={cardH} tall={tall}/>
      <div style={{position:"absolute",left:26,bottom:24,right:26,height:3,background:"linear-gradient(90deg,"+PALETTE.purple+",transparent)",opacity:.7}}/>
    </div>
    {!tall ? <div style={{position:"absolute",left:area.left,bottom:area.bottom+56,maxWidth:360,fontFamily:"Arial,sans-serif",fontSize:18,lineHeight:1.4,color:PALETTE.grey,opacity:.7*hold}}>enter → transform → settle</div> : null}
  </div>;
}
