// Delay only visual measurements. The audio graph, samples and playback clock
// are untouched. Device latency is an estimate, not a Bluetooth calibration.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const visualSyncOffset=(value,desktop=false)=>Number.isFinite(value)?clamp(Math.round(value),desktop?0:-1000,1000):0;
export function visualSyncDevices(value={}){
 return Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([id,p])=>/^[a-f0-9]{24}$/.test(id)&&p&&typeof p==='object').slice(-64).map(([id,p])=>[id,{mode:['auto','bluetooth','direct'].includes(p.mode)?p.mode:'auto',offsetMs:visualSyncOffset(p.offsetMs)}]));
}
export function visualSyncPreferences(saved={}){
 return {visualSyncDevices:visualSyncDevices(saved.visualSyncDevices),visualSyncAuto:typeof saved.visualSyncAuto==='boolean'?saved.visualSyncAuto:true,visualSyncOffsetMs:visualSyncOffset(saved.visualSyncOffsetMs),desktopVisualSyncOffsetMs:visualSyncOffset(saved.desktopVisualSyncOffsetMs,true)};
}
export function resolveVisualSync(context,prefs={},desktop=false,device={}){
 const p=visualSyncPreferences(prefs),valid=n=>Number.isFinite(n)&&n>=0&&n<=2;
 const available=!desktop&&!!context&&valid(context.outputLatency)&&context.outputLatency>0;
 const estimateMs=available?Math.round((context.outputLatency+(valid(context.baseLatency)?context.baseLatency:0))*1000):0;
 const profile=p.visualSyncDevices[device.id],mode=profile?.mode||'auto',transport=mode==='auto'?device.transport:mode;
 const offsetMs=desktop?p.desktopVisualSyncOffsetMs:device.id?(profile?.offsetMs||0):p.visualSyncOffsetMs;
 return {desktop,deviceId:device.id||'',deviceLabel:device.label||'',mode,transport,automatic:!desktop&&p.visualSyncAuto,available,estimateMs,offsetMs,delayMs:clamp((p.visualSyncAuto&&!desktop&&transport!=='direct'?estimateMs:0)+offsetMs,0,2000)};
}
const arrays={bands:8,timbreBands:8,bandDb:8,spectrum:48,lightingSpectrum:48,harmonic:48,percussive:48,accents:3,hits:3,wave:128};
const scalars=['rms','db','peakDb','loudness','onset'];
function frame(){const f={time:0,active:false};for(const [key,n]of Object.entries(arrays))f[key]=new Float32Array(n);for(const key of scalars)f[key]=key.endsWith('Db')||key==='db'?-100:0;return f;}
function copy(to,from,wave){
 for(const key of scalars)to[key]=from[key]??(key.endsWith('Db')||key==='db'?-100:0);
 for(const key of Object.keys(arrays)){
  const input=key==='wave'?wave:from[key],output=to[key];
  if(!input?.length){output.fill(0);continue;}
  if(input.length===output.length)output.set(input);
  else for(let i=0;i<output.length;i++)output[i]=input[Math.floor(i*(input.length-1)/(output.length-1))];
 }
}
export class VisualSyncBuffer{
 constructor(){this.delayMs=0;this.clear();}
 clear(){this.slots=[];this.head=0;this.count=0;this.lastTime=null;this.readTime=-Infinity;this.effectiveDelayMs=this.delayMs;this.active=false;this.output=frame();}
 // Device latency varies slightly even during uninterrupted playback. Changing
 // the offset must not empty the signal or replay an earlier attack.
 setDelay(milliseconds){this.delayMs=clamp(Math.round(Number.isFinite(milliseconds)?milliseconds:0),0,2000);if(this.lastTime===null)this.effectiveDelayMs=this.delayMs;}
 process(features,active,time,wave){
  // A genuine suspension starts a new timeline. Brief rendering stalls keep
  // their history. Explicit seeks/source changes call clear() themselves.
  if(this.lastTime!==null&&(time<this.lastTime||time-this.lastTime>1000))this.clear();
  if(time===this.lastTime){this.output.hits.fill(0);return this.output;}
  const dt=this.lastTime===null?0:time-this.lastTime;this.lastTime=time;
  this.effectiveDelayMs+=clamp(this.delayMs-this.effectiveDelayMs,-dt*.1,dt*.1);
  const capacity=2048,index=(this.head+this.count)%capacity,entry=this.slots[index]??=frame();
  copy(entry,features,wave);entry.time=time;entry.active=active;
  if(this.count===capacity)this.head=(this.head+1)%capacity;else this.count++;
  // Retain enough history to change the offset without a silent refill, even
  // when currently bypassed. Array storage is recycled and stays bounded.
  while(this.count>1&&this.slots[(this.head+1)%capacity].time<time-2200){this.head=(this.head+1)%capacity;this.count--;}
  if(this.delayMs===0&&this.effectiveDelayMs===0){this.active=active;this.readTime=time;copy(this.output,features,wave);return features;}
  const target=Math.max(this.readTime,time-this.effectiveDelayMs),hits=this.output.hits;hits.fill(0);let before=null,after=null;
  for(let n=0;n<this.count;n++){
   const f=this.slots[(this.head+n)%capacity];
   if(f.time>target+.0001){after=f;break;}
   if(f.time>this.readTime+.0001)for(let i=0;i<3;i++)hits[i]=Math.max(hits[i],f.hits[i]);
   before=f;
  }
  if(before){
   const a=hits[0],b=hits[1],c=hits[2];copy(this.output,before,before.wave);hits[0]=a;hits[1]=b;hits[2]=c;
   // Interpolate continuous measurements at the delayed instant; playback
   // edges and one-shot hits stay discrete and cannot happen early.
   if(after&&before.active===after.active){
    const mix=clamp((target-before.time)/(after.time-before.time),0,1);
    for(const key of scalars)this.output[key]+=(after[key]-this.output[key])*mix;
    for(const key of Object.keys(arrays))if(key!=='hits')for(let i=0;i<this.output[key].length;i++)this.output[key][i]+=(after[key][i]-this.output[key][i])*mix;
   }
   this.active=before.active;
  }
  this.readTime=target;
  return this.output;
 }
}
