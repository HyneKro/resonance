import {timingOffset,exportLyricsfile} from './lyric-timing.js';
import {wordTimingCoverage} from './lyric-highlight.js';

export function mountLyricsControls({container,track,request,exportFile,importFile,onChange=()=>{}}){
 if(!container)return;
 const box=document.createElement('details');box.className='lyrics-tools';
 box.innerHTML='<summary>Lyrics timing</summary><p class="lyrics-help" data-word-timing></p><div class="lyrics-offset"><button type="button" data-earlier>Earlier \u22120.2s</button><output aria-live="polite">0.0s</output><button type="button" data-later>Later +0.2s</button><button type="button" data-zero>Reset offset</button></div><div class="lyrics-actions"><button type="button" data-restore>Restore original</button><button type="button" data-export>Export timed lyrics</button><button type="button" data-import>Import lyrics</button></div><p data-timing-status role="status"></p>';
 container.insertBefore(box,container.querySelector('[data-lyrics-text],.lyrics'));
 const credits=document.createElement('a');credits.href='/lyrics-credits.html';credits.target='_blank';credits.rel='noreferrer';credits.textContent='Lyrics sources & credits';credits.className='lyrics-help';box.append(credits);
 const q=s=>box.querySelector(s),status=q('[data-timing-status]');
 let state,offset=0,busy=false;
 const event=()=>document.dispatchEvent(new CustomEvent('resonance-lyrics-change',{detail:{id:track.id}}));
 const send=async(action,data={})=>request(action,{id:track.id,...data});
 const buttons=()=>[...box.querySelectorAll('button')];
 const render=value=>{
  state=value;offset=timingOffset(state.record?.offset);q('output').textContent=(offset>0?'+':'')+offset.toFixed(1)+'s';
  const coverage=wordTimingCoverage(state.record);
  q('[data-word-timing]').textContent=coverage.wordLines
   ?coverage.sweepLines?`Smooth word highlighting available on ${coverage.sweepLines} of ${coverage.lines} lines. Lines without word timestamps stay unfilled.`:'Word starts are available, but word lengths are missing. Words light up at their timestamps; a smooth sweep needs start and end times.'
   :coverage.lines?'Line timing only. Lyrics appear in time, but stay unfilled because word timestamps are unavailable.':'No word timestamps available. Text lyrics remain readable in song details.';
  q('[data-export]').disabled=!state.record?.lines?.length;
  q('[data-restore]').disabled=!state.improved&&!offset;
 };
 const act=fn=>async()=>{
  if(busy||!state)return;busy=true;buttons().forEach(b=>b.disabled=true);status.textContent='';
  try{await fn();}catch(e){status.textContent=e.message;}
  finally{busy=false;buttons().forEach(b=>b.disabled=false);if(state)render(state);}
 };
 const updateOffset=async value=>{render(await send('offset',{value:timingOffset(value)}));event();};
 q('[data-earlier]').onclick=act(()=>updateOffset(offset-.2));q('[data-later]').onclick=act(()=>updateOffset(offset+.2));q('[data-zero]').onclick=act(()=>updateOffset(0));
 q('[data-restore]').onclick=act(async()=>{render(await send('restore'));event();onChange(state.record);});
 q('[data-export]').onclick=act(async()=>exportFile?exportFile(exportLyricsfile(track,state.record)):downloadLyrics(track,state.record));
 q('[data-import]').onclick=act(async()=>{
  const text=await (importFile?importFile():chooseFile());if(!text)return;
  render(await send('import',{text}));event();onChange(state.record);status.textContent='Imported locally. Restore original is available.';
 });
 buttons().forEach(b=>b.disabled=true);
 void send('status').then(value=>{if(box.isConnected){buttons().forEach(b=>b.disabled=false);render(value);}}).catch(e=>status.textContent=e.message);
}
function downloadLyrics(track,record){const url=URL.createObjectURL(new Blob([exportLyricsfile(track,record)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(track.title||'lyrics').replace(/[<>:"/\\|?*]/g,'_').slice(0,100)+'.lyrics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function chooseFile(){return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.lrc,.json,.yaml,.yml,.txt';input.oncancel=()=>resolve(null);input.onchange=async()=>{const file=input.files?.[0];if(!file)return resolve(null);if(file.size>256000)return reject(Error('Choose a lyrics file smaller than 256 KB.'));try{resolve(await file.text());}catch(e){reject(e);}};input.click();});}
