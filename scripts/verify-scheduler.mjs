import{runParallel}from "../src/scheduler/pool.mjs";
const items=[1,2,3,4];const r=await runParallel(items,async x=>x*2,{concurrency:2});if(r.errors.length||r.results.join(",")!=="2,4,6,8")throw new Error("parallel scheduler failed");
const bad=await runParallel(items,async x=>{if(x===3)throw new Error("boom");return x},{concurrency:3});if(bad.errors.length!==1||bad.errors[0].index!==2)throw new Error("failure isolation failed");
console.log("scheduler PASS");
