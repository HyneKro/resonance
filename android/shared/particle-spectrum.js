// Probability mass across the real 48 frequency windows. Squaring emphasizes audible peaks;
// a small floor prevents noise or silence from inventing a colorful trigger.
export function birthDistribution(spectrum,cdf=new Float32Array(48)){
  let total=0;
  for(let i=0;i<48;i++){const level=Math.max(0,Math.min(1,Number(spectrum?.[i])||0)-.06);total+=level*level;cdf[i]=total;}
  if(total>0)for(let i=0;i<48;i++)cdf[i]/=total;
  return {cdf,total};
}
