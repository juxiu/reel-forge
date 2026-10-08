import{runParallel}from "../scheduler/pool.mjs";
export async function buildScenes(scenes,builder,{concurrency=4}={}){const result=await runParallel(scenes,async scene=>builder(scene),{concurrency});if(result.errors.length)throw new Error(JSON.stringify(result.errors));return result.results;}
