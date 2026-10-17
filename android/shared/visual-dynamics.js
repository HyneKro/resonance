import { clamp } from './analysis.js';
const approach=(from,to,dt,seconds)=>from+(to-from)*(1-Math.exp(-dt/seconds));
function rgb(h,s=.72,l=.58){return [0,8,4].map(n=>{const k=(n+h/30)%12;return l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1));});}

// Three time scales: transients for accents, timbre for shape, and phrases for colour.
// There is no wall-clock colour cycle: a sustained sound settles into its own palette.
export class VisualDynamics {
  constructor(){this.brightness=.35;this.warmth=.5;this.texture=.4;this.energy=.3;this.slowEnergy=.3;this.bloom=0;this.motion=0;this.hue=268;this.output=this.frame(false);}
  frame(dynamic){
    const hue=dynamic?this.hue:268,shape=dynamic?this.brightness:.35,spread=dynamic?this.texture:.4,flow=dynamic?this.warmth:.5;
    return {dynamic,hue,shape,spread,flow,bloom:dynamic?this.bloom:0,motion:this.motion,
      colors:[rgb(hue),rgb((hue+62+flow*54)%360,.75,.55),rgb((hue+190-shape*70)%360,.65,.7)],
      label:!dynamic?'Steady palette & geometry':this.energy<.12?'Quiet · suspended':this.brightness>.56?'Airy · prismatic':this.warmth>.64?'Low-end · expansive':this.texture>.62?'Textured · flowing':'Balanced · fluid'};
  }
  update(features,dt,{active=true,dynamic=true,reduced=false,frozen=false}={}){
    if(frozen)return this.output;
    dt=clamp(dt,0,.1);const b=features.timbreBands||features.bands,total=b.reduce((s,x)=>s+x*x,0);
    if(active&&features.db>-75&&total>.002){
      let centroid=0,mean=0;for(let i=0;i<8;i++){centroid+=b[i]*b[i]*i/7;mean+=b[i]/8;}
      const warmth=(b[0]+b[1]+b[2])/(b[0]+b[1]+b[2]+b[4]+b[5]+b[6]+.001);
      const variance=b.reduce((s,x)=>s+(x-mean)**2,0)/8;
      const texture=clamp(1-Math.sqrt(variance)/(mean+.03));
      this.brightness=approach(this.brightness,centroid/total,dt,1.2);
      this.warmth=approach(this.warmth,warmth,dt,1.8);
      this.texture=approach(this.texture,texture,dt,2.8);
      this.energy=approach(this.energy,features.loudness,dt,.6);
      this.slowEnergy=approach(this.slowEnergy,features.loudness,dt,7);
      this.bloom=approach(this.bloom,clamp(.5+(this.energy-this.slowEnergy)*2),dt,1.5);
      // Dark bass moves toward violet/ember; bright material toward cyan/gold.
      const target=225+this.warmth*100-this.brightness*155+this.texture*35;
      if(!reduced)this.hue=approach(this.hue,target,dt,3.2);
    }
    if(active&&!reduced)this.motion+=dt*(dynamic?.28+this.energy*.6+this.brightness*.45: .65);
    this.output=this.frame(dynamic&&!reduced);return this.output;
  }
}
