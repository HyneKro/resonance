import {SPECTRAL_WINDOWS} from './analysis.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const ROLE_DEFAULTS={bass:{label:'Bass / kick',low:35,high:240,gain:1},drums:{label:'Drum attacks',low:120,high:6000,gain:1},shimmer:{label:'Bright percussion',low:5000,high:16000,gain:1},lead:{label:'Voice / lead',low:180,high:3600,gain:1},texture:{label:'Sustained textures',low:250,high:12000,gain:1}};
export function sanitizeRoles(input={}){return Object.fromEntries(Object.entries(ROLE_DEFAULTS).map(([key,d])=>{const p=input?.[key]||{},low=Number.isFinite(p.low)?clamp(p.low,20,15000):d.low,high=Number.isFinite(p.high)?clamp(p.high,low+20,20000):Math.max(low+20,d.high);return [key,{low,high,gain:Number.isFinite(p.gain)?clamp(p.gain,0,3):d.gain}];}));}
// Frequency and envelope estimates, not source separation or instrument classification.
export class SoundRoles{
 constructor(){this.config=sanitizeRoles();this.output={bass:0,drums:0,shimmer:0,lead:0,texture:0};this.previous={};}
 update(features,dt,{active=true,frozen=false,response=2.5}={}){
  if(frozen)return this.output;dt=clamp(dt,0,.1);
  for(const [key,{low,high,gain}]of Object.entries(this.config)){
   let sum=0,count=0,peak=0;for(let i=0;i<48;i++){const w=SPECTRAL_WINDOWS[i],overlap=Math.max(0,Math.min(high,w.high)-Math.max(low,w.low))/(w.high-w.low);if(overlap){const v=features.spectrum?.[i]||0;sum+=v*v*overlap;count+=overlap;peak=Math.max(peak,v);}}
   const energy=count?Math.sqrt(sum/count):0,attack=Math.max(0,energy-(this.previous[key]||0));this.previous[key]=energy;
   let target=energy;
   if(key==='drums')target=energy*Math.min(1,(features.accents?.[1]||0)*1.5+(features.accents?.[0]||0)+attack*8);
   if(key==='lead')target=energy*(.5+.5*clamp((peak-energy)*4));
   if(key==='texture')target=energy*(1-clamp(attack*8)*.7);
   target=active?clamp(target*gain):0;
   const tau=(target>this.output[key]?(key==='texture'?.5:.08):(key==='texture'?.8:.3))/Math.sqrt(clamp(response,.25,8));
   this.output[key]+=(target-this.output[key])*(1-Math.exp(-dt/tau));
  }return this.output;
 }
}
