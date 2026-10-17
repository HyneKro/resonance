export function storageSize(bytes){
 const n=Math.max(0,Number(bytes)||0),units=['B','KB','MB','GB','TB'],index=Math.min(4,Math.floor(Math.log(Math.max(1,n))/Math.log(1000)));
 return (n/1000**index).toLocaleString(undefined,{maximumFractionDigits:index?1:0})+' '+units[index];
}
export const storageCard=()=>`<section class="settings-card storage-card" aria-labelledby="storage-heading"><div class="storage-heading"><div><h2 id="storage-heading">Space for your music</h2><p>Music, cached discoveries, and Resonance on this computer.</p></div><button class="secondary" data-storage-refresh>Refresh estimate</button></div><div data-storage-content role="status" aria-live="polite"><p class="fine-print">Measuring local storage…</p></div></section>`;
export function storageContents(s){
 const rows=[['music','Music & mixes',`${s.music.files.toLocaleString()} indexed files`],['artwork','Cached artwork','Covers & Music only backgrounds'],['library','Library & other data','Metadata, lyrics, genres, history & settings'],['browser','Browser cache & data','Local player cache'],['application','Resonance app','Program, artwork & bundled tools']];
 return `<div class="storage-total"><strong>≈ ${storageSize(s.totalBytes)}</strong><span>total local storage</span></div><dl class="storage-breakdown">${rows.map(([id,label,note])=>`<div><dt>${label}<small>${note}</small></dt><dd>${id==='browser'&&s.browserMeasured===false?'—':storageSize(s[id].bytes)}</dd></div>`).join('')}</dl><p class="fine-print storage-note">Music sizes come from the last library scan. Other sizes checked ${new Date(s.checkedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}.${s.browserMeasured===false?' The desktop app also includes its browser cache.':''}${s.music.unavailable?` ${s.music.unavailable.toLocaleString()} unavailable music ${s.music.unavailable===1?'file':'files'} excluded.`:''}${s.music.unknown?` ${s.music.unknown.toLocaleString()} music files need a rescan for their size.`:''}${s.skipped?' Some files could not be measured; this estimate may be lower than the actual total.':''}</p>`;
}
export function mountStorage(element,api){
 const button=element.querySelector('[data-storage-refresh]'),content=element.querySelector('[data-storage-content]');let busy=false;
 const load=async(refresh=false)=>{
  if(busy)return;busy=true;button.disabled=true;button.textContent='Measuring…';element.setAttribute('aria-busy','true');
  try{const usage=await api('/api/storage'+(refresh?'?refresh=1':''));if(element.isConnected)content.innerHTML=storageContents(usage);}
  catch{if(element.isConnected)content.innerHTML='<p class="fine-print">Storage could not be measured. Try refreshing the estimate.</p>';}
  finally{busy=false;button.disabled=false;button.textContent='Refresh estimate';element.removeAttribute('aria-busy');}
 };
 button.onclick=()=>void load(true);void load();
}
