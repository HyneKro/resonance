export const syncEntryKey=e=>`${e.sourceId}:${e.spotifyId||e.id}`;

export function syncEntryMarkup(e,local,source,index,{esc,duration}){
 const spotify=e.provider==='spotify',review=e.status==='review',panelId=`sync-review-${index}`;
 return `<div class="sync-entry" data-sync-key="${esc(syncEntryKey(e))}"><input type="checkbox" name="sync-item" aria-label="Download ${esc(e.title)}" value="${esc(e.sourceId+':'+e.id)}" ${e.status==='new'?'checked':''}><div class="sync-entry-copy"><b>${esc(e.title)}</b><small>${esc(e.channel)} · ${duration(e.duration)} · ${esc(source?.name||'Collection')}${review&&!spotify&&local?` · Possible match: ${esc(local.rawTitle||local.title)}`:''}</small>${spotify?`<select data-spotify-match="${esc(e.spotifyId)}" data-source-id="${esc(e.sourceId)}" aria-label="YouTube recording for ${esc(e.title)}">${(e.candidates||[]).map(c=>`<option value="${esc(c.id)}" ${e.id===c.id?'selected':''}>${esc(c.title)} · ${esc(c.channel)} · ${duration(c.duration)} (${c.score}% match)</option>`).join('')}</select><small><a href="https://open.spotify.com/track/${esc(e.spotifyId)}" target="_blank" rel="noreferrer">Spotify track ↗</a> · <a data-match-link href="https://www.youtube.com/watch?v=${esc(e.id)}" target="_blank" rel="noreferrer">Listen to YouTube match ↗</a></small>`:''}</div>${review?`<button type="button" class="chip sync-review-button" data-sync-review aria-expanded="false" aria-controls="${panelId}" aria-label="Review ${esc(e.title)}">Review</button><section id="${panelId}" class="sync-review-panel" hidden aria-label="Recording comparison"></section>`:'<span class="chip">New</span>'}</div>`;
}

export function syncComparisonMarkup(e,local,{esc,duration}){
 const spotify=e.provider==='spotify',candidate=e.candidates?.find(c=>c.id===e.id),onlineTitle=spotify?candidate?.title||e.matchedTitle||e.title:e.title;
 const onlineDuration=spotify?candidate?.duration||e.matchedDuration||0:e.duration;
 const delta=local?.duration&&onlineDuration?Math.round(onlineDuration-local.duration):null;
 return `<p class="fine-print">${spotify?'Compare the Spotify entry with the YouTube recording before selecting it.':'A similar title is already in your library. Compare the versions before downloading another file.'}</p><div class="sync-comparison"><article><small>${spotify?'Spotify entry':'Your local file'}</small><h3>${esc(spotify?e.title:local?.title||'Local match no longer available')}</h3><p>${esc(spotify?e.channel:local?.artist||local?.channel||'Unknown artist')}</p><p>${duration(spotify?e.duration:local?.duration)}${!spotify&&local?.format?' · '+esc(local.format).toUpperCase():''}</p>${!spotify&&local?.rawTitle?`<p class="fine-print">${esc(local.rawTitle)}</p>`:''}${!spotify&&local?.available?`<button class="text-button" data-play="${esc(local.id)}">Play local recording</button>`:''}</article><article><small>Proposed download · YouTube</small><h3>${esc(onlineTitle)}</h3><p>${esc(candidate?.channel||e.matchedChannel||e.channel)}</p><p>${duration(onlineDuration)}${delta!==null&&Math.abs(delta)>3?` · ${Math.abs(delta)} s ${delta>0?'longer':'shorter'}`:''}</p><a class="text-button" href="https://www.youtube.com/watch?v=${esc(e.id)}" target="_blank" rel="noreferrer">Listen on YouTube ↗</a></article></div><div class="sync-review-actions"><button class="secondary" data-sync-choice="skip">Leave unchecked</button><button class="primary" data-sync-choice="download">Select for download</button></div><p class="fine-print" data-review-decision role="status">Nothing downloads until you press Download selected.</p>`;
}

export function installSyncReview({entries,getTrack,esc,duration,root=document}){
 function refresh(row){
  const panel=row.querySelector('.sync-review-panel');if(!panel||panel.hidden)return;
  const entry=entries().find(e=>syncEntryKey(e)===row.dataset.syncKey);if(!entry)return;
  panel.innerHTML=syncComparisonMarkup(entry,getTrack(entry.trackId),{esc,duration});
 }
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-sync-review],[data-sync-choice]');if(!button)return;
  const row=button.closest('.sync-entry');if(!row)return;const panel=row.querySelector('.sync-review-panel');
  if(button.hasAttribute('data-sync-review')){
   const open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));button.textContent=open?'Close review':'Review';if(open)refresh(row);
  }else{
   const input=row.querySelector('input[name=sync-item]');input.checked=button.dataset.syncChoice==='download';input.dispatchEvent(new Event('change',{bubbles:true}));
   row.querySelector('[data-review-decision]').textContent=input.checked?'Selected. Use Download selected when you are ready.':'Left unchecked. This recording will not be downloaded.';
  }
 });
 return {refresh};
}
