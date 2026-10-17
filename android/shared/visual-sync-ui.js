import {visualSyncOffset,visualSyncPreferences} from './visual-sync.js';

export function visualSyncMarkup(prefs,desktop=false){
 const p=visualSyncPreferences(prefs),key=desktop?'desktopVisualSyncOffsetMs':'visualSyncOffsetMs',value=p[key];
 return `<section class="visual-sync-settings" data-visual-sync><h3>Bluetooth &amp; visual sync</h3><p>Match the visualizer and Sona to the sound you hear.</p>${desktop?'<p class="fine-print">Desktop audio has its own saved offset. Its capture delay cannot be measured automatically.</p>':`<label class="toggle-label sync-auto"><input type="checkbox" data-preference="visualSyncAuto" aria-label="Use device latency estimate" ${p.visualSyncAuto?'checked':''}> Use device estimate</label>`}<div class="sync-adjust"><label>Visual offset <span class="sync-exact"><input type="number" min="${desktop?0:-1000}" max="1000" step="1" value="${value}" data-sync-offset="${key}" aria-label="Exact visual offset in milliseconds" inputmode="numeric"><span>ms</span></span></label><button type="button" class="setting-reset" data-sync-reset="${key}" aria-label="Reset visual offset to zero">↺</button></div><div class="sync-slider"><button type="button" class="chip" data-sync-nudge="-10" data-sync-key="${key}" aria-label="Show visuals 10 milliseconds earlier">−10</button><input type="range" min="${desktop?0:-1000}" max="1000" step="1" value="${value}" data-sync-offset="${key}" aria-label="Visual offset"><button type="button" class="chip" data-sync-nudge="10" data-sync-key="${key}" aria-label="Show visuals 10 milliseconds later">+10</button></div><p class="fine-print">Positive values delay visuals. ${desktop?'':'Negative values reduce the device estimate. '}Audio playback stays unchanged. Use the number field for 1 ms steps.</p><p class="sync-status" data-sync-status role="status"></p>${desktop?'':'<p class="fine-print">Device reports can be incomplete. If Bluetooth still looks early, increase the offset; turn the estimate off to set the whole delay yourself.</p>'}</section>`;
}
export function installVisualSyncUI({reactor,state,setPreferences,onError}){
 const update=()=>{
  const s=reactor.visualSyncStatus;
  for(const section of document.querySelectorAll('[data-visual-sync]')){
   const desktop=!!reactor.desktopSource;
   if(section.querySelector('[data-sync-offset]')?.dataset.syncOffset!==(desktop?'desktopVisualSyncOffsetMs':'visualSyncOffsetMs')){section.outerHTML=visualSyncMarkup(state.prefs,desktop);}
  }
  for(const e of document.querySelectorAll('[data-sync-status]')){
   const message=reactor.musicOnly?'Music only · visual sync is resting':!s?'Start playback to read the device estimate.':s.desktop?`Desktop visual delay: ${s.delayMs} ms`:s.automatic?`${s.available?`Device estimate: ${s.estimateMs} ms`:'Device estimate unavailable'} · visual delay: ${s.delayMs} ms`:`Manual visual delay: ${s.delayMs} ms`;
   if(e.textContent!==message)e.textContent=message;
  }
 };
 const fields=(key,value)=>{for(const el of document.querySelectorAll(`[data-sync-offset="${key}"]`))if(el.value!==String(value))el.value=value;};
 const preview=(key,value)=>{fields(key,value);reactor.setVisualSync({...state.prefs,[key]:value});update();};
 const save=async(key,value)=>{preview(key,value);try{await setPreferences({[key]:value});}catch(e){onError(e.message);}};
 document.addEventListener('input',e=>{const key=e.target.dataset.syncOffset;if(!key||e.target.value===''||!Number.isFinite(e.target.valueAsNumber))return;preview(key,visualSyncOffset(e.target.valueAsNumber,key==='desktopVisualSyncOffsetMs'));});
 document.addEventListener('change',e=>{const key=e.target.dataset.syncOffset;if(!key)return;const value=e.target.value===''||!Number.isFinite(e.target.valueAsNumber)?state.prefs[key]??0:visualSyncOffset(e.target.valueAsNumber,key==='desktopVisualSyncOffsetMs');void save(key,value);});
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-sync-nudge],[data-sync-reset]');if(!button)return;e.preventDefault();
  const key=button.dataset.syncReset||button.dataset.syncKey,field=document.querySelector(`[data-sync-offset="${key}"]`);
  const value=button.dataset.syncReset?0:visualSyncOffset((Number(field?.value)||0)+Number(button.dataset.syncNudge),key==='desktopVisualSyncOffsetMs');void save(key,value);
 });
 reactor.onVisualSyncChange=update;
 new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
 navigator.mediaDevices?.addEventListener?.('devicechange',()=>reactor.refreshVisualSync(true));
 return {apply(p){reactor.setVisualSync(p);for(const key of ['visualSyncOffsetMs','desktopVisualSyncOffsetMs'])fields(key,p[key]??0);for(const el of document.querySelectorAll('[data-preference=visualSyncAuto]'))el.checked=p.visualSyncAuto;update();}};
}
