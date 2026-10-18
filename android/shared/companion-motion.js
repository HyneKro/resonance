import {SONA_CLIPS} from './companion-atlas.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
export const SONA_ROUTINES=['two-step','side-sway','head-bob','hand-wave','shoulder-groove','cheer','soft-bounce','twirl'];
const lift=[0,0,0,6,12,6,0,0];
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const total=times=>times.reduce((a,b)=>a+b,0);
export const SONA_TIMING=Object.freeze({
 idle:[4.1,.18,.12,1/12,1/12,1/12,.14,.18],
 sleep:Array(8).fill(.5),
 clicked:[1/12,1/12,.12,1/12,.16,1/12,.12,.17],
 pickup:[1/12,.1,7/60,.1],
 held:[.35,.45,.35,.45,.4],
 drop:[1/12,1/12,1/12,1/12,1/12,.12,.16,61/300],
});
export function sequenceFrame(seconds,times,frames=null,loop=true){
 const duration=total(times);let t=loop?((seconds%duration)+duration)%duration:clamp(seconds,0,duration);
 for(let index=0;index<times.length;index++){
  if(t<times[index]-1e-9||index===times.length-1)return {frame:frames?.[index]??index,index,progress:clamp(t/times[index])};
  t-=times[index];
 }
}
export function clipDurations(clip,bpm){
 const duration=clip.beats*60/clamp(bpm,55,180),minimum=1/12,remaining=Math.max(0,duration-8*minimum),weights=clip.weights||Array(8).fill(1),weight=total(weights);
 const times=weights.map(w=>minimum+remaining*w/weight);
 // Joyful eye-closes belong to one accent, never half a slow dance cycle.
 for(const index of clip.eyeClose||[]){const excess=Math.max(0,times[index]-.15);times[index]=Math.min(times[index],.15);times[(index+1)%8]+=excess;}
 return times;
}
export function danceFrame(clip,beats,bpm){
 const phase=((beats%clip.beats)+clip.beats)%clip.beats;
 return sequenceFrame(phase*60/clamp(bpm,55,180),clipDurations(clip,bpm),clip.frames);
}
export const REST_POSE=Object.freeze({x:0,y:0,rotation:0,scaleX:1,scaleY:1,sleep:0,spark:0});
export const SONA_PACE=100;
export const SPRITE_FPS=12;
export const COMPANION_FPS=24;

// Keep the illustrated poses intact. Routine changes switch directly without
// an extra transition effect, crossfade or skeletal deformation.
export class DanceMotion{
 constructor(){this.bpm=SONA_PACE;this.beats=0;this.clock=0;this.stateTime=0;this.quiet=0;this.action='';this.elapsed=0;this.hover=false;this.dragLean=0;this.dragTarget=0;this.releaseRotation=0;this.lastPose=REST_POSE;this.state='idle';this.name='idle';this.group='';this.routineIndex=0;this.routineStart=0;this.routineState='dancing';}
 press(){this.action='pressed';this.elapsed=0;this.quiet=0;}
 click(){this.action='clicked';this.elapsed=0;this.quiet=0;}
 pickUp(){this.action='pickup';this.elapsed=0;this.quiet=0;}
 move(dx){this.dragTarget=clamp(dx/24,-1,1);}
 drop(){this.action='drop';this.elapsed=0;this.releaseRotation=this.lastPose.rotation;this.dragTarget=0;}
 cancel(){this.action='';this.elapsed=0;this.dragLean=0;this.dragTarget=0;this.quiet=0;}
 resume(){this.cancel();}
 look(_x,_y,hover=false){this.hover=hover;if(hover)this.quiet=0;}
 update(dt,{active=false,reduced=false,frozen=false,mode}={}){
  dt=clamp(dt,0,.1);this.elapsed+=dt;
  if(this.action==='pickup'&&this.elapsed>=total(SONA_TIMING.pickup)){this.elapsed-=total(SONA_TIMING.pickup);this.action='held';}
  if(this.action==='drop'&&this.elapsed>=total(SONA_TIMING.drop)||this.action==='clicked'&&this.elapsed>=total(SONA_TIMING.clicked)){
   this.action='';this.elapsed=0;
   // Resume from the beginning of the current phrase after a greeting/landing,
   // rather than cutting from neutral into an arbitrary raised-arm pose.
   this.beats=Math.floor(this.beats/16)*16;this.routineStart=this.beats;
  }
  const moving=!reduced&&!frozen;
  // Authored frame timing stays constant, independent of tempo and loudness.
  this.bpm=SONA_PACE;
  if(moving){this.clock+=dt;if(active&&!this.action)this.beats+=dt*SONA_PACE/60;}
  this.quiet=active||this.action||this.hover?0:this.quiet+dt;
  this.dragLean+=(this.dragTarget-this.dragLean)*(1-Math.exp(-dt*10));this.dragTarget*=Math.exp(-dt*3);
  if(this.beats<this.routineStart)this.routineStart=this.beats;
  let boundary=false;
  if(active&&!this.action&&!mode){const clip=SONA_CLIPS[this.routineState==='listening'?'head-bob':SONA_ROUTINES[this.routineIndex]],span=clip.beats*3;if(this.beats-this.routineStart>=span){this.routineStart+=span;this.routineIndex=(this.routineIndex+1)%SONA_ROUTINES.length;boundary=true;}}
  const phrase=mode?Math.floor(this.beats/16)%SONA_ROUTINES.length:this.routineIndex;
  const musicState=phrase===2?'listening':'dancing';
  if(boundary||this.beats===0)this.routineState=musicState;
  this.state=this.action||(mode||(active?this.routineState:this.quiet>35?'sleep':'idle'));
  const music=this.state.startsWith('dancing')||this.state==='listening';this.name=this.state==='listening'?'head-bob':music?SONA_ROUTINES[phrase]:this.state;
  const group=this.action||(music?(this.state==='listening'?'listening':this.name):this.state),changed=group!==this.group;
  if(changed){this.group=group;this.stateTime=0;}else if(moving)this.stateTime+=dt;
  const pose={...REST_POSE},t=this.clock;let row=SONA_CLIPS.idle.row,frame=sequenceFrame(this.stateTime,SONA_TIMING.idle).frame;
  if(music){
   // Small sways/waves linger; larger pose changes use a quicker two-beat
   // cycle so the turn and alternating cheer do not crawl through eight poses.
   const clip=SONA_CLIPS[this.name],sample=danceFrame(clip,mode?this.beats:this.beats-this.routineStart,this.bpm);
   row=clip.row;frame=sample.frame;
   if(this.name==='soft-bounce')pose.y-=lift[sample.index]+(lift[(sample.index+1)%8]-lift[sample.index])*smooth(sample.progress);
  }else{pose.y=Math.sin(t*2)*.35;pose.rotation=Math.sin(t*.8)*.012;}
  if(this.state==='sleep'){row=8;frame=sequenceFrame(this.stateTime,SONA_TIMING.sleep).frame;pose.rotation=0;pose.sleep=1;pose.y=Math.sin(t*1.6)*.25;}
  if(this.state==='pressed'){row=12;frame=0;}
  if(this.state==='clicked'){row=9;frame=sequenceFrame(this.elapsed,SONA_TIMING.clicked,null,false).frame;pose.spark=Math.sin(Math.PI*clamp(this.elapsed/total(SONA_TIMING.clicked)));}
  if(this.state==='pickup'){
   row=10;frame=sequenceFrame(this.elapsed,SONA_TIMING.pickup,null,false).frame;
   pose.y=-5*smooth(this.elapsed/.4);pose.rotation=this.dragLean*.04;pose.pivotY=36;
  }
  if(this.state==='held'){row=10;frame=sequenceFrame(this.elapsed,SONA_TIMING.held,[3,4,5,6,7]).frame;pose.y=-5+Math.sin(t*2.4)*.35;pose.rotation=this.dragLean*.075+Math.sin(t*2.4)*.012;pose.pivotY=36;}
  if(this.state==='drop'){
   row=11;frame=sequenceFrame(this.elapsed,SONA_TIMING.drop,null,false).frame;
   // Landing is expressed by the drawn poses, keeping sprite proportions intact.
   pose.y=-5*(1-smooth(this.elapsed/(1/6)));pose.rotation=this.releaseRotation*(1-smooth(this.elapsed/.3));
  }
  if(!moving){frame=this.state==='held'?3:0;Object.assign(pose,REST_POSE,{sleep:this.state==='sleep'?1:0});}
  this.lastPose=pose;return {state:this.state,name:this.name,bpm:this.bpm,beats:this.beats,time:this.clock,row,frame,pose};
 }
}

// 24 redraws per second keep carrying and breathing smooth without spending a
// display-rate canvas pass. Illustrated poses advance at most 12 times a second.
export class CompanionClock{
 constructor(){this.reset();}
 reset(){this.last=null;this.paint=null;}
 step(now){
  const interval=1000/COMPANION_FPS;
  if(this.last===null){this.last=now;this.paint=now+interval;return 0;}
  if(now+.5<this.paint)return null;
  // Present every authored pose instead of racing through the missed time
  // after a busy graphics frame. Normal playback advances at exactly 24 Hz.
  const dt=interval/1000;this.last=now;
  this.paint+=Math.max(1,Math.floor((now+.5-this.paint)/interval)+1)*interval;return dt;
 }
}

// Dance/idle follows actual playback, with latency applied only to its edges.
// A temporary analysis gap or a new device estimate cannot interrupt a loop.
export class CompanionPlayback{
 constructor(){this.active=false;this.target=false;this.due=Infinity;}
 update(playing,delayMs,now){
  playing=!!playing;
  if(playing!==this.target){this.target=playing;this.due=now+clamp(delayMs,0,2000);}
  if(now>=this.due){this.active=this.target;this.due=Infinity;}
  return this.active;
 }
}
