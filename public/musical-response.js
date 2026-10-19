import {Inertia} from './inertia.js';
import {sampleProfile} from './song-analysis.js';

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));
const follow=(a,b,dt,t)=>a+(b-a)*(1-Math.exp(-dt/t));
const mix=(a,b,w)=>a+(b-a)*w;

// Require a sustained change on both sides of an upcoming boundary. A single
// loud timeline bin is not a musical build. Only saved analysis can look ahead.
export function phrasePreview(profile,time){
 if(!profile?.timeline?.length||!Number.isFinite(time))return 0;
 let best=0;
 for(let ahead=.5;ahead<=4;ahead+=.5){
  const edge=time+ahead,hold=Math.max(2.5,(profile.step||1)*2);if(edge+hold>profile.duration)continue;
  const before=[2,1.5,1,.5].map(d=>sampleProfile(profile,Math.max(0,edge-d)).energy);
  const after=[.25,.75,1.25,1.75].map(d=>sampleProfile(profile,edge+d).energy);
  const low=before.reduce((s,x)=>s+x,0)/4,high=after.reduce((s,x)=>s+x,0)/4;
  const support=after.filter(x=>x>low+.16).length;
  if(support<3||high-low<.20||sampleProfile(profile,edge+hold).energy<low+.16)continue;
  // Several quieter observations prevent a rise already in progress from being
  // repeatedly anticipated. The cue finishes as the actual sound arrives.
  if(before.filter(x=>x<high-.16).length<3)continue;
  best=Math.max(best,clamp((high-low-.16)*2)*clamp((4.5-ahead)/3)*clamp(ahead/.8));
 }
 return best;
}

// A visual-only refinement of the approved conductor. The original analyzer,
// clock, geometry, audio graph and Classic response remain intact.
export class MusicalResponse{
 constructor(){
  this.blend=new Inertia(0,.7);this.tension=new Inertia(0,1.1);this.breath=new Inertia(0,1.8);
  this.note=new Float32Array(48);this.noteMean=new Float32Array(48);this.noteDeviation=new Float32Array(48);
  this.percussionFloor=new Float32Array(48);this.percussionGain=new Float32Array(48).fill(1);
  this.harmonic=new Float32Array(48);this.percussive=new Float32Array(48);this.morph=new Float32Array(4);
  this.transients=new Float32Array(3);this.bandMean=new Float32Array(8);this.cloudBands=new Float32Array(8);
  this.roleValues={bass:0,drums:0,shimmer:0,lead:0,texture:0};this.roleOutput={...this.roleValues};
  this.output=null;this.resetEvidence();
 }
 resetEvidence(){
  // Forget the old evidence after a seek/source switch, retaining the rendered
  // envelopes so that the sculpture never collapses and grows back from zero.
  this.warm=0;this.level=null;this.baseline=null;this.arrival=0;this.cooldown=3;
  this.rate=0;this.preview=0;this.previewAt=0;this.lastTime=null;this.profile=null;this.seed=true;
 }
 update(base,raw,dt,{style='musical',active=true,frozen=false,reduced=false,dynamic=true,profile=null,time=0,roles={}}={}){
  if(frozen&&this.output)return this.output;
  dt=clamp(dt,0,.1);
  if(active&&!this.wasActive)this.resetEvidence();this.wasActive=active;
  const audible=active&&raw.db>-88,enabled=style!=='classic'&&!reduced;
  const weight=this.blend.update(enabled?1:0,dt),w=weight<.0001?0:weight>.9999?1:weight;
  // A seek is not a crescendo. Detect it here too for native playback events
  // and discard predictions from a profile that was replaced asynchronously.
  if(this.lastTime!==null&&Math.abs(time-this.lastTime)>1.2)this.resetEvidence();
  if(this.profile!==profile){this.profile=profile;this.preview=0;this.previewAt=0;this.cooldown=Math.max(this.cooldown,1.5);}
  this.lastTime=time;this.cooldown=Math.max(0,this.cooldown-dt);
  const hits=raw.hits||[],strike=Math.max(hits[0]||0,hits[1]||0,hits[2]||0);
  this.rate=this.rate*Math.exp(-dt/1.4)+(audible&&strike>.12?1/1.4:0);
  this.arrival*=Math.exp(-dt/1.6);
  let broadRise=0;
  const level=audible?clamp((raw.db+65)/55):0;
  if(this.seed){
   this.level=this.baseline=level;
   for(let i=0;i<48;i++){this.note[i]=base.harmonic?.[i]||0;this.noteMean[i]=raw.harmonic?.[i]||0;this.percussionFloor[i]=raw.percussive?.[i]||0;this.noteDeviation[i]=0;}
   for(let i=0;i<8;i++)this.bandMean[i]=raw.bands?.[i]||0;
   this.seed=!audible;
  }
  this.level=follow(this.level,level,dt,.28);
  this.baseline=follow(this.baseline,level,dt,6);
  for(let i=0;i<8;i++){
   const band=audible?clamp(raw.bands?.[i]):0;
   if(band-this.bandMean[i]>.09)broadRise++;
   this.bandMean[i]=follow(this.bandMean[i],band,dt,3);
  }
  this.warm=active?this.warm+dt:0;
  const contrast=this.level-this.baseline;
  // An arrival needs a real low-frequency attack plus a broader energy lift,
  // not the predicted metronome or an isolated high note. Never trigger on start.
  if(audible&&this.warm>2.5&&!this.cooldown&&contrast>.10&&broadRise>=3&&(hits[0]||0)>.18){
   this.arrival=clamp(contrast*3);this.cooldown=3;
  }
  this.previewAt-=dt;
  if(this.previewAt<=0){this.previewAt=.1;this.preview=audible&&dynamic&&this.warm>1.5&&!this.cooldown?phrasePreview(profile,time):0;}
  const tension=this.tension.update(audible&&dynamic?this.preview:0,dt);
  const breath=this.breath.update(audible&&dynamic?clamp(contrast*2,-.3,.4):0,dt);
  const crowded=clamp((this.rate-3)/7);
  for(let i=0;i<48;i++){
   const h=audible?clamp(raw.harmonic?.[i]):0,p=audible?clamp(raw.percussive?.[i]):0;
   this.noteMean[i]=follow(this.noteMean[i],h,dt,.35);
   this.noteDeviation[i]=follow(this.noteDeviation[i],Math.abs(h-this.noteMean[i]),dt,.6);
   const original=base.harmonic?.[i]||0,delta=original-this.note[i];
   const tolerance=Math.min(.035,.006+this.noteDeviation[i]*.4);
   const settled=strike<.1&&Math.abs(delta)<tolerance;
   const target=audible?(settled?this.note[i]+delta*.12:original):0;
   this.note[i]=follow(this.note[i],target,dt,target>this.note[i]?.045:.13);
   const novelty=clamp((p-this.percussionFloor[i]*.8)*5);
   // A continuous broad texture no longer lights every percussion lane at full
   // strength. Fresh attacks retain their original detail and timing.
   const gain=audible?.38+.62*Math.max(novelty,strike):1;
   this.percussionGain[i]=follow(this.percussionGain[i],gain,dt,gain>this.percussionGain[i]?.018:.22);
   this.percussionFloor[i]=follow(this.percussionFloor[i],p,dt,1.8);
   this.harmonic[i]=mix(original,this.note[i],w);
   this.percussive[i]=mix(base.percussive?.[i]||0,(base.percussive?.[i]||0)*this.percussionGain[i],w);
  }
  for(let i=0;i<3;i++)this.transients[i]=(base.transients?.[i]||0)*(1-w*crowded*(i===0?.06:i===1?.18:.32));
  for(const key of Object.keys(this.roleValues)){
   const original=roles[key]||0,tau=key==='lead'?.16:key==='texture'?.40:0;
   // Preserve the established timing of bass and drum roles. Only continuous
   // lead/texture movement needs another envelope; attacks must not lag behind.
   this.roleValues[key]=tau?follow(this.roleValues[key],original,dt,tau):original;
   this.roleOutput[key]=mix(original,this.roleValues[key],w);
  }
  const gesture=dynamic&&!reduced?w:0,opening=gesture*(breath*.07-tension*.035+this.arrival*.025);
  for(let i=0;i<4;i++)this.morph[i]=clamp((base.morph?.[i]||0)+(i===0?opening:0));
  const atmosphere=base.atmosphere||{bands:base.bands,accents:base.accents,loudness:base.loudness};
  for(let i=0;i<8;i++)this.cloudBands[i]=clamp(atmosphere.bands[i]*(1+gesture*breath*.08));
  const features=w?{...base,harmonic:this.harmonic,percussive:this.percussive,transients:this.transients,morph:this.morph,
   atmosphere:{...atmosphere,bands:this.cloudBands,loudness:clamp(atmosphere.loudness*(1+gesture*breath*.12))}}:base;
  this.output={features,roles:w?this.roleOutput:roles,weight:w,tension:gesture*tension,arrival:gesture*this.arrival,breath:gesture*breath};
  return this.output;
 }
}
