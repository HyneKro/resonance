import {MusicalLayers} from './musical-layers.js';
export const BANDS = [
  {name:'Sub',low:20,high:60,label:'20–60 Hz'},
  {name:'Bass',low:60,high:150,label:'60–150 Hz'},
  {name:'Warmth',low:150,high:400,label:'150–400 Hz'},
  {name:'Body',low:400,high:1000,label:'400 Hz–1 kHz'},
  {name:'Presence',low:1000,high:2500,label:'1–2.5 kHz'},
  {name:'Bite',low:2500,high:6000,label:'2.5–6 kHz'},
  {name:'Brilliance',low:6000,high:12000,label:'6–12 kHz'},
  {name:'Air',low:12000,high:20000,label:'12–20 kHz'}
];
export const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
// Fixed logarithmic frequency windows. A particle keeps the same frequency identity.
export const SPECTRAL_WINDOWS=Array.from({length:48},(_,i)=>{const center=40*400**(i/47),half=400**(1/94);return {center,low:center/half,high:center*half};});
export function bandPower(db,sampleRate,fftSize,low,high){
  const hz=sampleRate/fftSize;let power=0,weight=0;
  for(let i=Math.max(1,Math.floor(low/hz));i<Math.min(db.length,Math.ceil(high/hz)+1);i++){
    const overlap=Math.max(0,Math.min(high,(i+.5)*hz)-Math.max(low,(i-.5)*hz))/hz;
    if(overlap>0){power+=(Number.isFinite(db[i])?10**(db[i]/10):0)*overlap;weight+=overlap;}
  }
  return weight?Math.sqrt(power/weight):0;
}
export function levels(samples){let sum=0,peak=0;for(const x of samples){sum+=x*x;peak=Math.max(peak,Math.abs(x));}const rms=Math.sqrt(sum/Math.max(1,samples.length));return {rms,peak,db:rms>0?20*Math.log10(rms):-100,peakDb:peak>0?20*Math.log10(peak):-100};}
// Time-based smoothing on linear magnitude: fast attacks, calmer steady notes,
// and shorter treble tails. Compression belongs after the envelope, not before.
export function spectralEnvelope(previous,input,dt,lane=0){
 const rise=(input-previous)/Math.max(previous,.0001),halfLife=rise>.45?.008:input>previous?.055:.09-.035*lane;
 return input+(previous-input)*2**(-Math.max(0,dt)/halfLife);
}
export class AudioFeatures {
  constructor(){this.layers=new MusicalLayers();this.harmonic=this.layers.harmonic;this.percussive=this.layers.percussive;this.layerInput=new Float32Array(48);this.bands=new Float32Array(8);this.timbreBands=new Float32Array(8);this.bandDb=new Float32Array(8);this.previous=new Float32Array(8);this.fluxAverage=.004;this.onset=0;this.lastOnset=-1;this.rms=0;this.db=-100;this.peakDb=-100;this.loudness=0;this.accents=new Float32Array(3);this.hits=new Float32Array(3);this.transients=[[45,140,.32],[1400,5200,.17],[6500,15000,.09]].map(([low,high,release])=>({low,high,release,previous:0,floor:.003,last:-1}));}
  update(frequency,wave,sampleRate,fftSize,dt,time,active=true,detail={}){
    dt=clamp(dt,.001,.1);this.hits.fill(0);let flux=0;
    // Long windows resolve neighboring bass notes; short windows locate attacks in time.
    const read=(low,high,transient=false)=>{
      const center=Math.sqrt(low*high),source=(transient?center<500:center<350)?(transient?detail.mid:null):center<4000?detail.mid:detail.fast;
      return active?bandPower(source?.frequency||frequency,sampleRate,source?.fftSize||fftSize,low,high):0;
    };
    if(!this.spectrum){this.spectrum=new Float32Array(48);this.magnitudes=new Float32Array(48);}
    for(let i=0;i<48;i++){const window=SPECTRAL_WINDOWS[i],power=Math.max(0,read(window.low,window.high)-.00003);this.layerInput[i]=clamp(Math.log1p(power*1200)/Math.log(97));this.magnitudes[i]=spectralEnvelope(this.magnitudes[i],power,dt,i/47);this.spectrum[i]=clamp(Math.log1p(this.magnitudes[i]*1200)/Math.log(97));}
    this.layers.update(this.layerInput,dt,active);
    // Independent bass, attack and air envelopes. Sustained notes do not repeatedly trigger.
    this.transients.forEach((b,i)=>{
      const power=read(b.low,b.high,true);
      const value=power>0?clamp((20*Math.log10(power)+85)/65):0;
      const rise=Math.max(0,value-b.previous);b.previous=value;
      b.floor+=(rise-b.floor)*(1-Math.exp(-dt/2));
      this.accents[i]*=Math.exp(-dt/b.release);
      if(active&&rise>Math.max(.012,b.floor*2.5)&&time-b.last>.07){this.hits[i]=clamp(rise*6);this.accents[i]=Math.max(this.accents[i],this.hits[i]);b.last=time;}
    });
    for(let i=0;i<8;i++){
      const p=read(BANDS[i].low,BANDS[i].high);
      this.bandDb[i]=p>0?20*Math.log10(p)+i*3:-160;
      const v=p>0?clamp((20*Math.log10(p)+78)/60):0;
      flux+=Math.max(0,v-this.previous[i])*(i<3?1.4:.7)/8;this.previous[i]=v;
      this.bands[i]+=(v-this.bands[i])*(1-Math.exp(-dt/(v>this.bands[i] ? .018 : .18)));
    }
    // Relative, gently tilted spectral balance keeps colour meaningful at quiet listening levels.
    // These timbre values are separate from the unweighted meters and measured dBFS.
    const strongest=Math.max(...this.bandDb);
    for(let i=0;i<8;i++){const target=active&&strongest>-110?clamp((this.bandDb[i]-strongest+42)/42):0;this.timbreBands[i]+=(target-this.timbreBands[i])*(1-Math.exp(-dt/.3));}
    this.fluxAverage+=(flux-this.fluxAverage)*(1-Math.exp(-dt/1.8));
    if(active&&flux>Math.max(.012,this.fluxAverage*2.2)&&time-this.lastOnset>.18){this.onset=clamp(flux*9,.25,1);this.lastOnset=time;}else this.onset*=Math.exp(-dt/ .24);
    const value=active?levels(wave):{rms:0,db:-100,peakDb:-100};this.rms=value.rms;this.db=value.db;this.peakDb=value.peakDb;
    const target=active?clamp((value.db+60)/54):0;this.loudness+=(target-this.loudness)*(1-Math.exp(-dt/(target>this.loudness?.018:.16)));return this;
  }
}
