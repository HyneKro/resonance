const norm=s=>s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function words(text,language){
 let segmenter;try{segmenter=new Intl.Segmenter(language||'en',{granularity:'word'});}catch{segmenter=new Intl.Segmenter('en',{granularity:'word'});}
 return [...segmenter.segment(text)].filter(s=>s.isWordLike).map(s=>({key:norm(s.segment),index:s.index,length:s.segment.length})).filter(s=>s.key);
}
/** Token fragments are joined before segmentation (contractions and CJK included). */
export function recognizedWords(result,duration){
 const output=[];
 for(const segment of result.transcription||[]){
  let text='';const spans=[];
  for(const t of segment.tokens||[]){
   if(!Number.isFinite(t.id)||t.id>=50257||!t.text||t.text.startsWith('[_'))continue;
   const start=t.offsets?.from/1000,end=t.offsets?.to/1000;
   if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||end>duration+1)continue;
   spans.push({index:text.length,length:t.text.length,start,end,confidence:t.p||0});text+=t.text;
  }
  for(const w of words(text,result.result?.language)){
   const tokens=spans.filter(t=>t.index+t.length>w.index&&t.index<w.index+w.length);if(!tokens.length)continue;
   output.push({...w,start:tokens[0].start,end:tokens.at(-1).end,confidence:Math.min(...tokens.map(t=>t.confidence))});
  }
 }
 return output.slice(0,6000);
}
const median=a=>{const sorted=a.slice().sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]||0;};
/** Run in a worker: ordered word matching never substitutes recognized text for supplied lyrics. */
export function alignLyrics(record,result,duration){
 if(record.offset){const offset=Math.max(-60,Math.min(60,Number(record.offset)||0));record={...record,offset:0,lines:record.lines?.map(l=>({...l,time:Math.max(0,l.time+offset),...(Number.isFinite(l.end)?{end:Math.max(0,l.end+offset)}:{}),...(l.words?{words:l.words.map(w=>({...w,start:Math.max(0,w.start+offset),...(Number.isFinite(w.end)?{end:Math.max(0,w.end+offset)}:{})}))}:{})}))};}
 const language=result.result?.language||record.language||'en';
 const rows=(record.lines?.some(l=>l.text)?record.lines:record.text.split(/\r?\n/).map(text=>({text}))).filter(l=>l.text.trim()&&!/^\s*\[(?:verse|chorus|bridge|intro|outro|instrumental|pre-chorus|hook)(?:\s[^\]]*)?\]\s*$/i.test(l.text));
 const expected=[],groups=rows.map(line=>{const list=words(line.text,language);for(const w of list){w.global=expected.length;expected.push(w);}return list;});
 const heard=recognizedWords(result,duration);
 if(expected.length<4||expected.length>3000||heard.length<4)throw Error('Not enough clear words to check this song. Your lyrics are unchanged.');
 const width=heard.length+1,table=new Uint16Array((expected.length+1)*width);
 for(let i=expected.length-1;i>=0;i--)for(let j=heard.length-1;j>=0;j--){
  table[i*width+j]=expected[i].key===heard[j].key&&heard[j].confidence>=.35?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);
 }
 const matched=new Map();let i=0,j=0;
 while(i<expected.length&&j<heard.length){if(expected[i].key===heard[j].key&&heard[j].confidence>=.35){matched.set(i++,heard[j++]);}else if(table[(i+1)*width+j]>table[i*width+j+1])i++;else j++;}
 const coverage=matched.size/expected.length;
 const anchors=groups.map((g,i)=>({line:rows[i],heard:matched.get(g[0]?.global),group:g})).filter(a=>a.heard&&a.group.filter(w=>matched.has(w.global)).length/Math.max(1,a.group.length)>=.7);
 const timed=anchors.filter(a=>Number.isFinite(a.line.time)),offsets=timed.map(a=>a.heard.start-a.line.time),shift=median(offsets),deviation=median(offsets.map(n=>Math.abs(n-shift)));
 const spread=timed.length?timed.at(-1).heard.start-timed[0].heard.start:0;
 const consistent=timed.length>=Math.min(5,rows.length)&&deviation<.35&&offsets.filter(n=>Math.abs(n-shift)<.8).length/timed.length>=.85&&spread>duration*.45;
 const keep=consistent&&Math.abs(shift)<.35;
 // Sparse recognition may enrich an already timed recording, but must never
 // retime its unmatched lines or declare their timing verified.
 const complete=coverage>=.75&&anchors.length>=Math.min(3,rows.length)&&anchors.length/rows.length>=.75;
 const preserve=!complete&&coverage>=.5&&timed.length>=5&&spread>duration*.45&&Math.abs(shift)<.6&&offsets.filter(n=>Math.abs(n)<1).length/timed.length>=.8;
 if(!preserve&&!complete)throw Object.assign(Error('Only '+Math.round(coverage*100)+'% of words matched reliably. Try a clearer recording or correct the lyrics first. Your timings are unchanged.'),{coverage,matchedLines:anchors.length,totalLines:rows.length});
 const lines=[];let wordLines=0;
 for(let r=0;r<rows.length;r++){
  const source=rows[r],g=groups[r],first=matched.get(g[0]?.global),all=g.length&&g.every(w=>matched.has(w.global));
  let time=(preserve||consistent)&&Number.isFinite(source.time)?Math.max(0,source.time+(preserve||keep?0:shift)):first?.start;
  if(!Number.isFinite(time)||!preserve&&!consistent&&!anchors.some(a=>a.line===source))continue;
  const line={time,text:source.text};
  if((preserve||consistent)&&Number.isFinite(source.time)){
   const delta=time-source.time;
   if(Number.isFinite(source.end))line.end=source.end+delta;
   if(source.words)line.words=source.words.map(w=>({...w,start:w.start+delta,...(Number.isFinite(w.end)?{end:w.end+delta}:{})}));
  }
  if(all){
   const wordList=g.map((w,k)=>({text:source.text.slice(k? w.index:0,k+1<g.length?g[k+1].index:source.text.length),start:matched.get(w.global).start,end:matched.get(w.global).end}));
   if(wordList.every((w,k)=>w.end>w.start&&w.end-w.start<12&&w.start>=time&&(!preserve||w.end<=(rows[r+1]?.time??duration)+.1)&&(!k||w.start>=wordList[k-1].end-.1))){
    line.words=wordList;line.end=wordList.at(-1).end;
   }
  }
  if(line.words?.length)wordLines++;
  lines.push(line);
 }
 if(!lines.length)throw Error('No reliable timing could be found.');
 if(preserve&&!keep&&!wordLines)throw Error('The words were not clear enough to add reliable highlighting. Existing timings are unchanged.');
 // Explicit blanks avoid holding a matched line across a missing verse/instrumental.
 const cues=preserve||consistent?(record.lines||[]).filter(l=>!l.text).map(l=>({...l,time:Math.max(0,l.time+(preserve||keep?0:shift))})):[];lines.sort((a,b)=>a.time-b.time);
 for(let k=0;k<lines.length;k++){const l=lines[k];cues.push(l);if(Number.isFinite(l.end)&&l.end+.4<(lines[k+1]?.time??duration))cues.push({time:l.end+.2,text:''});}
 cues.sort((a,b)=>a.time-b.time);
 return {...record,lines:cues,language,status:'synced',offset:0,analysis:{engine:'whisper.cpp small-q5_1',coverage,wordLines,matchedLines:anchors.length,totalLines:rows.length,method:preserve?'enriched':keep?'verified':consistent?'offset':'realigned',shift:consistent&&!keep&&!preserve?shift:0,experimental:true}};
}
