import {wordProgress} from './lyric-timing.js';

// A line timestamp is never used to invent word boundaries.
export function hasWordTimings(cue){
 const words=cue?.words;
 return typeof cue?.text==='string'&&!!words?.length&&words.every((w,i)=>typeof w.text==='string'&&Number.isFinite(w.start)&&w.start>=0&&(w.end===undefined||Number.isFinite(w.end)&&w.end>=w.start)&&(!i||w.start>=words[i-1].start))&&words.map(w=>w.text).join('').trim()===cue.text.trim();
}
export function wordTimingCoverage(record){
 const lines=(record?.lines||[]).filter(l=>l.text?.trim()),timed=lines.filter(hasWordTimings);
 return {lines:lines.length,wordLines:timed.length,sweepLines:timed.filter(l=>l.words.some(w=>Number.isFinite(w.end)&&w.end>w.start)).length};
}
/** Keep the DOM stable during playback; only the moving fill changes each frame. */
export function createWordHighlight(element){
 let current,spans=[];
 return {
  show(cue){
   if(cue===current)return;current=cue;spans=[];element.textContent=cue?.text||'';
   element.dataset.wordTimed=String(hasWordTimings(cue));
   if(!hasWordTimings(cue))return;
   element.replaceChildren();
   for(const word of cue.words){
    // Whitespace belongs between words, outside the painted word width.
    const [,before,text,after]=word.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if(before)element.append(document.createTextNode(before));
    if(text){
     const span=document.createElement('span');span.className='lyric-word';span.textContent=text;
     span.style.setProperty('--word-fill','0%');element.append(span);spans.push({span,word,fill:'0.000'});
    }
    if(after)element.append(document.createTextNode(after));
   }
  },
  paint(time){
   for(const item of spans){
    const fill=(wordProgress(item.word,time)*100).toFixed(3);
    if(fill!==item.fill){item.fill=fill;item.span.style.setProperty('--word-fill',fill+'%');}
   }
  }
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
