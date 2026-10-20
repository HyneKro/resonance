import {TrackLevel,playbackRange} from './song-analysis.js';
import {installListeningTimeline} from './listening-timeline.js';
export const needsSongAnalysis=p=>!!(p.leveling||p.skipSilence||p.autoDirection!==false&&!p.musicOnly);
export function listeningSettings(p,{mobile=false}={}){return `<section class="settings-card listening-settings"><h3>A smoother listen</h3><label class="toggle-label"><input type="checkbox" role="switch" aria-label="Loudness leveling" ${mobile?'data-pref':'data-preference'}="leveling" ${p.leveling?'checked':''}> Loudness leveling</label><p class="fine-print">Match songs to a shared overall level (−16 LUFS), keeping the quiet and loud moments within each song. Measurements are saved locally and prepared ahead of playback. A song that is not ready yet is measured before it starts. Peak protection may keep highly dynamic recordings quieter.</p><p class="fine-print" data-leveling-coverage role="status">Reading library measurements…</p><label class="toggle-label"><input type="checkbox" role="switch" aria-label="Skip silent edges" ${mobile?'data-pref':'data-preference'}="skipSilence" ${p.skipSilence?'checked':''}> Skip silent edges</label><p class="fine-print">Skip measured silence at the beginning and end. Spoken intros can be marked in Behind the sound → Listening edit. Intentional pauses inside a song are kept.</p>${mobile?'':`<label class="field">Crossfade · experimental<input type="range" min="0" max="8" step="1" value="${p.crossfadeSeconds||0}" data-preference="crossfadeSeconds" aria-label="Crossfade seconds"><output data-crossfade-label>${p.crossfadeSeconds||0} seconds · 0 is off</output></label><p class="fine-print">Overlap the end and beginning of queued songs. Long mixes, repeat-one and consecutive songs from the same album keep their original transitions.</p>`}</section>`;}
export class ListeningEnhancements {
 constructor({audio,reactor,api,getTrack,getPreferences,next,onPreparation=()=>{},onLevelError=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms)),canAdvance=()=>true,canCrossfade=()=>true,audioFactory=()=>new Audio()}){
  Object.assign(this,{audio,reactor,api,getTrack,getPreferences,next,onPreparation,onLevelError,wait,canAdvance,canCrossfade,audioFactory});this.generation=0;this.fadeGeneration=0;this.profile=null;this.edit=null;this.pending=false;this.tail=null;this.level=new TrackLevel();this.timelines=[...(globalThis.document?.querySelectorAll('#seek,#room-seek')||[])].map(installListeningTimeline);
  audio.addEventListener('loadedmetadata',()=>this.paintTimeline());
  audio.addEventListener('playing',()=>this.hasPlayed=true);
  audio.addEventListener('timeupdate',()=>void this.tick().catch(()=>this.cancelFade()));audio.addEventListener('pause',()=>{if(!this.switching)this.cancelFade();});audio.addEventListener('seeking',()=>{if(!this.switching)this.cancelFade();});audio.addEventListener('volumechange',()=>{if(this.tail){this.tail.audio.volume=audio.volume;this.tail.audio.muted=audio.muted;}});
 }
 async select(track){const generation=++this.generation;clearTimeout(this.timer);this.onPreparation(null);this.preparing=false;this.hasPlayed=false;this.bypassId=null;this.track=track;this.loaded=false;this.requested=false;this.error='';this.profile=null;this.edit=null;this.selecting=true;this.paintTimeline();if(track)await this.load(false);if(generation!==this.generation)return;this.selecting=false;this.level.select(this.profile,this.getPreferences().leveling);this.reactor.setPlaybackGain?.(this.level.db,{immediate:this.audio.paused});this.apply();}
 async prepare(){
  if(!this.track||!this.getPreferences().leveling||this.hasPlayed||this.bypassId===this.track.id)return true;
  if(this.profile){this.level.select(this.profile,true);this.reactor.setPlaybackGain?.(this.level.db,{immediate:true});return true;}
  const generation=this.generation;this.preparing=true;this.selecting=true;
  // Cancel / play original must respond even while a profile request is pending.
  let wake,timer,failed=false;const interrupted=new Promise(resolve=>wake=resolve);
  this.wakePreparation=wake;timer=setTimeout(()=>wake('timeout'),30000);
  const waitFor=promise=>Promise.race([promise,interrupted]);
  this.onPreparation({title:this.track.title,progress:null});
  try{let value=await waitFor(this.load(true));while(generation===this.generation&&this.getPreferences().leveling&&!this.profile&&this.bypassId!==this.track.id){
    if(value==='timeout'||this.error||!value?.job?.running){failed=true;this.onPreparation({title:this.track.title,error:value==='timeout'?'timeout':this.error||'Analysis unavailable'});return false;}
    this.onPreparation({title:this.track.title,progress:value.job.id===this.track.id?value.job.progress:null});await waitFor(this.wait(250));
    if(generation!==this.generation)return false;if(this.bypassId===this.track.id)break;
    value=await waitFor(this.load(false));
   }
   if(generation!==this.generation)return false;
   this.level.select(this.bypassId===this.track.id?null:this.profile,this.getPreferences().leveling);this.reactor.setPlaybackGain?.(this.level.db,{immediate:true});if(this.error)this.onLevelError('Loudness could not be measured for this song. Playing its original level.');
   return true;
  }finally{clearTimeout(timer);if(this.wakePreparation===wake)this.wakePreparation=null;if(generation===this.generation){this.preparing=false;this.selecting=false;if(!failed)this.onPreparation(null);this.paintTimeline();}}
 }
 playOriginal(){this.bypassId=this.track?.id;this.wakePreparation?.('original');}
 cancelPreparation(){++this.generation;this.wakePreparation?.('cancel');this.preparing=false;this.selecting=false;this.onPreparation(null);clearTimeout(this.timer);}
 prefetch(ids){if(this.getPreferences().leveling)for(const id of ids.slice(0,3))void this.api('/api/audio-profile',{id}).catch(()=>{});}
 async load(request){const track=this.track,generation=this.generation;if(!track)return;if(request)this.requested=true;
  try{const value=await this.api('/api/audio-profile'+(request?'':'?id='+encodeURIComponent(track.id)),request?{id:track.id,priority:this.preparing}:undefined);if(generation!==this.generation)return;this.loaded=true;this.error=value.error;this.profile=value.profile;this.edit=value.edit;this.reactor.updateSongProfile?.(track.id,this.profile);this.apply();if(value.job?.running&&!value.error&&!this.selecting){clearTimeout(this.timer);this.timer=setTimeout(()=>this.load(false),2000);}return value;}
  catch{if(generation===this.generation)this.error='Analysis unavailable';}
 }
 range(){return playbackRange(this.audio.duration||this.getTrack()?.duration||0,this.edit,this.profile,this.getPreferences().skipSilence);}
 paintTimeline(){const data={duration:this.track?.duration||this.audio.duration,edit:this.edit,profile:this.profile,enabled:this.getPreferences().skipSilence};this.timelines.forEach(paint=>paint(data));}
 apply(){if(this.selecting)return;const p=this.getPreferences();this.reactor.setPlaybackGain?.(this.level.update(this.profile,p.leveling));this.paintTimeline();const out=globalThis.document?.querySelector('[data-crossfade-label]');if(out)out.textContent=(p.crossfadeSeconds||0)+' seconds · 0 is off';if(this.loaded&&!this.profile&&!this.requested&&!this.error&&needsSongAnalysis(p)&&!(p.leveling&&this.audio.paused&&!this.hasPlayed))void this.load(true);}
 async tick(){if(this.audio.paused||this.audio.seeking||this.pending||!this.canAdvance())return;const range=this.range(),position=this.audio.currentTime;if(!range.end)return;
  if(position<range.start-.15){this.audio.currentTime=range.start;return;}
  const fade=this.canCrossfade()?Number(this.getPreferences().crossfadeSeconds)||0:0,seconds=Math.min(fade,(range.end-range.start)/3),trimmed=range.end<(this.audio.duration||range.end)-.15;
  if(trimmed&&position>=range.end-.08||seconds>0&&position>=range.end-seconds){this.pending=true;try{await this.next(seconds>0&&position<range.end-.08?seconds:0);}finally{this.pending=false;}}
 }
 async beginFade(seconds){this.cancelFade();if(!seconds||this.audio.paused||!this.audio.currentSrc||!this.reactor.context)return false;
  const token=this.fadeGeneration,old=this.audio.currentSrc,tail=this.audioFactory(),context=this.reactor.context;tail.preload='auto';tail.volume=this.audio.volume;tail.muted=this.audio.muted;tail.src=old;
  const source=context.createMediaElementSource(tail),gain=context.createGain(),filters=[];let previous=source;
  for(const [i,f] of (this.reactor.filters||[]).entries()){const copy=context.createBiquadFilter();copy.type=f.type;copy.frequency.value=f.frequency.value;copy.Q.value=f.Q.value;copy.gain.value=this.reactor.eqValues?.[i]||0;previous.connect(copy);previous=copy;filters.push(copy);}previous.connect(gain);gain.gain.value=0;gain.connect(context.destination);this.tail={audio:tail,source,gain,filters};
  const ready=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),1500);tail.onloadedmetadata=()=>{clearTimeout(timer);resolve(true);};tail.onerror=()=>{clearTimeout(timer);resolve(false);};tail.load();});
  if(token!==this.fadeGeneration)return false;
  if(!ready||this.audio.currentSrc!==old||this.audio.paused){this.cancelFade();return false;}
  tail.currentTime=Math.min(tail.duration-.02,this.audio.currentTime);
  try{await tail.play();if(token!==this.fadeGeneration)return false;if(this.audio.paused){this.cancelFade();return false;}this.tail.end=this.range().end;this.tail.endTimer=setTimeout(()=>tail.pause(),Math.max(0,this.tail.end-tail.currentTime)*1000);gain.gain.setValueAtTime(10**(this.level.db/20),context.currentTime);this.switching=true;this.reactor.setTransitionGain(0);return true;}catch{if(token===this.fadeGeneration)this.cancelFade();return false;}
 }
 finishFade(seconds){this.switching=false;if(!this.tail||seconds<=0){this.cancelFade();return;}seconds=Math.min(seconds,Math.max(.02,this.tail.end-this.tail.audio.currentTime));const context=this.reactor.context,now=context.currentTime;this.tail.gain.gain.setValueAtTime(this.tail.gain.gain.value,now);this.tail.gain.gain.linearRampToValueAtTime(0,now+seconds);this.reactor.setTransitionGain(1,seconds);this.reactor.setPlaybackGain(this.level.db);this.fadeTimer=setTimeout(()=>this.cancelFade(),seconds*1000+50);}
 cancelFade(){++this.fadeGeneration;clearTimeout(this.fadeTimer);this.switching=false;if(this.tail){clearTimeout(this.tail.endTimer);this.tail.audio.pause();this.tail.audio.removeAttribute('src');this.tail.audio.load();this.tail.source.disconnect();this.tail.gain.disconnect();this.tail.filters.forEach(f=>f.disconnect());this.tail=null;}this.reactor.setTransitionGain(1);this.apply();}
}
