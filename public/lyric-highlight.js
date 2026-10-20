import {wordProgress} from './lyric-timing.js';
import {interfaceAccent} from './interface-accent.js';
import {validPalette} from './artwork-palette.js';

// Only genuine word timestamps qualify for word-accurate rendering.
export function hasWordTimings(cue){
 const words=cue?.words;
 return typeof cue?.text==='string'&&!!words?.length&&words.every((w,i)=>typeof w.text==='string'&&Number.isFinite(w.start)&&w.start>=0&&(w.end===undefined||Number.isFinite(w.end)&&w.end>=w.start)&&(!i||w.start>=words[i-1].start))&&words.map(w=>w.text).join('').trim()===cue.text.trim();
}
export function wordTimingCoverage(record){
 const lines=(record?.lines||[]).filter(l=>l.text?.trim()),timed=lines.filter(hasWordTimings);
 return {lines:lines.length,wordLines:timed.length,sweepLines:timed.filter(l=>l.words.some(w=>Number.isFinite(w.end)&&w.end>w.start)).length};
}
/** An approximate phrase window, never persisted as fabricated word timestamps. */
export function phraseWindow(cue,next,duration){
 if(!cue?.text?.trim()||!Number.isFinite(cue.time)||cue.time<0)return null;
 const ends=[cue.end,next?.time,duration].filter(n=>Number.isFinite(n)&&n>cue.time);
 return ends.length?{start:cue.time,end:Math.min(...ends)}:null;
}
export function lyricPalette(colors){
 const candidates=validPalette(colors)?colors:[[.62,.42,.95],[.35,.8,.9],[.8,.45,.7]];
 // Use a colorful sampled tone, lifting dark ink for readable text without a white wash.
 const rank=c=>Math.max(...c)-Math.min(...c)+Math.max(...c)*.15;
 const chosen=candidates.reduce((best,c)=>rank(c)>rank(best)?c:best,candidates[0]);
 const ink=interfaceAccent([chosen,chosen,chosen]),peak=Math.max(...chosen);
 const glow=chosen.map(x=>Math.round((peak>0?x/peak*.95:.8)*255));
 return {ink:`rgb(${ink.join(' ')})`,glow:`rgb(${glow.join(' ')})`};
}
/** Keep the DOM stable during playback; only the moving fill changes each frame. */
export function createWordHighlight(element){
 let current,spans=[],window=null,dirty=true,totalWidth=0;
 const observer=new ResizeObserver(()=>{dirty=true;});observer.observe(element);
 let disposed=false;document.fonts?.ready.then(()=>{if(!disposed)dirty=true;});
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'word'}):null;
 const add=(text,word)=>{
  const span=document.createElement('span');span.className='lyric-word';span.textContent=text;
  const ink=document.createElement('span');ink.className='lyric-ink';ink.setAttribute('aria-hidden','true');ink.dataset.text=text;span.append(ink);
  span.style.setProperty('--word-fill','0%');element.append(span);spans.push({span,word,fill:'0.000',width:0});
 };
 return {
  show(cue,{next,duration}={}){
   window=phraseWindow(cue,next,duration);
   const timed=hasWordTimings(cue),mode=timed?'word':window?'phrase':'none';
   if(cue===current&&element.dataset.timing===mode)return;
   current=cue;spans=[];dirty=true;element.textContent=cue?.text||'';
   element.dataset.wordTimed=String(timed);element.dataset.timing=mode;
   if(mode==='none')return;
   element.replaceChildren();
   const words=timed?cue.words:(segmenter?Array.from(segmenter.segment(cue.text),part=>({text:part.segment})):(cue.text.match(/\s+|\S+/gu)||[]).map(text=>({text})));
   for(const word of words){
    // Whitespace belongs between words, outside the painted word width.
    const [,before,text,after]=word.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if(before)element.append(document.createTextNode(before));
    if(text)add(text,timed?word:null);
    if(after)element.append(document.createTextNode(after));
   }
  },
  paint(time){
   const phrase=element.dataset.timing==='phrase';
   // Layout is measured only on a new phrase, resize or font load, never every frame.
   if(phrase&&dirty){totalWidth=0;for(const item of spans){item.width=item.span.getBoundingClientRect().width;totalWidth+=item.width;}dirty=totalWidth===0;}
   let passed=0;const progress=phrase?wordProgress(window,time)*totalWidth:0;
   for(const item of spans){
    const amount=phrase?Math.max(0,Math.min(1,(progress-passed)/Math.max(.001,item.width))):wordProgress(item.word,time);
    const fill=(amount*100).toFixed(3);passed+=item.width;
    if(fill!==item.fill){
     item.fill=fill;item.span.style.setProperty('--word-fill',fill+'%');item.span.style.setProperty('--word-lit',amount>0?'1':'0');
     const complete=fill==='100.000';if(complete!==item.complete){item.complete=complete;item.span.classList.toggle('lyric-complete',complete);}
    }
   }
  },
  dispose(){disposed=true;observer.disconnect();}
 };
}

/** One frame loop while visible/active, with no free-running animation clock. */
export function createLyricTicker(paint,active){
 let frame=0,disposed=false;
 const tick=()=>{frame=0;if(disposed)return;paint();if(active())frame=requestAnimationFrame(tick);};
 return {
  wake(){if(disposed)return;paint();if(active()){if(!frame)frame=requestAnimationFrame(tick);}else if(frame){cancelAnimationFrame(frame);frame=0;}},
  dispose(){disposed=true;cancelAnimationFrame(frame);frame=0;}
 };
}
