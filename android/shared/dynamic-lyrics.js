import {lyricsStamp,lyricLineAt} from './lyrics.js';
import {wordProgress,timingOffset} from './lyric-timing.js';

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
 let key='',record=null,generation=0,index=-2,loading=false,disposed=false,buttonState='',retryAt=0,retries=0,wordSpans=[],nextCheck=0;
 function paint(){
  const available=!!record?.lines?.some(l=>l.text)&&!capturing();
  const state=[available,enabled,loading,record?.status].join('|');if(state!==buttonState){buttonState=state;
  button.disabled=!available;button.classList.toggle('lyrics-ready',available);button.setAttribute('aria-pressed',String(enabled&&available));button.setAttribute('aria-busy',String(loading));
  button.title=loading?'Finding timed lyrics…':available?(enabled?'Hide dynamic lyrics':'Timed lyrics ready · show dynamic lyrics'):record?.status==='text'?'Lyrics found without matching timecodes · see song details':record?.status==='instrumental'?'This recording is marked instrumental':record?.status==='unavailable'?'Lyrics service unavailable · retry in song details':'No timed lyrics for this song yet';
  }
  overlay.hidden=!enabled||!available||document.body.dataset.listeningMode!=='visualizer'||document.body.classList.contains('visualizer-preparing');
  if(overlay.hidden)return;
  const time=(Number(audio.currentTime)||0)-Math.max(0,Number(delay())||0)/1000-timingOffset(record.offset),selected=lyricLineAt(record.lines,time);
  const cue=record.lines[selected];
  if(selected===index){
   line.style.opacity=Number.isFinite(cue?.end)&&time>cue.end+.3?'0':'';
   for(let i=0;i<wordSpans.length;i++){const fill=Math.round(wordProgress(cue.words[i],time)*100);if(wordSpans[i].dataset.fill!==String(fill)){wordSpans[i].dataset.fill=String(fill);wordSpans[i].style.setProperty('--word-fill',fill+'%');}}
   return;
  }index=selected;
  previous.textContent=record.lines[index-1]?.text||'';line.textContent=record.lines[index]?.text||'';next.textContent=record.lines[index+1]?.text||'';
  wordSpans=[];line.style.opacity='';
  if(cue?.words?.length){line.replaceChildren();for(const word of cue.words){const span=document.createElement('span');span.className='lyric-word';span.textContent=word.text;span.style.setProperty('--word-fill',Math.round(wordProgress(word,time)*100)+'%');line.append(span);wordSpans.push(span);}}
  overlay.style.setProperty('--lyric-scale',String(Math.max(.68,Math.min(1,Math.sqrt(64/Math.max(1,line.textContent.length))))));
  // An explicit blank LRC cue clears the verse during instrumental passages.
  overlay.classList.toggle('lyric-break',!line.textContent);
  line.getAnimations?.().forEach(a=>a.cancel());
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&line.textContent)line.animate?.([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
 async function select(force=false){
  const track=current(),nextKey=track?.id+'|'+lyricsStamp(track);if(!force&&key===nextKey)return;
  if(key!==nextKey)retries=0;retryAt=0;key=nextKey;const token=++generation;record=null;index=-2;loading=!!track;
  overlay.dataset.style=lyricStyle(track);
  let hash=0;for(const c of String(track?.artist||''))hash=(hash*31+c.codePointAt(0))>>>0;
  overlay.style.setProperty('--lyric-tracking',(hash%3)*.012+'em');paint();
  if(!track)return;
  try{const result=await read(track);if(disposed||token!==generation)return;record=result;}catch{if(token===generation)record={status:'unavailable'};}
  finally{if(token===generation){loading=false;if(record?.status==='unavailable'&&retries<2)retryAt=Date.now()+60000*2**retries++;paint();}}
 }
 const changed=()=>void select(),refresh=e=>{if(!e.detail?.id||e.detail.id===current()?.id)void select(true);};
 const preview=e=>{if(e.detail?.id!==current()?.id)return;if(!e.detail.record){void select(true);return;}++generation;record=e.detail.record;loading=false;index=-2;paint();};
 button.onclick=()=>{enabled=!enabled;try{localStorage.setItem('resonance:dynamic-lyrics',String(enabled));}catch{}index=-2;paint();};
 audio.addEventListener('timeupdate',changed);audio.addEventListener('trackchange',changed);document.addEventListener('resonance-track-change',changed);document.addEventListener('resonance-lyrics-change',refresh);
 document.addEventListener('resonance-lyrics-preview',preview);
 const timer=setInterval(()=>{if(!document.hidden){if(Date.now()>=nextCheck){nextCheck=Date.now()+200;void select(!!retryAt&&Date.now()>=retryAt);}paint();}},50);
 void select();
 return {refresh:()=>select(true),dispose(){disposed=true;++generation;clearInterval(timer);audio.removeEventListener('timeupdate',changed);audio.removeEventListener('trackchange',changed);document.removeEventListener('resonance-track-change',changed);document.removeEventListener('resonance-lyrics-change',refresh);document.removeEventListener('resonance-lyrics-preview',preview);overlay.remove();}};
}
