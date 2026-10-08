import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {PALETTE, safeArea, clamp01, easeOut} from "../visual/style.mjs";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function Fade({children,frame,duration,style={}}){
  const enter=easeOut(clamp01((frame+1)/20));
  const exit=clamp01((duration-frame)/12);
  return <div style={{position:"absolute",inset:0,opacity:enter*exit,...style}}>{children}</div>;
}
function Label({children,x,y,color=PALETTE.white,size=24,align="left",mono=false}){
  return <div style={{position:"absolute",left:x,top:y,color,fontSize:size,fontWeight:800,fontFamily:mono?"monospace":"Arial,sans-serif",textAlign:align,whiteSpace:"nowrap"}}>{children}</div>;
}
function Box({x,y,w,h,border=PALETTE.line,fill="rgba(10,10,16,.78)",radius=18,children,style={}}){
  return <div style={{position:"absolute",left:x,top:y,width:w,height:h,border:"2px solid "+border,borderRadius:radius,background:fill,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center",...style}}>{children}</div>;
}
function Arrow({x1,y1,x2,y2,color=PALETTE.purpleLight,progress=1,width=4}){
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,angle=Math.atan2(dy,dx)*180/Math.PI,p=clamp(progress,0,1);
  return <div style={{position:"absolute",left:x1,top:y1,width:len*p,height:width,background:color,transformOrigin:"0 50%",transform:"rotate("+angle+"deg)",boxShadow:"0 0 14px rgba(125,104,255,.24)"}}/>;
}
function Hero({text,x,y,size,color=PALETTE.white,accent=PALETTE.purpleLight}){
  return <div style={{position:"absolute",left:x,top:y,width:size*2.2,minHeight:size,display:"flex",alignItems:"center",color,fontWeight:900,fontSize:clamp(size*.22,34,72),lineHeight:1.05,textShadow:"0 0 24px rgba(125,104,255,.22)",borderLeft:"5px solid "+accent,paddingLeft:22,boxSizing:"border-box"}}>{text}</div>;
}
function NetworkShot({scene,recipe,frame,width,height}){
  const cx=width*(recipe.mirror?.38:.62),cy=height*.48,r=Math.min(width,height)*.18,p=easeOut(clamp01((frame-10)/28));
  const count=recipe.support_count||6,nodes=Array.from({length:count},(_,i)=>{const a=Math.PI*2*i/count+frame*.008;return{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.78};});
  return <><Hero text={scene.narration?.text||"signal"} x={recipe.mirror?width*.08:width*.52} y={height*.18} size={recipe.hero_size}/>
    {nodes.map((n,i)=><Arrow key={"a"+i} x1={cx} y1={cy} x2={n.x} y2={n.y} progress={p} color={i%2?PALETTE.line:PALETTE.purple}/>)}
    {nodes.map((n,i)=><div key={"n"+i} style={{position:"absolute",left:n.x-18,top:n.y-18,width:36,height:36,borderRadius:999,background:i===0?PALETTE.purpleLight:"rgba(255,255,255,.92)",boxShadow:i===0?"0 0 22px rgba(125,104,255,.65)":"0 0 8px rgba(255,255,255,.15)",opacity:p}}/>)}
    <div style={{position:"absolute",left:cx-42,top:cy-42,width:84,height:84,borderRadius:999,border:"3px solid "+PALETTE.purpleLight,boxShadow:"0 0 28px rgba(125,104,255,.45)",transform:"scale("+(0.88+0.12*p)+")"}}/>
    <Label x={cx-70} y={cy+58} size={22} color={PALETTE.grey}>dominant flow</Label>
  </>;
}
function SplitShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-8)/26)),input=scene.narration?.text||"input",labels=recipe.labels||["signal","structure"];
  return <><Box x={width*.08} y={height*.40} w={width*.24} h={120} border={PALETTE.line} style={{transform:"translateX("+((1-p)*-45)+"px)"}}><span style={{fontSize:34,fontWeight:900}}>{input.slice(0,18)}</span></Box>
    <Arrow x1={width*.34} y1={height*.47} x2={width*.50} y2={height*.47} progress={p}/>
    {labels.map((label,i)=><Box key={label} x={width*.54} y={height*(i?.56:.36)} w={width*.31} h={102} border={i===recipe.accent_index?PALETTE.purple:PALETTE.line} style={{transform:"translateY("+((1-p)*(i?28:-28))+"px)",color:i===recipe.accent_index?PALETTE.purpleLight:PALETTE.white}}><span style={{fontSize:30,fontWeight:900}}>{label}</span></Box>)}
    <Hero text={scene.narrative_job||"split"} x={width*.10} y={height*.16} size={recipe.hero_size}/>
  </>;
}
function PreferenceShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-6)/24)),options=recipe.labels||["option A","option B","preferred"];
  return <><Hero text={scene.narration?.text||"preference"} x={width*.08} y={height*.13} size={recipe.hero_size}/>
    <div style={{position:"absolute",left:width*.14,right:width*.14,top:height*.43}}>{options.map((label,i)=>{const active=i===recipe.accent_index;return <div key={label} style={{position:"relative",height:62,marginBottom:16,border:"2px solid "+(active?PALETTE.purple:PALETTE.line),borderRadius:16,background:"rgba(12,12,18,.82)",transform:"translateX("+((1-p)*70*(recipe.mirror?-1:1))+"px)",opacity:p,display:"flex",alignItems:"center",padding:"0 22px",color:active?PALETTE.purpleLight:PALETTE.white,fontSize:26,fontWeight:800}}><div style={{width:16,height:16,borderRadius:999,background:active?PALETTE.purpleLight:PALETTE.grey,marginRight:14}}/>{label}{active?<div style={{marginLeft:"auto",fontSize:18,color:PALETTE.purpleLight}}>SELECTED</div>:null}</div>})}</div>
  </>;
}
function StructuredShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-10)/30)),fields=recipe.labels||["header","payload","metadata","policy"];
  return <><Hero text={scene.narrative_job||"structured fields"} x={width*.08} y={height*.12} size={recipe.hero_size}/>
    <Box x={width*.50} y={height*.28} w={width*.38} h={height*.47} border={PALETTE.purple} style={{transform:"translateY("+((1-p)*34)+"px) scale("+(0.95+0.05*p)+")"}}>
      <div style={{position:"absolute",inset:22}}>{fields.map((label,i)=><div key={label} style={{height:40,marginBottom:12,borderBottom:"1px solid "+(i===recipe.accent_index?PALETTE.purple:PALETTE.line),display:"flex",alignItems:"center",justifyContent:"space-between",color:i===recipe.accent_index?PALETTE.purpleLight:PALETTE.white,fontSize:22,fontWeight:800,opacity:clamp01(p+i*.05)}}><span>{label}</span><span style={{color:PALETTE.grey}}>{"{...}"}</span></div>)}</div>
    </Box><Label x={width*.10} y={height*.64} size={24} color={PALETTE.grey}>schema → inspectable state</Label>
  </>;
}
function ComparisonShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-8)/26)),rows=recipe.rows||["speed","quality","cost"];
  return <><Hero text={scene.narrative_job||"compare"} x={width*.08} y={height*.12} size={recipe.hero_size}/>
    {[0,1].map(i=><Box key={i} x={width*(i?.56:.10)} y={height*.34} w={width*.28} h={height*.38} border={i===1?PALETTE.purple:PALETTE.line} style={{transform:"translateY("+((1-p)*(i?18:-18))+"px)"}}>
      <div style={{position:"absolute",left:20,right:20,top:18,fontSize:34,fontWeight:900,color:i===1?PALETTE.purpleLight:PALETTE.white}}>{i===1?"B":"A"}</div>
      <div style={{position:"absolute",left:20,right:20,top:70}}>{rows.map((row,j)=><div key={row} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+PALETTE.line,color:PALETTE.white,fontSize:20}}><span>{row}</span><span style={{color:(j+i)%2===0?PALETTE.purpleLight:PALETTE.grey}}>{(j+1)*(i+1)}</span></div>)}</div>
    </Box>)}<div style={{position:"absolute",left:width*.49,top:height*.49,fontSize:42,fontWeight:900,color:PALETTE.white}}>VS</div>
  </>;
}
function TransformationShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-8)/30));
  return <><Hero text={scene.narrative_job||"transform"} x={width*.08} y={height*.14} size={recipe.hero_size}/>
    <Box x={width*.10} y={height*.43} w={width*.25} h={120} border={PALETTE.line} style={{opacity:1-p*.7,transform:"scale("+(1-.03*p)+")"}}><span style={{fontSize:32,fontWeight:900}}>BEFORE</span></Box>
    <Arrow x1={width*.39} y1={height*.50} x2={width*.61} y2={height*.50} progress={p} width={5}/>
    <Box x={width*.66} y={height*.39} w={width*.25} h={154} border={PALETTE.purple} style={{transform:"translateY("+((1-p)*30)+"px) scale("+(0.9+0.1*p)+")",boxShadow:"0 0 30px rgba(125,104,255,.28)"}}><span style={{fontSize:36,fontWeight:900,color:PALETTE.purpleLight}}>AFTER</span></Box>
    <Label x={width*.42} y={height*.59} size={22} color={PALETTE.grey}>state change</Label>
  </>;
}
function SequenceShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-8)/30)),labels=recipe.labels||["first","next","result"];
  return <><Hero text={scene.narrative_job||"sequence"} x={width*.08} y={height*.14} size={recipe.hero_size}/>
    {labels.map((label,i)=>{const x=width*(.12+i*.29),q=easeOut(clamp01((frame-i*8)/18));return <React.Fragment key={label}><Box x={x} y={height*.44} w={width*.20} h={110} border={i===2?PALETTE.purple:PALETTE.line} style={{opacity:q,transform:"translateY("+(1-q)*24+"px)"}}><span style={{fontSize:28,fontWeight:900,color:i===2?PALETTE.purpleLight:PALETTE.white}}>{i+1}. {label}</span></Box>{i<2?<Arrow x1={x+width*.20+8} y1={height*.50} x2={x+width*.29-8} y2={height*.50} progress={p}/>:null}</React.Fragment>})}
  </>;
}
function CausalShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-8)/30)),labels=recipe.labels||["cause","mechanism","result"];
  return <><Hero text={scene.narrative_job||"mechanism"} x={width*.08} y={height*.14} size={recipe.hero_size}/>
    {labels.map((label,i)=>{const x=width*(.10+i*.30);return <React.Fragment key={label}><Box x={x} y={height*.44} w={width*.22} h={112} border={i===1?PALETTE.purple:PALETTE.line} style={{opacity:easeOut(clamp01((frame-i*7)/18))}}><span style={{fontSize:28,fontWeight:900,color:i===1?PALETTE.purpleLight:PALETTE.white}}>{label}</span></Box>{i<2?<Arrow x1={x+width*.22+8} y1={height*.50} x2={x+width*.30-8} y2={height*.50} progress={p}/>:null}</React.Fragment>})}
  </>;
}
function EvidenceShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-8)/26));
  return <><Hero text={scene.narrative_job||"evidence"} x={width*.08} y={height*.13} size={recipe.hero_size}/>
    <Box x={width*.38} y={height*.38} w={width*.25} h={130} border={PALETTE.purple} style={{boxShadow:"0 0 26px rgba(125,104,255,.28)",transform:"scale("+(0.94+0.06*p)+")"}}><span style={{fontSize:32,fontWeight:900,color:PALETTE.purpleLight}}>CLAIM</span></Box>
    <Box x={width*.09} y={height*.59} w={width*.25} h={92} border={PALETTE.line}><span style={{fontSize:22,fontWeight:800}}>SOURCE A</span></Box>
    <Box x={width*.66} y={height*.59} w={width*.25} h={92} border={PALETTE.line}><span style={{fontSize:22,fontWeight:800}}>EVIDENCE B</span></Box>
    <Arrow x1={width*.33} y1={height*.63} x2={width*.40} y2={height*.50} progress={p}/>
    <Arrow x1={width*.67} y1={height*.63} x2={width*.61} y2={height*.50} progress={p}/>
  </>;
}
function CodeShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-6)/24));
  return <><Hero text={scene.narrative_job||"code path"} x={width*.08} y={height*.12} size={recipe.hero_size}/>
    <Box x={width*.08} y={height*.38} w={width*.52} h={height*.37} border={PALETTE.line} style={{alignItems:"flex-start",justifyContent:"flex-start",padding:24}}>
      <div style={{fontFamily:"monospace",fontSize:24,lineHeight:1.8,color:PALETTE.white,opacity:p}}>
        <div><span style={{color:PALETTE.purpleLight}}>const</span> input = request;</div>
        <div><span style={{color:PALETTE.purpleLight}}>const</span> result = transform(input);</div>
        <div><span style={{color:PALETTE.purpleLight}}>return</span> verify(result);</div>
      </div>
    </Box>
    <Arrow x1={width*.62} y1={height*.56} x2={width*.76} y2={height*.56} progress={p} width={5}/>
    <Box x={width*.78} y={height*.43} w={width*.16} h={96} border={PALETTE.purple} style={{transform:"scale("+(0.9+0.1*p)+")"}}><span style={{fontSize:24,fontWeight:900,color:PALETTE.purpleLight}}>VERIFIED</span></Box>
  </>;
}
function HookShot({scene,recipe,frame,width,height}){
  const p=easeOut(clamp01((frame-4)/18)),title=(scene.narration?.text||"Explain it").slice(0,34);
  return <><div style={{position:"absolute",left:width*.08,top:height*.20,width:width*.78,fontSize:clamp(width*.06,44,86),lineHeight:1.04,fontWeight:900,color:PALETTE.white,transform:"translateY("+(1-p)*36+"px)"}}>{title}</div>
    <div style={{position:"absolute",left:width*.08,top:height*.56,width:width*.55,height:6,background:"linear-gradient(90deg,"+PALETTE.purple+",transparent)",transform:"scaleX("+p+")",transformOrigin:"0 50%"}}/>
    <Label x={width*.08} y={height*.61} size={24} color={PALETTE.grey}>one dominant idea · one visual action</Label>
  </>;
}
export function SemanticShot({scene,recipe={variant:"generic",hero_size:190}}){
  const frame=useCurrentFrame(),{width,height}=useVideoConfig(),area=safeArea(width,height);
  const duration=Math.max(1,Math.round((scene.duration||4)*30)),variant=recipe.variant||scene.variant||"generic";
  const props={scene,recipe,frame,width,height,area};
  let content;
  if(variant==="network") content=<NetworkShot {...props}/>;
  else if(variant==="split") content=<SplitShot {...props}/>;
  else if(variant==="preference") content=<PreferenceShot {...props}/>;
  else if(variant==="structured") content=<StructuredShot {...props}/>;
  else if(variant==="comparison") content=<ComparisonShot {...props}/>;
  else if(variant==="transformation") content=<TransformationShot {...props}/>;
  else if(variant==="sequence") content=<SequenceShot {...props}/>;
  else if(variant==="causal") content=<CausalShot {...props}/>;
  else if(variant==="evidence") content=<EvidenceShot {...props}/>;
  else if(variant==="code") content=<CodeShot {...props}/>;
  else content=<HookShot {...props}/>;
  return <Fade frame={frame} duration={duration}>{content}</Fade>;
}
