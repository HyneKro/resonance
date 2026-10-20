import {timingOffset,exportLyricsfile,wordProgress} from './lyric-timing.js';
import {lyricLineAt} from './lyrics.js';

export function mountLyricsControls({container,track,request,exportFile,importFile,playhead=()=>null,onChange=()=>{}}){
 if(!container)return;
 const box=document.createElement('details');box.className='lyrics-tools';
 box.innerHTML='<summary>Timing & word highlighting</summary><p class="lyrics-help">Adjust this song, or check its words against the recording. Your original lyrics stay available.</p><div class="lyrics-offset"><button type="button" data-earlier>Earlier \u22120.2s</button><output aria-live="polite">0.0s</output><button type="button" data-later>Later +0.2s</button><button type="button" data-zero>Reset offset</button></div><div class="lyrics-actions"><button type="button" data-analyze>Check timing from audio</button><button type="button" data-cancel hidden>Cancel</button><button type="button" data-restore>Restore original</button><button type="button" data-export>Export timed lyrics</button><button type="button" data-import>Import lyrics</button></div><p data-local-note class="lyrics-help"></p><p data-timing-status role="status"></p><div data-proposal hidden><p data-proposal-info></p><button type="button" data-preview>Preview timings</button><button type="button" data-apply>Keep these timings</button><button type="button" data-discard>End preview</button></div>';
 container.insertBefore(box,container.querySelector('[data-lyrics-text],.lyrics'));
 const previewLine=document.createElement('p');previewLine.className='lyrics-preview-line';previewLine.hidden=true;box.querySelector('[data-proposal]').append(previewLine);
 const credits=document.createElement('a');credits.href='/lyrics-credits.html';credits.target='_blank';credits.rel='noreferrer';credits.textContent='Lyrics tool credits';credits.className='lyrics-help';box.append(credits);
 const q=s=>box.querySelector(s),status=q('[data-timing-status]');
 let state,offset=0,busy=false,preview=false,poll=null,generation=0;
 const event=()=>document.dispatchEvent(new CustomEvent('resonance-lyrics-change',{detail:{id:track.id}}));
 const send=async(action,data={})=>request(action,{id:track.id,...data});
 const buttons=()=>[...box.querySelectorAll('button')];
 const render=value=>{
  state=value;offset=timingOffset(state.record?.offset);q('output').textContent=(offset>0?'+':'')+offset.toFixed(1)+'s';
  q('[data-analyze]').hidden=!state.supported;q('[data-analyze]').textContent=state.installed?'Check timing from audio':'Download local tool \u00b7 200 MB';
  q('[data-local-note]').textContent=state.supported?'Optional CPU analysis, one song at a time. Audio stays on this PC. Uses up to two CPU threads and can take several minutes. Word timings are experimental; preview before keeping them.':'Word highlighting and timing adjustments run on this phone. Import PC-prepared lyrics to avoid heavy audio analysis here.';
  q('[data-analyze]').disabled=busy||state.job?.running||state.installed&&!state.record?.text;
  q('[data-cancel]').hidden=!state.job?.running;
  q('[data-export]').disabled=!state.record?.lines?.length;
  q('[data-restore]').disabled=!state.improved&&!offset;
  q('[data-proposal]').hidden=!state.proposal;
  if(state.proposal){const a=state.proposal.record.analysis;q('[data-proposal-info]').textContent=`Matched ${Math.round(a.coverage*100)}% of words \u00b7 ${a.matchedLines}/${a.totalLines} lines matched \u00b7 ${a.wordLines} with word highlighting. ${['verified','enriched'].includes(a.method)?'Existing line timings kept, including unmatched lines.':a.method==='offset'?'Recording offset: '+a.shift.toFixed(1)+'s.':'Line timings adjusted to this recording. Unmatched lines remain in the lyrics text.'}`;}
  if(state.job?.id===track.id)status.textContent=(state.job.running?Math.round((state.job.progress||0)*100)+'% \u00b7 ':'')+(state.job.message||'');
 };
 const refresh=async()=>{const token=++generation;const value=await send('status');if(token===generation&&box.isConnected)render(value);};
 const act=fn=>async()=>{if(busy)return;busy=true;buttons().forEach(b=>b.disabled=true);try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;if(state){buttons().forEach(b=>b.disabled=false);render({...state,job:state.job?.running?state.job:null});}}};
 const updateOffset=async value=>{render(await send('offset',{value:timingOffset(value)}));event();};
 q('[data-earlier]').onclick=act(()=>updateOffset(offset-.2));q('[data-later]').onclick=act(()=>updateOffset(offset+.2));q('[data-zero]').onclick=act(()=>updateOffset(0));
 q('[data-analyze]').onclick=act(async()=>{await send(state.installed?'analyze':'install');await refresh();});
 q('[data-cancel]').onclick=act(async()=>{await send('cancel');await refresh();});
 q('[data-restore]').onclick=act(async()=>{preview=false;document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:track.id,record:null}}));render(await send('restore'));event();onChange(state.record);});
 q('[data-apply]').onclick=act(async()=>{render(await send('apply',{proposalId:state.proposal.id}));preview=false;document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:track.id,record:null}}));event();onChange(state.record);});
 q('[data-preview]').onclick=()=>{preview=true;document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:track.id,record:state.proposal.record}}));status.textContent='Preview active while this panel is open. Play or seek this song, then choose Keep these timings.';};
 q('[data-discard]').onclick=()=>{preview=false;document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:track.id,record:null}}));status.textContent='Preview ended. Saved lyrics restored.';};
 q('[data-export]').onclick=act(async()=>exportFile?exportFile(exportLyricsfile(track,state.record)):downloadLyrics(track,state.record));
 q('[data-import]').onclick=act(async()=>{
  const text=await (importFile?importFile():chooseFile());if(!text)return;
  render(await send('import',{text}));event();onChange(state.record);status.textContent='Imported locally. Restore original is available.';
 });
 void refresh().catch(e=>status.textContent=e.message);
 poll=setInterval(()=>{if(!box.isConnected){clearInterval(poll);if(preview)document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:track.id,record:null}}));return;}if(!document.hidden&&!busy&&state?.job?.running)void refresh().catch(e=>status.textContent=e.message);},1500);
 let shown=-2,spans=[];const clock=setInterval(()=>{
  if(!box.isConnected){clearInterval(clock);return;}
  previewLine.hidden=!preview;if(!preview||document.hidden)return;const time=playhead(),lines=state?.proposal?.record.lines||[];
  if(time===null){previewLine.textContent='Play this song to preview its timing.';shown=-2;return;}
  const index=lyricLineAt(lines,time),cue=lines[index];
  if(index!==shown){shown=index;spans=[];previewLine.textContent=cue?.text||'\u2026';if(cue?.words){previewLine.replaceChildren();for(const w of cue.words){const span=document.createElement('span');span.className='lyric-word';span.textContent=w.text;previewLine.append(span);spans.push(span);}}}
  spans.forEach((s,i)=>s.style.setProperty('--word-fill',Math.round(wordProgress(cue.words[i],time)*100)+'%'));
 },100);
}
function downloadLyrics(track,record){const url=URL.createObjectURL(new Blob([exportLyricsfile(track,record)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(track.title||'lyrics').replace(/[<>:"/\\|?*]/g,'_').slice(0,100)+'.lyrics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function chooseFile(){return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.lrc,.json,.yaml,.yml,.txt';input.oncancel=()=>resolve(null);input.onchange=async()=>{const file=input.files?.[0];if(!file)return resolve(null);if(file.size>256000)return reject(Error('Choose a lyrics file smaller than 256 KB.'));try{resolve(await file.text());}catch(e){reject(e);}};input.click();});}
