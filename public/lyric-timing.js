import {load,JSON_SCHEMA} from './lyrics-yaml.js';

export const timingOffset=value=>Math.max(-60,Math.min(60,Number(value)||0));
const seconds=value=>Number.isSafeInteger(value)&&value>=0?value/1000:NaN;
/** Untrusted provider/sidecar data: bounded YAML, no aliases or custom tags. */
export function parseLyricsfile(raw,duration=Infinity){
 if(typeof raw!=='string'||raw.length>256000)return null;
 try{
  const doc=load(raw,{schema:JSON_SCHEMA,maxAliases:0,maxDepth:12});
  if(doc?.version!=='1.0'||!Array.isArray(doc.lines)||doc.lines.length>2000)return null;
  let count=0;
  const lines=doc.lines.map(l=>{
   const time=seconds(l?.start_ms),end=seconds(l?.end_ms);
   if(typeof l?.text!=='string'||l.text.length>4000||!Number.isFinite(time)||time>duration+1)throw Error('Invalid line');
   const line={time,text:l.text};
   if(Number.isFinite(end)&&end>=time&&end<=duration+1)line.end=end;
   if(Array.isArray(l.words)&&l.words.length<=400){
    const words=l.words.map(w=>({text:w?.text,start:seconds(w?.start_ms),end:seconds(w?.end_ms)}));
    count+=words.length;if(count>10000)throw Error('Too many words');
    if(words.length&&words.every((w,i)=>typeof w.text==='string'&&w.text.length<=1000&&Number.isFinite(w.start)&&w.start>=time&&w.start<=duration+1&&(!i||w.start>=words[i-1].start)&&(!Number.isFinite(w.end)||w.end>=w.start&&w.end<=duration+1))&&words.map(w=>w.text).join('')===line.text){
     line.words=words.map(w=>Number.isFinite(w.end)?w:{text:w.text,start:w.start});
    }
   }
   return line;
  }).sort((a,b)=>a.time-b.time);
  return {lines,text:typeof doc.plain==='string'?doc.plain.slice(0,128000):lines.map(l=>l.text).join('\n'),language:typeof doc.metadata?.language==='string'?doc.metadata.language:'',metadata:doc.metadata};
 }catch{return null;}
}
export function exportLyricsfile(track,record){
 const offset=timingOffset(record.offset);
 const ms=n=>Math.max(0,Math.round((n+offset)*1000));
 return JSON.stringify({version:'1.0',metadata:{title:track.title,artist:track.artist,language:record.language||'',duration:track.duration},plain:record.text||'',lines:(record.lines||[]).map(l=>({text:l.text,start_ms:ms(l.time),...(Number.isFinite(l.end)?{end_ms:ms(l.end)}:{}),...(l.words?.length?{words:l.words.map(w=>({text:w.text,start_ms:ms(w.start),...(Number.isFinite(w.end)?{end_ms:ms(w.end)}:{})}))}:{})}))},null,2);
}
/** Unknown word ends are highlighted at their start, never given invented sung duration. */
export function wordProgress(word,time){return time<word.start?0:!Number.isFinite(word.end)||word.end<=word.start?1:Math.min(1,(time-word.start)/(word.end-word.start));}
