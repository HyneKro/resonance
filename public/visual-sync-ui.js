import {visualSyncOffset,visualSyncPreferences} from './visual-sync.js';

export function visualSyncMarkup(prefs,desktop=false){
 const p=visualSyncPreferences(prefs),key=desktop?'desktopVisualSyncOffsetMs':'visualSyncOffsetMs',value=p[key];
 return `<section class="visual-sync-settings" data-visual-sync><h3>Bluetooth &amp; visual sync</h3><p>Match the visualizer and Sona to the sound you hear.</p>${desktop?'<p class="fine-print">Desktop audio has its own saved offset. Its capture delay cannot be measured automatically.</p>':`<label class="toggle-label sync-auto"><input type="checkbox" data-preference="visualSyncAuto" aria-label="Use device latency estimate" ${p.visualSyncAuto?'checked':''}> Use device estimate</label>`}<div class="sync-adjust"><label>Visual offset <span class="sync-exact"><input type="number" min="${desktop?0:-1000}" max="1000" step="1" value="${value}" data-sync-offset="${key}" aria-label="Exact visual offset in milliseconds" inputmode="numeric"><span>ms</span></span></label><button type="button" class="setting-reset" data-sync-reset="${key}" aria-label="Reset visual offset to zero">↺</button></div><div class="sync-slider"><button type="button" class="chip" data-sync-nudge="-10" data-sync-key="${key}" aria-label="Show visuals 10 milliseconds earlier">−10</button><input type="range" min="${desktop?0:-1000}" max="1000" step="1" value="${value}" data-sync-offset="${key}" aria-label="Visual offset"><button type="button" class="chip" data-sync-nudge="10" data-sync-key="${key}" aria-label="Show visuals 10 milliseconds later">+10</button></div><p class="fine-print">Positive values delay visuals. ${desktop?'':'Negative values reduce the device estimate. '}Audio playback stays unchanged. Use the number field for 1 ms steps.</p><p class="sync-status" data-sync-status role="status"></p>${desktop?'':'<p class="fine-print">Device reports can be incomplete. If Bluetooth still looks early, increase the offset; turn the estimate off to set the whole delay yourself.</p>'}</section>`;
}
export function installVisualSyncUI({reactor,state,setPreferences,onError}){
 const profile=()=>reactor.outputDevice?.id;
 const outputMarkup=()=>{const d=reactor.outputDevice,p=state.prefs.visualSyncDevices?.[d?.id];return d?.id?`<label>Output connection<select data-output-mode aria-label="Audio output connection"><option value="auto" ${!p||p.mode==='auto'?'selected':''}>Detect automatically</option><option value="bluetooth" ${p?.mode==='bluetooth'?'selected':''}>Bluetooth · use estimate</option><option value="direct" ${p?.mode==='direct'?'selected':''}>Wired / USB · no estimate</option></select></label><p class="fine-print" data-output-label></p>`:'';};
 const update=()=>{
  const s=reactor.visualSyncStatus;
  for(const section of document.querySelectorAll('[data-visual-sync]')){
   const desktop=!!reactor.desktopSource;
   if(section.querySelector('[data-sync-offset]')?.dataset.syncOffset!==(desktop?'desktopVisualSyncOffsetMs':'visualSyncOffsetMs')){section.outerHTML=visualSyncMarkup(state.prefs,desktop);}
  }
  for(const e of document.querySelectorAll('[data-sync-status]')){
   const message=reactor.musicOnly?'Music only · visual sync is resting':!s?'Start playback to read the device estimate.':s.desktop?`Desktop visual delay: ${s.delayMs} ms`:s.automatic&&s.transport==='direct'?`Direct output · visual delay: ${s.delayMs} ms`:s.automatic?`${s.available?`Device estimate: ${s.estimateMs} ms`:'Device estimate unavailable'} · visual delay: ${s.delayMs} ms`:`Manual visual delay: ${s.delayMs} ms`;
   if(e.textContent!==message)e.textContent=message;
  }
  for(const section of document.querySelectorAll('[data-visual-sync]')){
   let output=section.querySelector('[data-output-profile]');if(!output){output=document.createElement('div');output.dataset.outputProfile='';section.append(output);}
   const key=JSON.stringify([profile(),state.prefs.visualSyncDevices?.[profile()]?.mode,!!reactor.desktopSource]);
   if(output.dataset.key!==key){for(const field of section.querySelectorAll('[data-sync-offset=visualSyncOffsetMs]'))field.value=reactor.visualSyncStatus?.offsetMs??0;output.dataset.key=key;output.innerHTML=reactor.desktopSource?'':outputMarkup();const label=output.querySelector('[data-output-label]');if(label)label.textContent=reactor.outputDevice.label+' · adjustments are saved for this output only.';}
  }
 };
 const fields=(key,value)=>{for(const el of document.querySelectorAll(`[data-sync-offset="${key}"]`))if(el.value!==String(value))el.value=value;};
 const patch=(key,value)=>key==='visualSyncOffsetMs'&&profile()?{visualSyncDevices:{...state.prefs.visualSyncDevices,[profile()]:{mode:'auto',...state.prefs.visualSyncDevices?.[profile()],offsetMs:value}}}:{[key]:value};
 const preview=(key,value)=>{fields(key,value);reactor.setVisualSync({...state.prefs,...patch(key,value)});update();};
 const save=async(key,value)=>{preview(key,value);try{await setPreferences(patch(key,value));}catch(e){onError(e.message);}};
 document.addEventListener('input',e=>{const key=e.target.dataset.syncOffset;if(!key||e.target.value===''||!Number.isFinite(e.target.valueAsNumber))return;preview(key,visualSyncOffset(e.target.valueAsNumber,key==='desktopVisualSyncOffsetMs'));});
 document.addEventListener('change',e=>{const key=e.target.dataset.syncOffset;if(!key)return;const value=e.target.value===''||!Number.isFinite(e.target.valueAsNumber)?state.prefs[key]??0:visualSyncOffset(e.target.valueAsNumber,key==='desktopVisualSyncOffsetMs');void save(key,value);});
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-sync-nudge],[data-sync-reset]');if(!button)return;e.preventDefault();
  const key=button.dataset.syncReset||button.dataset.syncKey,field=document.querySelector(`[data-sync-offset="${key}"]`);
  const value=button.dataset.syncReset?0:visualSyncOffset((Number(field?.value)||0)+Number(button.dataset.syncNudge),key==='desktopVisualSyncOffsetMs');void save(key,value);
 });
 reactor.onVisualSyncChange=update;
 document.addEventListener('change',e=>{if(e.target.matches('[data-output-mode]')&&profile())void setPreferences({visualSyncDevices:{...state.prefs.visualSyncDevices,[profile()]:{offsetMs:0,...state.prefs.visualSyncDevices?.[profile()],mode:e.target.value}}}).catch(error=>onError(error.message));});
 const receive=device=>{reactor.outputDevice=device;reactor.refreshVisualSync(true);fields('visualSyncOffsetMs',reactor.visualSyncStatus.offsetMs);update();};
 window.resonanceDesktop?.onAudioOutput?.(receive);void window.resonanceDesktop?.audioOutput?.().then(receive).catch(()=>{});
 new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
 navigator.mediaDevices?.addEventListener?.('devicechange',()=>reactor.refreshVisualSync(true));
 return {apply(p){reactor.setVisualSync(p);for(const key of ['visualSyncOffsetMs','desktopVisualSyncOffsetMs'])fields(key,key==='visualSyncOffsetMs'?reactor.visualSyncStatus.offsetMs:p[key]??0);for(const el of document.querySelectorAll('[data-preference=visualSyncAuto]'))el.checked=p.visualSyncAuto;update();}};
}
