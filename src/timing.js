export const TIMING_BINS=11;
export const TIMING_LIMIT=135;
export function timingSummary(errors=[]){
  const values=errors.filter(Number.isFinite).sort((a,b)=>a-b),histogram=Array(TIMING_BINS).fill(0),total=values.length;
  let early=0,late=0,center=0;
  for(const ms of values){
    if(ms< -12)early++;else if(ms>12)late++;else center++;
    const bin=Math.max(0,Math.min(TIMING_BINS-1,Math.floor((ms+TIMING_LIMIT)/(TIMING_LIMIT*2)*TIMING_BINS)));
    histogram[bin]++;
  }
  const mean=total?values.reduce((a,b)=>a+b,0)/total:0;
  const median=total?(values[Math.floor((total-1)/2)]+values[Math.floor(total/2)])/2:0;
  return {total,early,late,center,mean,median,histogram};
}
