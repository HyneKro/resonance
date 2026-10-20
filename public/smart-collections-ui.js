import {COLLECTION_TEMPLATES,normalizeCollections,collectionTracks,libraryCollections} from './smart-collections.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installSmartCollections({tracks,preferences,save,show,play}){
 let active=null,view='home',selected=null,limit=60;
 const definitions=()=>normalizeCollections(preferences().smartCollections);
 const matches=c=>collectionTracks(tracks(),c);
 function open(){
  active=null;view='home';const items=libraryCollections(definitions());
  show('Smart collections',`<section class="collection-studio"><p class="menu-intro">Already gathered for you. These collections follow your library as you add music and listen.</p><div class="collection-cards">${items.map(c=>{const ts=matches(c);return `<article><button class="collection-browse" data-smart-view="${esc(c.id)}"><span class="collection-kicker">${c.builtIn?'MADE FOR YOUR LIBRARY':'YOUR RULES'}</span><h3>${esc(c.name)}</h3><p>${ts.length} songs · updates automatically</p><span class="collection-sample">${esc(ts.slice(0,3).map(t=>t.title).join(' / ')||'Matching songs will appear here as your library grows.')}</span></button><div class="toolbar"><button class="primary" data-smart-play="${esc(c.id)}" ${ts.length?'':'disabled'}>Play</button><button class="secondary" data-smart-view="${esc(c.id)}">Browse songs</button>${!c.builtIn?`<button class="text-button" data-smart-edit="${esc(c.id)}">Edit rules</button>`:''}</div></article>`;}).join('')}</div><details class="collection-create"><summary>Make your own collection</summary><div class="source-actions">${COLLECTION_TEMPLATES.map(c=>`<button class="secondary" data-smart-template="${c.id}">${esc(c.name)}</button>`).join('')}<button class="primary" data-smart-new>Create a collection</button></div></details><p data-smart-message role="status"></p></section>`);
 }
 function browse(id,more=false){
  const c=libraryCollections(definitions()).find(c=>c.id===id);if(!c)return open();
  if(!more)limit=60;view='songs';selected=id;const ts=matches(c);
  show(c.name,`<section class="collection-studio"><div class="source-actions"><button class="secondary" data-smart-home>← Smart collections</button><button class="primary" data-smart-play="${esc(c.id)}" ${ts.length?'':'disabled'}>Play all · ${ts.length}</button></div><p class="menu-intro">${c.builtIn?({unheard:'Songs you have not played yet.',rediscover:'Favorites you have not played in the last 30 days.',fresh:'Music added in the last 30 days.',short:'Songs up to four minutes long.'}[id.replace('builtin-','')]):'Songs matching your saved rules.'}</p><ol class="collection-song-list">${ts.slice(0,limit).map((t,i)=>`<li><button data-smart-track="${esc(t.id)}"><span class="collection-number">${String(i+1).padStart(2,'0')}</span><span><b>${esc(t.title)}</b><small>${esc(t.artist||t.channel||'Artist to discover')}</small></span><span aria-hidden="true">▷</span></button></li>`).join('')}</ol>${ts.length>limit?'<button class="secondary" data-smart-more>Show more songs</button>':!ts.length?'<p>Nothing matches yet. This collection fills automatically as you add music and listen.</p>':''}<p data-smart-message role="status"></p></section>`);
 }
 function edit(c){
  active=c;view='edit';const r=c.rules;
  const field=(key,label,type='text',value=r[key]||'')=>`<label class="field">${label}<input name="${key}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" max="'+(key==='maxMinutes'?1440:3650)+'" step="any"':'maxlength="120"'}></label>`;
  show(c.id?'Edit collection':'Create collection',`<form class="collection-studio" data-smart-form>
   ${field('name','Collection name','text',c.name)}<p>Match all the rules you choose. Leave a field empty to include everything.</p>
   <div class="field-grid">${field('genre','Genre contains')}${field('artist','Artist contains')}${field('query','Song, album or keyword')}${field('maxMinutes','Maximum length · minutes','number')}${field('addedDays','Added in the last … days','number')}${field('notPlayedDays','Not played for … days','number')}</div>
   <div class="source-actions"><label><input name="favorite" type="checkbox" ${r.favorite?'checked':''}> Favorites only</label><label><input name="unplayed" type="checkbox" ${r.unplayed?'checked':''}> Never played</label></div>
   <label class="field">Order<select name="sort">${[['title','Song title'],['added','Newest additions'],['oldest','Least recently played'],['plays','Most played']].map(([v,l])=>`<option value="${v}" ${c.sort===v?'selected':''}>${l}</option>`).join('')}</select></label>
   <div class="collection-actions"><button class="primary" type="submit">Save collection</button><button class="secondary" type="button" data-smart-preview-play>Play preview</button><button class="text-button" type="button" data-smart-home>Back to collections</button>${c.id?'<button class="text-button" type="button" data-smart-remove>Remove collection</button>':''}</div>
   <p data-smart-message role="status"></p><div data-smart-preview></div></form>`);
  const form=document.querySelector('[data-smart-form]');form.elements.name.required=true;
  form.oninput=preview;form.onchange=preview;
  form.onsubmit=async e=>{e.preventDefault();await run(async()=>{const c=draft(),items=definitions(),index=items.findIndex(x=>x.id===c.id);if(index<0&&items.length>=50)throw Error('You can save up to 50 smart collections.');if(index<0)items.push(c);else items[index]=c;await save(items);open();});};preview();
 }
 function draft(){
  const form=document.querySelector('[data-smart-form]'),data=Object.fromEntries(new FormData(form)),rules={};
  for(const k of ['genre','artist','query'])rules[k]=data[k];
  for(const k of ['maxMinutes','addedDays','notPlayedDays'])rules[k]=Number(data[k]);
  for(const k of ['favorite','unplayed'])rules[k]=data[k]==='on';
  return normalizeCollections([{id:active.id||'collection-'+crypto.randomUUID(),name:data.name,rules,sort:data.sort}])[0];
 }
 function preview(){
  const ts=matches(draft()),box=document.querySelector('[data-smart-preview]');box.innerHTML=`<h3>${ts.length} matching songs</h3><ol class="collection-preview">${ts.slice(0,40).map(t=>`<li><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></li>`).join('')}</ol>${ts.length>40?'<p>Showing the first 40. Playback includes all matches.</p>':!ts.length?'<p>Nothing matches yet. Relax a rule, or save this collection for future additions.</p>':''}`;document.querySelector('[data-smart-preview-play]').disabled=!ts.length;
 }
 async function run(fn){try{await fn();}catch(e){const n=document.querySelector('[data-smart-message]');if(n)n.textContent=e.message;}}
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-smart-open],[data-smart-home],[data-smart-view],[data-smart-track],[data-smart-more],[data-smart-edit],[data-smart-play],[data-smart-template],[data-smart-new],[data-smart-preview-play],[data-smart-remove]');if(!b)return;
  void run(async()=>{
   if(b.matches('[data-smart-open],[data-smart-home]'))open();
   else if(b.dataset.smartView)browse(b.dataset.smartView);
   else if(b.hasAttribute('data-smart-more')){limit+=60;browse(selected,true);}
   else if(b.dataset.smartTrack){const c=libraryCollections(definitions()).find(c=>c.id===selected),ids=matches(c).map(t=>t.id),index=ids.indexOf(b.dataset.smartTrack);if(index>=0)await play([...ids.slice(index),...ids.slice(0,index)]);}
   else if(b.hasAttribute('data-smart-new'))edit({name:'',rules:{},sort:'title'});
   else if(b.dataset.smartTemplate)edit({...COLLECTION_TEMPLATES.find(c=>c.id===b.dataset.smartTemplate),id:null});
   else if(b.dataset.smartEdit)edit(definitions().find(c=>c.id===b.dataset.smartEdit));
   else if(b.hasAttribute('data-smart-remove')){await save(definitions().filter(c=>c.id!==active.id));open();}
   else{const c=b.dataset.smartPlay?libraryCollections(definitions()).find(c=>c.id===b.dataset.smartPlay):draft(),ids=matches(c).map(t=>t.id);if(ids.length)await play(ids);}
  });
 });
 return {open,refresh(){if(view==='home')open();else if(view==='songs')browse(selected,true);}};
}
