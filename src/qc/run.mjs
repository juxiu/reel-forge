import{probeMedia,motionScore}from "./media.mjs";
export async function runMediaQc(file,{minMotionFrames=2}={}){
 const probe=await probeMedia(file);const motion=await motionScore(file);
 const duration=Number(probe.format?.duration||0);const streams=probe.streams||[];
 const video=streams.find(x=>x.codec_type==="video");const audio=streams.find(x=>x.codec_type==="audio");
 const issues=[];
 if(!(duration>0))issues.push({type:"invalid_duration"});
 if(!video)issues.push({type:"missing_video"});
 if(!audio)issues.push({type:"missing_audio"});
 if(video&&(!video.width||!video.height))issues.push({type:"invalid_dimensions"});
 if(motion<minMotionFrames)issues.push({type:"motion_too_low"});
 return{status:issues.length?"FAIL":"PASS",issues,probe,motion_frames:motion};
}