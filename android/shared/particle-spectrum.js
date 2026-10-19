import {spectrumNumber} from './spectrum-settings.js';
// Probability mass across the real 48 frequency windows. Squaring emphasizes audible peaks;
// a small floor prevents noise or silence from inventing a colorful trigger.
export function birthDistribution(spectrum,cdf=new Float32Array(48)){
  let total=0;
  for(let i=0;i<48;i++){const level=Math.max(0,Math.min(1,Number(spectrum?.[i])||0)-.06);total+=level*level;cdf[i]=total;}
  if(total>0)for(let i=0;i<48;i++)cdf[i]/=total;
  return {cdf,total};
}

// Light only: fixed log-frequency windows, without per-frame normalization.
// Consume the delayed analyzer (not the early input or adaptive scene energy),
// so quiet/noisy recordings cannot illuminate the whole ribbon at full power.
export class RibbonSpectrum {
  constructor(){this.levels=new Float32Array(48);}
  update(features,dt,{active=true,frozen=false,reduced=false,intensity=.75,contrast=2}={}){
    if(frozen)return this.levels;
    dt=Math.max(0,Math.min(.1,Number(dt)||0));
    intensity=spectrumNumber('spectrumIntensity',intensity);
    contrast=spectrumNumber('spectrumContrast',contrast);
    const db=Number.isFinite(features?.db)?features.db:-100;
    const gate=active?Math.max(0,Math.min(1,(db+88)/20)):0;
    for(let i=0;i<48;i++){
      const input=Number(features?.spectrum?.[i]);
      const level=Number.isFinite(input)?Math.max(0,Math.min(1,(input-.04)/.96)):0;
      const target=intensity*gate*Math.pow(level,1/contrast),previous=this.levels[i];
      const seconds=reduced?.28:target>previous?.022:gate>0?.105:.07;
      const next=target+(previous-target)*Math.exp(-dt/seconds);
      this.levels[i]=next<.0001?0:next;
    }
    return this.levels;
  }
}
