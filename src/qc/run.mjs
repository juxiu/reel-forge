import{probeMedia,mediaSignals}from "./media.mjs";
export async function runMediaQc(file,{minMotionFrames=2,maxBlackSegments=0}={}){
 const probe=await probeMedia(file),signals=await mediaSignals(file),duration=Number(probe.format?.duration||0),streams=probe.streams||[],video=streams.find(x=>x.codec_type==="video"),audio=streams.find(x=>x.codec_type==="audio"),issues=[];
 if(!(duration>0))issues.push({type:"invalid_duration"});
 if(!video)issues.push({type:"missing_video"});
 if(!audio)issues.push({type:"missing_audio"});
 if(video&&(!video.width||!video.height))issues.push({type:"invalid_dimensions"});
 if(signals.motion_frames<minMotionFrames)issues.push({type:"motion_too_low"});
 if(signals.black_segments>maxBlackSegments)issues.push({type:"black_frame"});
 return{status:issues.length?"FAIL":"PASS",issues,probe,...signals};
}