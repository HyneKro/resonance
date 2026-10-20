import {lyricsStamp,lyricLineAt} from './lyrics.js';
import {timingOffset} from './lyric-timing.js';
import {createWordHighlight,createLyricTicker,wordTimingCoverage} from './lyric-highlight.js';

export function lyricStyle(track){
 const genre=String(track?.genre||'').toLowerCase();
 if(/metal|rock|punk/.test(genre))return 'bold';
 if(/jazz|classical|folk|soul|acoustic/.test(genre))return 'serif';
 if(/electronic|synth|house|techno|trance|dubstep/.test(genre))return 'electronic';
 return 'soft';
}
/** Only the visible line has word spans. Audio analysis never runs in this renderer. */
export function installDynamicLyrics({audio,current,read,delay=()=>0,capturing=()=>false,button=document.querySelector('#dynamic-lyrics'),host=document.querySelector('#listening-room')}){
 if(!button||!host)return;
 const overlay=document.createElement('section');overlay.className='dynamic-lyrics';overlay.hidden=true;overlay.setAttribute('aria-label','Synchronized lyrics');
 const previous=document.createElement('p'),line=document.createElement('p'),next=document.createElement('p');
 previous.className='lyric-context lyric-previous';line.className='lyric-current';next.className='lyric-context lyric-next';overlay.append(previous,line,next);host.append(overlay);
 let enabled=false;try{enabled=localStorage.getItem('resonance:dynamic-lyrics')==='true';}catch{}
 const highlight=createWordHighlight(line);
 let key='',record=null,generation=0,index=-2,loading=false,disposed=false,buttonState='',retryAt=0,retries=0,coverage={wordLines:0};
 function paint(){
  const available=!!record?.lines?.some(l=>l.text)&&!capturing();
  const state=[available,enabled,loading,record?.status,coverage.wordLines].join('|');if(state!==buttonState){buttonState=state;
  button.disabled=!available;button.classList.toggle('lyrics-ready',available);button.setAttribute('aria-pressed',String(enabled&&available));button.setAttribute('aria-busy',String(loading));
  button.title=loading?'Finding timed lyrics…':available?(enabled?'Hide dynamic lyrics':coverage.wordLines?'Word-timed lyrics ready · show dynamic lyrics':'Line-timed lyrics ready · word highlighting needs word timestamps'):record?.status==='text'?'Lyrics found without matching timecodes · see song details':record?.status==='instrumental'?'This recording is marked instrumental':record?.status==='unavailable'?'Lyrics service unavailable · retry in song details':'No timed lyrics for this song yet';
  }
  overlay.hidden=document.hidden||!enabled||!available||document.body.dataset.listeningMode!=='visualizer'||document.body.classList.contains('visualizer-preparing');
  if(overlay.hidden)return;
  const time=(Number(audio.currentTime)||0)-Math.max(0,Number(delay())||0)/1000-timingOffset(record.offset),selected=lyricLineAt(record.lines,time);
  const cue=record.lines[selected];
  if(selected===index){
   line.style.opacity=Number.isFinite(cue?.end)&&time>cue.end+.3?'0':'';
   highlight.paint(time);
   return;
  }index=selected;
  previous.textContent=record.lines[index-1]?.text||'';next.textContent=record.lines[index+1]?.text||'';
  line.style.opacity=Number.isFinite(cue?.end)&&time>cue.end+.3?'0':'';highlight.show(cue);highlight.paint(time);
  overlay.style.setProperty('--lyric-scale',String(Math.max(.68,Math.min(1,Math.sqrt(64/Math.max(1,line.textContent.length))))));
  // An explicit blank LRC cue clears the verse during instrumental passages.
  overlay.classList.toggle('lyric-break',!line.textContent);
  line.getAnimations?.().forEach(a=>a.cancel());
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&line.textContent)line.animate?.([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
 async function select(force=false){
  const track=current(),nextKey=track?.id+'|'+lyricsStamp(track);if(!force&&key===nextKey)return;
  if(key!==nextKey)retries=0;retryAt=0;key=nextKey;const token=++generation;record=null;coverage={wordLines:0};index=-2;loading=!!track;
  overlay.dataset.style=lyricStyle(track);
  let hash=0;for(const c of String(track?.artist||''))hash=(hash*31+c.codePointAt(0))>>>0;
  overlay.style.setProperty('--lyric-tracking',(hash%3)*.012+'em');paint();
  if(!track)return;
  try{const result=await read(track);if(disposed||token!==generation)return;record=result;}catch{if(token===generation)record={status:'unavailable'};}
  finally{if(token===generation){loading=false;coverage=wordTimingCoverage(record);if(record?.status==='unavailable'&&retries<2)retryAt=Date.now()+60000*2**retries++;ticker.wake();}}
 }
 const ticker=createLyricTicker(paint,()=>!disposed&&!overlay.hidden&&!document.hidden&&!audio.paused&&!audio.ended);
 const changed=()=>{void select();ticker.wake();},refresh=e=>{if(!e.detail?.id||e.detail.id===current()?.id)void select(true);};
 button.onclick=()=>{enabled=!enabled;try{localStorage.setItem('resonance:dynamic-lyrics',String(enabled));}catch{}index=-2;ticker.wake();};
 const playbackEvents=['timeupdate','trackchange','play','playing','pause','seeking','seeked','ratechange','ended'];
 playbackEvents.forEach(name=>audio.addEventListener(name,changed));document.addEventListener('visibilitychange',changed);document.addEventListener('resonance-track-change',changed);document.addEventListener('resonance-lyrics-change',refresh);
 const timer=setInterval(()=>{if(!document.hidden){void select(!!retryAt&&Date.now()>=retryAt);ticker.wake();}},200);
 void select();
 return {refresh:()=>select(true),dispose(){disposed=true;++generation;clearInterval(timer);ticker.dispose();playbackEvents.forEach(name=>audio.removeEventListener(name,changed));document.removeEventListener('visibilitychange',changed);document.removeEventListener('resonance-track-change',changed);document.removeEventListener('resonance-lyrics-change',refresh);overlay.remove();}};
}
