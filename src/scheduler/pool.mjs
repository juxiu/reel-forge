export async function runParallel(items,worker,{concurrency=3}={}){
  const results=new Array(items.length),errors=[];
  let next=0;
  async function loop(){while(true){const i=next++;if(i>=items.length)return;try{results[i]=await worker(items[i],i)}catch(error){errors.push({index:i,error:String(error?.message||error)})}}}
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},loop));
  return{results,errors};
}