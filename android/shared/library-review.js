import {libraryInsights,artistExplanation,genreExplanation} from './library-insights.js';
import {metadataLocked} from './metadata-locks.js';
import {artistNames} from './artist-credits.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=n=>n>0?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'Length unknown';
const searchable=t=>[t.title,t.rawTitle,t.artist,t.channel,t.genre,...artistNames(t)].join(' ').normalize('NFKC').toLocaleLowerCase();
export function reviewShell(){return `<section class="library-understanding"><p class="review-summary"></p><nav class="review-filters" aria-label="Library review filters"></nav><label class="field review-search">Find a song, artist or genre<input type="search" data-review-search placeholder="Search your collection" autocomplete="off"></label><p class="review-status" role="status" aria-live="polite"></p><div class="review-results"></div><button class="secondary review-more" hidden>Show more</button></section>`;}
export function mountLibraryReview(container,{getTracks,save,undo,research,details,play}){
 const root=container.querySelector('.library-understanding');let filter='all',query='',limit=30,busy=false,editor=null,undoneId='',index=libraryInsights(getTracks());
 root.dataset.resumePanel='';root.addEventListener('panelresume',()=>{if(!editor&&!busy){const scroller=root.closest('.dialog-body')||container,top=scroller.scrollTop;render();scroller.scrollTop=top;}});
 const summary=root.querySelector('.review-summary'),filters=root.querySelector('.review-filters'),results=root.querySelector('.review-results'),status=root.querySelector('.review-status'),more=root.querySelector('.review-more');
 const button=(action,id,label)=>`<button type="button" class="secondary" data-review-${action}="${esc(id)}">${label}</button>`;
 function evidence(t){const a=artistExplanation(t),g=genreExplanation(t);return `<div class="review-evidence"><p><strong>${esc(a.label)}</strong> · ${esc(a.text)}</p>${t.channel?`<p>Uploaded by <b>${esc(t.channel)}</b></p>`:''}<p><strong>${esc(g.label)}</strong> · ${esc(g.text)}</p>${(t.genreEvidence||[]).slice(0,6).map(e=>`<p>${esc(e.name)} · ${esc(e.source)}${e.scope==='artist'?' · estimate':''}${Number.isFinite(e.support)?' · '+e.support+' supporting songs':''}</p>`).join('')}${t.genreError?`<p>Last lookup: ${esc(t.genreError)}</p>`:''}</div>`;}
 function row(t){const a=artistExplanation(t),g=genreExplanation(t),reasons=[...(a.review?[a.label]:[]),...(g.review?[g.label]:[]),...(!t.album&&!metadataLocked(t,'album')?['Album missing']:[]),...(!t.date&&!metadataLocked(t,'date')?['Release date missing']:[]),...(t.metadataStatus==='review'?['Recording match needs review']:[])];return `<article class="review-song" data-review-id="${esc(t.id)}"><div class="review-song-heading"><div><h3>${esc(t.title||t.rawTitle||'Untitled')}</h3><p>${esc(artistNames(t).join(' · ')||'Artist unknown')}</p><small>${g.kind==='estimate'?'≈ ':''}${esc(t.genre||'No genre yet')} · ${time(t.duration)}${t.codec?' · '+esc(t.codec):''}</small></div>${button('play',t.id,'Listen')}</div>${reasons.length?`<p class="review-needs">${esc(reasons.join(' · '))}</p>`:''}<details class="review-why"><summary>Why these details?</summary>${evidence(t)}</details><div class="review-actions">${button('artist',t.id,'Edit artists')}${button('genre',t.id,'Edit genre')}${button('research',t.id,'Research genre')}${button('details',t.id,'All details')}</div><div class="review-editor"></div></article>`;}
 function render(){
  index=libraryInsights(getTracks());summary.textContent=`${index.tracks.length.toLocaleString()} songs · ${index.missing.toLocaleString()} without a genre · ${index.estimates.toLocaleString()} artist-level estimates. Your corrections stay saved. Online research uses song and artist names; audio stays on your device.`;
  filters.innerHTML=[['all','To review'],['artists','Artists'],['genres','Genres'],['versions','Versions & copies']].map(([id,label])=>`<button type="button" class="secondary" data-review-filter="${id}" aria-pressed="${filter===id}">${label} <span>${index.counts[id]}</span></button>`).join('');
  const match=t=>searchable(t).includes(query.normalize('NFKC').toLocaleLowerCase());
  const rows=filter==='versions'?index.groups.filter(g=>g.tracks.some(match)):index.tracks.filter(t=>match(t)&&(filter==='all'?index.issues.get(t.id).length:index.issues.get(t.id).includes(filter)));
  results.innerHTML=rows.slice(0,limit).map(value=>filter==='versions'?`<section class="review-group"><h3>${esc(value.label)}</h3><p>${esc(value.reason)}</p>${value.tracks.map(row).join('')}</section>`:row(value)).join('')||'<p class="review-empty">'+(query?'No matches for this search.':'Nothing needs attention here.')+'</p>';
  more.hidden=rows.length<=limit;more.textContent=`Show more · ${Math.min(limit,rows.length)} of ${rows.length}`;editor=null;
 }
 function edit(t,field){
  // Keep only one open editor without repainting the list or moving its scroll.
  if(editor)editor.replaceChildren();editor=[...results.querySelectorAll('[data-review-id]')].find(e=>e.dataset.reviewId===t.id).querySelector('.review-editor');
  editor.innerHTML=`<form data-review-edit="${esc(t.id)}" data-review-field="${field}"><label class="field">${field==='artist'?'Artists · separate performers with a semicolon':'Genre · separate genres with a comma'}<input name="value" maxlength="400" value="${esc(field==='artist'?artistNames(t).join('; '):t[field])}"></label><p class="fine-print">${field==='artist'?'Keep a band name together, including any & or comma in its name.':'An empty value is allowed if you prefer no genre label.'} Only this field will be changed and protected.</p><div class="review-actions"><button type="submit" class="primary">Save this choice</button><button type="button" class="secondary" data-review-cancel>Cancel</button></div></form>`;
  editor.querySelector('input').focus({preventScroll:true});
 }
 root.querySelector('[data-review-search]').oninput=e=>{if(busy)return;query=e.target.value.trim();limit=30;render();};
 more.onclick=()=>{if(!busy){limit+=30;render();}};
 const update=track=>{const found=getTracks().find(t=>t.id===track.id);if(found)Object.assign(found,track);};
 async function act(fn,message){if(busy)return;busy=true;root.setAttribute('aria-busy','true');root.querySelectorAll('button,input').forEach(e=>e.disabled=true);status.textContent=message;try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;root.removeAttribute('aria-busy');root.querySelectorAll('button,input').forEach(e=>e.disabled=false);}}
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!root.contains(b)||busy)return;
  if(b.hasAttribute('data-review-filter')){filter=b.dataset.reviewFilter;limit=30;status.textContent='';render();return;}
  if(b.hasAttribute('data-review-cancel')){editor?.replaceChildren();editor=null;return;}
  const action=['artist','genre','details','play','research'].find(k=>b.hasAttribute('data-review-'+k));
  if(action){const id=b.getAttribute('data-review-'+action),t=getTracks().find(t=>t.id===id);if(!t)return;
   if(action==='artist'||action==='genre')return edit(t,action);
   if(action==='details')return details(id);
   if(action==='play')return void act(()=>play(id),'Starting playback…');
   return void act(async()=>{update(await research(id));if(!root.isConnected)return;render();status.textContent=genreExplanation(getTracks().find(t=>t.id===id)).text;},'Researching this recording. Results stay on this device…');
  }
  if(b.hasAttribute('data-review-undo')&&undoneId)void act(async()=>{update(await undo(undoneId));undoneId='';render();status.textContent='Your previous details have been restored.';},'Restoring your previous choice…');
 });
 root.addEventListener('submit',e=>{const form=e.target.closest('[data-review-edit]');if(!form)return;e.preventDefault();const id=form.dataset.reviewEdit,field=form.dataset.reviewField,raw=new FormData(form).get('value').trim(),value=field==='artist'?raw.split(';').map(s=>s.trim()).filter(Boolean).join('; '):raw;void act(async()=>{
  update(await save({id,[field]:value,confirmFields:[field],...(field==='artist'?{artistCredits:value.split(';').map(s=>s.trim()).filter(Boolean)}:{})}));undoneId=id;if(!root.isConnected)return;const scroller=root.closest('.dialog-body')||container,top=scroller.scrollTop;render();scroller.scrollTop=top;status.innerHTML='Choice saved and protected. '+button('undo',id,'Undo');
 },'Saving your choice…');});
 render();return {refresh:render};
}
