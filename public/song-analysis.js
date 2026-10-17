// Shared, compact description of a decoded file. Never changes the original audio.
export const AUDIO_PROFILE_VERSION=1;
export const PROFILE_FILTER='ebur128=metadata=1:peak=true,aformat=channel_layouts=mono,astats=metadata=1:reset=1:measure_perchannel=RMS_level+Peak_level+Zero_crossings_rate:measure_overall=none,ametadata=mode=print:file=-';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const round=x=>Math.round(x*1000)/1000;
const quantile=(a,q)=>a[Math.min(a.length-1,Math.floor((a.length-1)*q))]??-60;
export class ProfileReader {
 constructor(duration=0){this.step=Math.max(1,Math.ceil(duration/3600));this.bins=[];this.current=null;this.integrated=null;this.peak=-100;this.duration=0;}
 line(line){
  if(line.startsWith('frame:')){this.flush();const time=Number(line.match(/pts_time:([\d.e+-]+)/)?.[1]);this.current=Number.isFinite(time)?{time}:null;return;}
  const split=line.indexOf('=');if(!this.current||split<0)return;const key=line.slice(0,split),value=Number(line.slice(split+1));if(!Number.isFinite(value))return;
  if(key==='lavfi.r128.I'&&value>-69)this.integrated=value;
  if(key==='lavfi.r128.true_peak'&&value>0)this.peak=Math.max(this.peak,20*Math.log10(value));
  if(key==='lavfi.astats.1.RMS_level')this.current.rms=value;
  if(key==='lavfi.astats.1.Peak_level')this.current.peak=value;
  if(key==='lavfi.astats.1.Zero_crossings_rate')this.current.texture=clamp(value*8);
 }
 flush(){const f=this.current;if(!f)return;this.current=null;this.duration=Math.max(this.duration,f.time+.1);const index=Math.floor(f.time/this.step);if(index<0||index>=3600)return;const b=this.bins[index]??={power:0,texture:0,attack:0,count:0};const rms=Number.isFinite(f.rms)?f.rms:-100;
  b.power+=10**(rms/10);b.texture+=f.texture||0;b.attack+=clamp(((f.peak??rms)-rms-6)/18);b.count++;
 }
 finish(){this.flush();const raw=Array.from({length:this.bins.length},(_,i)=>{const b=this.bins[i]||{power:0,count:1,texture:0,attack:0};return [i*this.step,Math.max(-100,10*Math.log10(Math.max(1e-10,b.power/b.count))),b.texture/b.count,b.attack/b.count];});
  const levels=raw.map(b=>b[1]).filter(x=>x>-60).sort((a,b)=>a-b),low=quantile(levels,.1),high=quantile(levels,.95);
  const timeline=raw.map(([t,db,texture,attack])=>[round(t),round(db),round(db<-60?0:clamp((db-low+4)/Math.max(12,high-low+4))),round(texture),round(attack)]);
  const audible=raw.map((b,i)=>b[1]>-55?i:-1).filter(i=>i>=0);let trim={start:0,end:round(this.duration)};
  if(audible.length){const start=audible[0]*this.step,end=Math.min(this.duration,(audible.at(-1)+1)*this.step);if(start>=1.5)trim.start=Math.max(0,round(start-.3));if(raw.length*this.step+.15>=this.duration&&this.duration-end>=1.5)trim.end=round(end+.3);}
  return {version:AUDIO_PROFILE_VERSION,duration:round(this.duration),step:this.step,integratedLufs:this.integrated==null?null:round(this.integrated),truePeakDb:round(this.peak),timeline,trim,method:'EBU R128 / true peak · local FFmpeg analysis'};
 }
}
export function levelingDb(profile,enabled,target=-16){
 if(!enabled||!Number.isFinite(profile?.integratedLufs)||!Number.isFinite(profile?.truePeakDb)||profile.integratedLufs<-60)return 0;
 // Preserve dynamics; fixed track gain with one dB of measured true-peak headroom.
 return clamp(Math.min(target-profile.integratedLufs,-1-profile.truePeakDb),-24,6);
}
export function playbackRange(duration,edit,profile,skipSilence=false){
 duration=Number.isFinite(duration)&&duration>0?duration:profile?.duration||0;
 const chosen=edit?.enabled?edit:skipSilence?profile?.trim:null;
 const start=clamp(Number(chosen?.start)||0,0,Math.max(0,duration-1)),end=clamp(Number(chosen?.end)||duration,start+Math.min(1,duration),duration);
 return {start,end};
}
export function validateRange(value,duration){
 if(value?.enabled===false)return {enabled:false,start:0,end:duration};
 const {start,end}=value||{};if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration+.1||end-start<1)throw Error('Keep at least one second, within the original track duration.');
 return {enabled:true,start:round(start),end:round(end)};
}
export function sampleProfile(profile,time){
 const rows=profile?.timeline;if(!rows?.length)return null;
 const x=clamp(time/(profile.step||1),0,rows.length-1),i=Math.floor(x),a=rows[i],b=rows[Math.min(i+1,rows.length-1)],f=x-i;
 return {energy:a[2]+(b[2]-a[2])*f,texture:a[3]+(b[3]-a[3])*f,attack:a[4]+(b[4]-a[4])*f};
}
// These are measured texture/energy chapters, not guesses at verse/chorus or instruments.
export function songChapters(profile){
 const rows=profile?.timeline;if(!rows?.length)return [];const step=profile.step||1,stride=Math.max(1,Math.ceil(20/step)),chapters=[];
 for(let i=0;i<rows.length;i+=stride){const slice=rows.slice(i,i+stride),mean=k=>slice.reduce((sum,r)=>sum+r[k],0)/slice.length,e=mean(2),t=mean(3),a=mean(4);
  const kind=e<.24?'Suspended':e>.68?'Expansive':a>.4?'Pulsed':t>.55?'Prismatic':'Flowing',end=Math.min(profile.duration,(i+slice.length)*step),previous=chapters.at(-1);
  if(previous?.kind===kind||previous&&end-rows[i][0]<10)previous.end=end;else chapters.push({start:rows[i][0],end,kind});
 }return chapters;
}
export class SongDirector {
 constructor(){this.values=[.5,.5,.3,0];}
 update(profile,time,dt,{enabled=true,active=true,frozen=false,reduced=false}={}){
  if(this.profile!==profile){this.profile=profile;this.chapters=songChapters(profile);this.chapter=null;}
  const now=enabled?sampleProfile(profile,time):null,next=now?sampleProfile(profile,time+5):null;
  const target=now?[now.energy,now.texture,now.attack,clamp((next.energy-now.energy)*2,-1,1)]:[.5,.5,.3,0];
  if(!frozen&&!reduced&&active){const k=1-Math.exp(-clamp(dt,0,.1)/2.8);this.values=this.values.map((v,i)=>v+(target[i]-v)*k);}
  if(enabled&&active&&!frozen&&!reduced)this.chapter=this.chapters.find(c=>time>=c.start&&time<c.end)||this.chapters.at(-1);
  return {available:!!now,chapter:now?this.chapter:null,energy:this.values[0],texture:this.values[1],attack:this.values[2],anticipation:this.values[3]};
 }
}
