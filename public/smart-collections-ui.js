import {COLLECTION_TEMPLATES,normalizeCollections,collectionTracks} from './smart-collections.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installSmartCollections({tracks,preferences,save,show,play}){
 let active=null;
 const definitions=()=>normalizeCollections(preferences().smartCollections);
 const matches=c=>collectionTracks(tracks(),c);
 function open(){
  active=null;const items=definitions();
  show('Smart collections',`<section class="collection-studio"><p class="menu-intro">Playlists that follow your rules. Songs appear and leave automatically as your library changes.</p><div class="collection-cards">${items.map(c=>`<article><div><h3>${esc(c.name)}</h3><p>${matches(c).length} songs · updates automatically</p></div><div class="toolbar"><button class="primary" data-smart-play="${esc(c.id)}" ${matches(c).length?'':'disabled'}>Play</button><button class="secondary" data-smart-edit="${esc(c.id)}">Edit rules</button></div></article>`).join('')||'<p>No collections yet. Start with an idea below, or create your own.</p>'}</div><h3>Start with an idea</h3><div class="source-actions">${COLLECTION_TEMPLATES.map(c=>`<button class="secondary" data-smart-template="${c.id}">${esc(c.name)}</button>`).join('')}<button class="primary" data-smart-new>Create a collection</button></div><p data-smart-message role="status"></p></section>`);
 }
 function edit(c){
  active=c;const r=c.rules;
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
  const b=e.target.closest('[data-smart-open],[data-smart-home],[data-smart-edit],[data-smart-play],[data-smart-template],[data-smart-new],[data-smart-preview-play],[data-smart-remove]');if(!b)return;
  void run(async()=>{
   if(b.matches('[data-smart-open],[data-smart-home]'))open();
   else if(b.hasAttribute('data-smart-new'))edit({name:'',rules:{},sort:'title'});
   else if(b.dataset.smartTemplate)edit({...COLLECTION_TEMPLATES.find(c=>c.id===b.dataset.smartTemplate),id:null});
   else if(b.dataset.smartEdit)edit(definitions().find(c=>c.id===b.dataset.smartEdit));
   else if(b.hasAttribute('data-smart-remove')){await save(definitions().filter(c=>c.id!==active.id));open();}
   else{const c=b.dataset.smartPlay?definitions().find(c=>c.id===b.dataset.smartPlay):draft(),ids=matches(c).map(t=>t.id);if(ids.length)await play(ids);}
  });
 });
 return {open};
}
