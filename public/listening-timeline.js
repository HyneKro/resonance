import {playbackRange} from './song-analysis.js';
const stamp=n=>{const seconds=Math.max(0,Math.round(n*10)/10),whole=Math.floor(seconds);return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0')+(seconds%1?'.'+Math.round(seconds%1*10):'');};
export function skippedEdges(duration,edit,profile,enabled){
 duration=Number.isFinite(duration)&&duration>0?duration:profile?.duration||0;
 const range=playbackRange(duration,edit,profile,enabled),segments=[];
 if(duration>0){if(range.start>.15)segments.push({start:0,end:range.start});if(range.end<duration-.15)segments.push({start:range.end,end:duration});}
 const reason=edit?.enabled?'Listening edit':'Silent edges';
 return {duration,segments,label:segments.length?reason+' · skipping '+segments.map(s=>stamp(s.start)+'–'+stamp(s.end)).join(' & '):''};
}
// Decorations never intercept a seek or add another scroll region. Keep the
// original file's time scale so the marked portions remain easy to understand.
export function installListeningTimeline(input){
 const shell=document.createElement('div');shell.className='seek-shell';input.before(shell);shell.append(input);
 const marks=document.createElement('span');marks.className='seek-cuts';marks.setAttribute('aria-hidden','true');shell.append(marks);
 const note=document.createElement('small');note.className='seek-cut-note';note.id=input.id+'-cuts';note.hidden=true;shell.append(note);input.setAttribute('aria-describedby',note.id);let previous='';
 return ({duration,edit,profile,enabled})=>{
  const data=skippedEdges(duration,edit,profile,enabled),key=JSON.stringify(data);if(key===previous)return;previous=key;
  note.textContent=data.label;note.hidden=!data.segments.length;shell.classList.toggle('has-cuts',!!data.segments.length);marks.replaceChildren();
  for(const segment of data.segments){const mark=document.createElement('i');mark.style.left=segment.start/data.duration*100+'%';mark.style.width=(segment.end-segment.start)/data.duration*100+'%';marks.append(mark);}
 };
}
