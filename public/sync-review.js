export const syncEntryKey=e=>`${e.sourceId}:${e.spotifyId||e.id}`;

export function syncEntryMarkup(e,local,source,index,{esc,duration}){
 const spotify=e.provider==='spotify',review=e.status==='review',panelId=`sync-review-${index}`;
 return `<div class="sync-entry" data-sync-key="${esc(syncEntryKey(e))}"><input type="checkbox" name="sync-item" aria-label="Download ${esc(e.title)}" value="${esc(e.sourceId+':'+e.id)}" ${e.status==='new'?'checked':''} ${e.status==='unavailable'?'disabled':''}><div class="sync-entry-copy"><b>${esc(e.title)}</b><small>${esc(e.channel)} · ${duration(e.duration)} · ${esc(source?.name||'Collection')}${review&&!spotify&&!e.alternativeSelected&&local?` · Possible match: ${esc(local.rawTitle||local.title)}`:''}</small>${e.downloadError?`<small class="error">${esc(e.downloadError)}</small>`:''}<button type="button" class="text-button" data-sync-alternative="${esc(e.id)}" data-source-id="${esc(e.sourceId)}">Find another upload</button>${spotify?`<select data-spotify-match="${esc(e.spotifyId)}" data-source-id="${esc(e.sourceId)}" aria-label="YouTube recording for ${esc(e.title)}">${(e.candidates||[]).map(c=>`<option value="${esc(c.id)}" ${e.id===c.id?'selected':''}>${esc(c.title)} · ${esc(c.channel)} · ${duration(c.duration)} (${c.score}% match)</option>`).join('')}</select><small><a href="https://open.spotify.com/track/${esc(e.spotifyId)}" target="_blank" rel="noreferrer">Spotify track ↗</a> · <a data-match-link href="https://www.youtube.com/watch?v=${esc(e.id)}" target="_blank" rel="noreferrer">Listen to YouTube match ↗</a></small>`:''}</div>${review?`<button type="button" class="chip sync-review-button" data-sync-review aria-expanded="false" aria-controls="${panelId}" aria-label="Review ${esc(e.title)}">Review</button><section id="${panelId}" class="sync-review-panel" hidden aria-label="Recording comparison"></section>`:`<span class="chip">${e.status==='unavailable'?'Unavailable':'New'}</span>`}</div>`;
}

export function syncComparisonMarkup(e,local,{esc,duration}){
 const alternative=e.alternativeSelected,spotify=e.provider==='spotify',reference=spotify||alternative,candidate=e.candidates?.find(c=>c.id===e.id),onlineTitle=reference?e.alternativeTitle||candidate?.title||e.matchedTitle||e.title:e.title;
 const onlineDuration=reference?e.matchedDuration||candidate?.duration||0:e.duration;
 const referenceDuration=reference?e.duration:local?.duration;
 const delta=referenceDuration&&onlineDuration?Math.round(onlineDuration-referenceDuration):null;
 return `<p class="fine-print">${alternative?'You selected another upload. Compare it with the playlist entry before downloading.':spotify?'Compare the Spotify entry with the YouTube recording before selecting it.':'A similar title is already in your library. Compare the versions before downloading another file.'}</p><div class="sync-comparison"><article><small>${alternative?'Original playlist entry':spotify?'Spotify entry':'Your local file'}</small><h3>${esc(reference?e.title:local?.title||'Local match no longer available')}</h3><p>${esc(reference?e.channel:local?.artist||local?.channel||'Unknown artist')}</p><p>${duration(reference?e.duration:local?.duration)}${!reference&&local?.format?' · '+esc(local.format).toUpperCase():''}</p>${!reference&&local?.rawTitle?`<p class="fine-print">${esc(local.rawTitle)}</p>`:''}${!reference&&local?.available?`<button class="text-button" data-play="${esc(local.id)}">Play local recording</button>`:''}</article><article><small>Proposed download · audio only</small><h3>${esc(onlineTitle)}</h3><p>${esc(candidate?.channel||e.matchedChannel||e.channel)}</p><p>${duration(onlineDuration)}${delta!==null&&Math.abs(delta)>3?` · ${Math.abs(delta)} s ${delta>0?'longer':'shorter'}`:''}</p><a class="text-button" href="https://www.youtube.com/watch?v=${esc(e.id)}" target="_blank" rel="noreferrer">Listen on YouTube ↗</a></article></div><div class="sync-review-actions"><button class="secondary" data-sync-choice="skip">Leave unchecked</button><button class="primary" data-sync-choice="download">Select for download</button></div><p class="fine-print" data-review-decision role="status">Nothing downloads until you press Download selected.</p>`;
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
