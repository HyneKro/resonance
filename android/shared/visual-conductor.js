import { clamp } from './analysis.js';
import { Inertia } from './inertia.js';

const follow=(a,b,dt,t)=>a+(b-a)*(1-Math.exp(-dt/t));

// Visual-only gain and musical direction. Meter readings and the actual audio are untouched.
export class VisualConductor {
  constructor(){
    this.bands=new Float32Array(8);this.accents=new Float32Array(3);
    this.harmonic=new Float32Array(48);this.percussive=new Float32Array(48);this.spectrum=new Float32Array(48);this.spectralMotion=Array.from({length:48},()=>new Inertia(0,.065));
    this.bandMotion=Array.from({length:8},(_,i)=>new Inertia(0,i<2?.65:.42));
    this.accentMotion=[new Inertia(0,.46),new Inertia(0,.30),new Inertia(0,.22)];this.envelopes=new Float32Array(3);
    this.energyMotion=new Inertia(0,.38);this.speed=new Inertia(.65,1.2);
    this.cloudMotion=Array.from({length:12},()=>new Inertia(0,.65));this.cloud=new Float32Array(12);
    this.morph=new Float32Array([.24,.32,.2,.18]);this.morphMotion=Array.from(this.morph,x=>new Inertia(x,1.7));
    this.springs=[...this.spectralMotion,...this.bandMotion,...this.accentMotion,this.energyMotion,...this.cloudMotion,...this.morphMotion];
    this.springs.forEach(s=>s.baseSeconds=s.seconds);this.response=new Inertia(1,.4);
    this.energy=0;this.floor=-65;this.ceiling=-35;this.clock=0;this.lastBeat=-1;this.previousKick=0;this.beat=0;
    this.transients=new Float32Array(3);this.output=this.frame();
  }
  frame(){
    return {transients:this.transients,bands:this.bands,spectrum:this.spectrum,harmonic:this.harmonic,percussive:this.percussive,accents:this.accents,loudness:this.energy,onset:Math.max(...this.accents),motion:this.clock,beat:this.beat,
      atmosphere:{bands:this.cloud.slice(0,8),accents:this.cloud.slice(8,11),loudness:this.cloud[11]},
      morph:this.morph,flow:.18+this.energy*.20,label:'Living sculpture + Aether'};
  }
  update(features,dt,{active=true,evolve=true,frozen=false,reduced=false,responsiveness=1,movement=1}={}){
    if(frozen)return this.output;
    dt=clamp(dt,0,.1);const audible=active&&features.db>-88;
    const response=this.response.update(clamp(responsiveness,.25,8),dt);
    this.springs.forEach(s=>s.seconds=s.baseSeconds/response);
    // Timbre reshapes mass more slowly than spectral light, even at high Response.
    this.morphMotion.forEach(s=>s.seconds=Math.max(1.8,s.baseSeconds/response));
    if(audible){
      this.ceiling=Math.max(features.db,follow(this.ceiling,features.db,dt,12));
      this.floor=follow(this.floor,features.db-14,dt,5);
    }
    const energy=audible?clamp((features.db-this.floor)/Math.max(16,this.ceiling-this.floor)) : 0;
    this.energy=clamp(this.energyMotion.update(energy,dt));
    for(let i=0;i<48;i++)this.spectrum[i]=clamp(this.spectralMotion[i].update(audible?(features.spectrum?.[i]||0):0,dt));
    // Notes keep their own envelopes, but don't shake the entire sculpture at
    // FFT-frame speed. Fast attack preserves articulation; a longer release
    // connects adjacent observations of the same note without flicker.
    const layerSpeed=Math.min(1.8,Math.sqrt(response));
    for(let i=0;i<48;i++){
      const h=audible?clamp((features.harmonic?.[i]||0)-.025)/.975:0;
      const p=audible?clamp((features.percussive?.[i]||0)-.055)/.945:0;
      this.harmonic[i]=follow(this.harmonic[i],h,dt,(h>this.harmonic[i]?.10:.24)/layerSpeed);
      this.percussive[i]=follow(this.percussive[i],p,dt,(p>this.percussive[i]?.045:.20)/layerSpeed);
    }
    const spectrum=features.timbreBands||features.bands;
    for(let i=0;i<8;i++){
      const target=audible?clamp(features.bands[i]*1.25+spectrum[i]*.32)*(.3+this.energy*.7):0;
      this.bands[i]=clamp(this.bandMotion[i].update(target,dt));
    }
    for(let i=0;i<3;i++){
      const input=audible?clamp((features.accents?.[i]||0)*2.8):0;
      // Light reacts immediately; the mass keeps its continuous position and velocity.
      const flash=audible?clamp((features.accents?.[i]||0)*1.5):0;this.transients[i]=follow(this.transients[i],flash,dt,(flash>this.transients[i]?.012:.10)/response);
      this.envelopes[i]=Math.max(input,this.envelopes[i]*Math.exp(-dt*response/[.38,.22,.15][i]));
      this.accents[i]=clamp(this.accentMotion[i].update(this.envelopes[i],dt));
    }
    const kick=this.envelopes[0];
    const cloudTargets=[...this.bands,...this.accents,this.energy];
    this.cloudMotion.forEach((spring,i)=>this.cloud[i]=clamp(spring.update(cloudTargets[i],dt)));
    const beat=audible&&kick>.30&&kick>this.previousKick+.08&&this.clock-this.lastBeat>.20;
    if(beat){this.lastBeat=this.clock;this.beat++;}this.previousKick=kick;
    if(!reduced){
      this.clock+=dt*this.speed.update((audible?.48+this.energy*.57:.16)*clamp(movement,.25,3.5),dt);
      if(evolve&&audible){
        // One surface, four continuous dimensions: opening, torsion, pleats and lace.
        const b=this.bands,total=b.reduce((sum,x)=>sum+x*x,0)+.01;
        const low=(b[0]*b[0]+b[1]*b[1])/total,body=(b[2]*b[2]+b[3]*b[3]+b[4]*b[4])/total,air=(b[5]*b[5]+b[6]*b[6]+b[7]*b[7])/total;
        const target=[.2+low*.72+this.energy*.08,.2+body*.7,.15+air*.65+this.energy*.12,.12+air*.75+body*.12];
        this.morphMotion.forEach((spring,i)=>this.morph[i]=clamp(spring.update(target[i],dt)));
      }
    }
    this.output=this.frame();return this.output;
  }
}
