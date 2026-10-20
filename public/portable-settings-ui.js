import {exportPortable,validatePortable,planPortable,recordKey,playlistLink} from './portable-settings.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installPortableSettings({show,snapshot,store,apply,savePreferences,refresh,readFile,writeFile,connect}){
 let file=null,busy=false,lastRetry='',opening=0;
 async function open(message=''){
  const epoch=++opening,s=await snapshot();if(epoch!==opening)return;
  const known=new Set(s.sources.map(playlistLink).filter(Boolean).map(x=>x.url)),links=(s.links||[]).filter(l=>!known.has(l.url));
  show('Take your setup with you',`<section class="collection-studio"><p class="menu-intro">A small settings file for your other computer or phone.</p><p>Includes visual and playback preferences, smart collections, online playlist links, favorites, manual song details, listening cuts and lyric offsets. Audio, covers, account details and device paths stay here. Display performance and device audio-sync settings stay local.</p><p>Keep this file private: song names and your playlist links are included.</p><div class="collection-actions"><button class="primary" data-transfer-export>Export settings</button><button class="secondary" data-transfer-import>Import settings</button></div><p data-transfer-status role="status">${esc(message)}</p><h3>Waiting for recordings</h3><p>${s.pending.length} saved song edits waiting for a unique matching recording. Existing edits on this device are protected. Matching also runs when your library changes.</p><button class="secondary" data-transfer-retry>Check matches now</button>${links.length?`<h3>Playlists to reconnect</h3><p>Choose where to save music on this device, then use Playlist downloads to resync.</p><div class="collection-cards">${links.map((l,i)=>`<article><h3>${esc(l.name)}</h3><p>${esc(l.type)}</p><button class="secondary" data-transfer-connect="${i}">Connect playlist</button></article>`).join('')}</div>`:''}</section>`);
  document.querySelectorAll('[data-transfer-connect]').forEach(b=>b.onclick=()=>connect(links[Number(b.dataset.transferConnect)]));
 }
 async function preview(){
  const s=await snapshot(),plan=planPortable(file,s.tracks);
  show('Review settings import',`<section class="collection-studio"><p>No changes have been made yet.</p><ul><li>${plan.ready.length} matching songs ready to update</li><li>${plan.identical} already identical</li><li>${plan.pending.length} unmatched or ambiguous recordings kept for later</li><li>${plan.conflicts.length} songs with existing edits protected</li><li>${file.sources.length} playlist links to merge</li></ul><label class="field"><span><input type="checkbox" data-transfer-prefs checked> Import preferences and smart collections</span></label><label class="field"><span><input type="checkbox" data-transfer-replace> Replace conflicting song edits on this device</span></label><p>Unrelated songs and playlists are kept. No audio is downloaded or removed. Reconnect imported playlist links after this step.</p><div class="collection-actions"><button class="primary" data-transfer-apply>Apply import</button><button class="secondary" data-transfer-cancel>Cancel</button></div><p data-transfer-status role="status"></p></section>`);
 }
 async function merge(bundle,{prefs=false,replace=false}={}){
  const s=await snapshot(),pending=new Map((s.pending||[]).map(r=>[recordKey(r),r]));for(const r of bundle.songs)pending.set(recordKey(r),r);
  const sources=[...new Map([...(s.links||[]),...bundle.sources].map(l=>[l.url,l])).values()];
  const all={...bundle,songs:[...pending.values()]},plan=planPortable(all,s.tracks,{replace});
  // Save pending work first. A failed operation can be retried after restarting.
  await store({songs:all.songs,sources});
  const result=await apply({...all,songs:plan.ready.map(x=>x.record)},replace);
  if(prefs){
   const old=s.preferences.smartCollections||[],incoming=bundle.preferences.smartCollections;
   await savePreferences({...bundle.preferences,...(incoming?{smartCollections:[...new Map([...old,...incoming].map(c=>[c.id,c])).values()].slice(0,50)}:{})});
  }
  await store({songs:[...plan.pending,...plan.conflicts],sources});await refresh();
  return `${result.applied||0} song edits applied. ${plan.identical} already matched. ${plan.pending.length+plan.conflicts.length} kept for later.`;
 }
 async function run(fn){
  if(busy)return;busy=true;const buttons=[...document.querySelectorAll('[data-transfer-export],[data-transfer-import],[data-transfer-apply],[data-transfer-retry]')];buttons.forEach(b=>b.disabled=true);
  try{await fn();}catch(e){const n=document.querySelector('[data-transfer-status]');if(n)n.textContent=e.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-settings-page="transfer"],[data-transfer-export],[data-transfer-import],[data-transfer-apply],[data-transfer-cancel],[data-transfer-retry]');if(!b)return;
  void run(async()=>{
   if(b.dataset.settingsPage==='transfer'||b.hasAttribute('data-transfer-cancel')){file=null;await open();}
   else if(b.hasAttribute('data-transfer-export')){const text=JSON.stringify(exportPortable(await snapshot()),null,2);if(new TextEncoder().encode(text).length>8_000_000)throw Error('This export exceeds the 8 MB settings-file limit.');await writeFile(text);const n=document.querySelector('[data-transfer-status]');if(n)n.textContent='Export prepared. Keep the file somewhere private.';}
   else if(b.hasAttribute('data-transfer-import')){const raw=await readFile();if(!raw)return;if(raw.length>8_000_000)throw Error('Choose a settings file smaller than 8 MB.');file=validatePortable(JSON.parse(raw));await preview();}
   else if(b.hasAttribute('data-transfer-apply')){const message=await merge(file,{prefs:document.querySelector('[data-transfer-prefs]').checked,replace:document.querySelector('[data-transfer-replace]').checked});file=null;await open(message);}
   else{const s=await snapshot();await open(await merge({format:'resonance-settings',version:1,preferences:{},sources:[],songs:s.pending}));}
  });
 });
 // Called after a library refresh, never from the render loop.
 async function retry(key){
  if(busy||lastRetry===key)return;lastRetry=key;busy=true;
  try{const s=await snapshot();if(!s.pending.length)return;const b={format:'resonance-settings',version:1,preferences:{},sources:[],songs:s.pending};if(planPortable(b,s.tracks).ready.length)await merge(b);}catch{/* Preserve pending work for the explicit retry. */}finally{busy=false;}
 }
 return {open,retry};
}
export function browserSettingsFile(){
 return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files?.[0];if(file?.size>8_000_000)throw Error('Choose a settings file smaller than 8 MB.');resolve(await file?.text());}catch(e){reject(e);}};input.oncancel=()=>resolve(null);input.click();});
}
export function downloadSettingsFile(text){
 const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Resonance-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
