import {metadataComparison} from './metadata-review.js';
import {artistNames,hasArtist} from './artist-credits.js';
const key=s=>String(s||'').normalize('NFKC').toLowerCase().trim();
const genres=t=>new Set(key(t.genre).split(/[,;]+/).map(x=>x.trim()).filter(Boolean));
export function suggestions(track,tracks){
 const artist=key(track.artist),g=genres(track),same=[],similar=[];
 for(const t of tracks){if(t.id===track.id||!t.available)continue;if(artistNames(track).some(name=>hasArtist(t,name)))same.push(t);else{const matches=[...genres(t)].filter(x=>g.has(x));if(matches.length)similar.push({track:t,score:matches.length,reason:matches[0]});}}
 same.sort((a,b)=>(b.favorite?1:0)-(a.favorite?1:0)||(a.plays||0)-(b.plays||0)||a.title.localeCompare(b.title));similar.sort((a,b)=>b.score-a.score||(a.track.plays||0)-(b.track.plays||0)||a.track.title.localeCompare(b.track.title));
 return {same:same.slice(0,4),similar:similar.slice(0,5)};
}
export function songStory(track,tracks,{esc,art,icon}){
 const picks=suggestions(track,tracks),row=(t,reason)=>`<div class="suggestion-row"><button class="suggestion-play" data-play="${esc(t.id)}" aria-label="Play ${esc(t.title)}"><span class="suggestion-cover">${art(t)}</span><span><b>${esc(t.title)}</b><small>${esc(t.artist||t.channel||'Your collection')} · ${esc(reason)}</small></span>${icon('play')}</button><button class="icon-button" data-queue-add="${esc(t.id)}" aria-label="Queue ${esc(t.title)}">${icon('plus')}</button></div>`;
 return `<section class="song-story"><div class="song-story-heading"><h3>Character</h3><p data-song-character>Reading its locally saved character…</p></div><details class="song-lyrics" open><summary>Lyrics <span data-lyrics-source></span></summary><div data-lyrics-text aria-live="polite">Looking for lyrics…</div></details><section class="song-suggestions"><h3>Keep listening</h3><p class="fine-print">Suggestions from your local library</p>${picks.same.length?`<h4>More from ${esc(track.artist)}</h4>${picks.same.map(t=>row(t,'Same artist')).join('')}`:''}${picks.similar.length?`<h4>A similar sound</h4>${picks.similar.map(p=>row(p.track,p.reason)).join('')}`:''}${!picks.same.length&&!picks.similar.length?'<p class="fine-print">No matching tracks in this library yet. Adding more music and genre details will help.</p>':''}</section></section>`;
}
export function searchPanel(track,esc){return `<section class="song-search"><h3>Review recording details</h3><p class="fine-print">Run a fresh search for recording details and lyrics. Preview the versions, then choose what fits. Your choice is saved locally.</p><button class="text-button" type="button" data-metadata-undo>Undo last metadata change</button><form data-song-search><div class="field-grid"><label class="field">Artist<input name="artist" value="${esc(track.artist||'')}" autocomplete="off" aria-label="Search artist"></label><label class="field">Song title<input name="title" value="${esc(track.title||'')}" required autocomplete="off" aria-label="Search song title"></label></div><button class="secondary" type="submit">Search online again</button></form><p data-search-status class="fine-print" role="status" aria-live="polite"></p><div data-search-results></div></section>`;}
export function fillSongStory(id,{api,container,track={},onSaved=()=>{},esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}){
 let lyricsChosen=false;
 const lyrics=container.querySelector('[data-lyrics-text]'),source=container.querySelector('[data-lyrics-source]'),character=container.querySelector('[data-song-character]');
 void api('/api/track-lyrics?id='+encodeURIComponent(id)).then(p=>{if(lyricsChosen)return;lyrics.textContent=p.instrumental?'Instrumental · no vocals':p.text||p.message||'No lyrics available yet.';source.replaceChildren();if(p.source==='LRCLIB'&&/^https:\/\/lrclib\.net\/api\/get\/\d+$/.test(p.url||'')){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noreferrer';a.textContent='LRCLIB · saved locally';source.append(a);}else source.textContent=p.source||'';}).catch(()=>{if(!lyricsChosen)lyrics.textContent='Lyrics are unavailable right now.';});
 void api('/api/visual-identity?id='+encodeURIComponent(id)).then(p=>{character.textContent=`${p.label} · ${p.dominant} · ${p.basis.join(' · ')}`;}).catch(()=>{character.textContent='Character is being prepared.';});
 const form=container.querySelector('[data-song-search]'),status=container.querySelector('[data-search-status]'),results=container.querySelector('[data-search-results]');
 if(!form)return;
 container.querySelector('[data-metadata-undo]').onclick=async()=>{try{await api('/api/metadata/undo',{id});await onSaved();}catch(e){status.textContent=e.message;}};
 let current=null,busy=false;
 const length=n=>n?Math.floor(n/60)+':'+String(Math.round(n%60)).padStart(2,'0'):'Length unknown';
 const result=(c,kind,i)=>`<article class="song-match"><div><b>${esc(c.title)}</b><p>${esc(c.artist)} · ${esc(c.album||'Album unknown')}</p><small>${esc(length(c.duration))}${c.date?' · '+esc(c.date):''} · ${c.confidence}% similarity · ${kind==='recording'?'MusicBrainz':'LRCLIB'}</small></div>${kind==='recording'?metadataComparison(track,c,esc):''}${kind==='lyrics'?`<details><summary>Preview ${c.instrumental?'instrumental label':'lyrics'}</summary><pre>${esc(c.instrumental?'Instrumental · no vocals':c.text)}</pre></details>`:''}<button class="secondary" data-search-choice="${kind}:${i}">${kind==='recording'?'Use these details':'Use these lyrics'}</button></article>`;
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;current=null;results.replaceChildren();status.textContent='Searching MusicBrainz and LRCLIB…';
  try{const data=Object.fromEntries(new FormData(form)),found=await api('/api/track-search',{id,...data});if(!form.isConnected)return;current=found;
   status.textContent=`${found.recordings.length} recording matches · ${found.lyrics.length} lyric matches. ${found.errors.join(' · ')}`;
   results.innerHTML=(found.recordings.length?'<h4>Recording details</h4>'+found.recordings.map((c,i)=>result(c,'recording',i)).join(''):'<p class="fine-print">No recording matches. Try a shorter artist name or remove upload decorations from the title.</p>')+(found.lyrics.length?'<h4>Lyrics</h4>'+found.lyrics.map((c,i)=>result(c,'lyrics',i)).join(''):'<p class="fine-print">No lyrics found in the catalogue. Try another spelling; remixes and live versions may not have published lyrics.</p>');
  }catch(error){if(status.isConnected)status.textContent=error.message;}finally{busy=false;if(button.isConnected)button.disabled=false;}
 });
 results.addEventListener('click',async e=>{
  const button=e.target.closest('[data-search-choice]');if(!button||busy||!current)return;
  const [kind,index]=button.dataset.searchChoice.split(':'),candidate=current[kind==='recording'?'recordings':'lyrics'][Number(index)];if(!candidate)return;
  busy=true;results.querySelectorAll('button').forEach(b=>b.disabled=true);form.querySelector('button').disabled=true;status.textContent='Saving your choice locally…';
  try{const fields=kind==='recording'?[...button.closest('.song-match').querySelectorAll('[data-match-field]:checked')].map(e=>e.dataset.matchField):undefined;const value=await api('/api/track-search/apply',{id,request:current.request,kind,candidateId:candidate.id,fields});if(!status.isConnected)return;
   if(kind==='lyrics'){lyricsChosen=true;lyrics.textContent=value.instrumental?'Instrumental · no vocals':value.text;source.textContent='LRCLIB · your choice · saved locally';status.textContent='Your lyric choice is saved. It is available offline and will not be replaced by automatic matching.';}
   else{status.textContent='Recording details saved locally.';await onSaved();}
  }catch(error){if(status.isConnected)status.textContent=error.message;}finally{busy=false;if(form.isConnected){results.querySelectorAll('button').forEach(b=>b.disabled=false);form.querySelector('button').disabled=false;}}
 });
}
