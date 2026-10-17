/** Native clients own networking, file verification and installation. */
export function installAppUpdateUI({request,subscribe,host,active,toast,platform='pc',manualInstall,openUpdates}){
 let current=null,lastReady='',pending=false;
 const call=async(action,data)=>{try{pending=true;const value=await request(action,data);if(value)update(value);}catch(e){toast(e.message||'Could not complete the update request.');}finally{pending=false;}};
 function mount(){const parent=host();if(!active()||!parent||parent.querySelector('[data-app-updates]'))return;
  const card=document.createElement('section');card.className=platform==='pc'?'settings-card':'card';card.dataset.appUpdates='';
  card.innerHTML=`<h3>App updates</h3><p data-app-version></p><p data-app-update-status role="status" aria-live="polite">Checking update settings…</p><progress data-app-update-progress aria-label="App download progress" hidden></progress><div class="toolbar" style="display:flex;gap:10px;flex-wrap:wrap"><button class="secondary" data-app-update="check">Check for updates</button><button class="primary" data-app-update="download" hidden>Download update</button><button class="primary" data-app-update="install" hidden>${platform==='pc'?'Restart & update':'Install update'}</button><button class="secondary" data-app-update="cancel" hidden>Cancel download</button></div><label class="toggle-label" style="display:flex;gap:12px;align-items:center;margin-top:18px"><input type="checkbox" data-app-update-pref="autoCheck"> Check automatically</label><label class="toggle-label" style="display:flex;gap:12px;align-items:center;margin-top:12px"><input type="checkbox" data-app-update-pref="autoDownload"> ${platform==='android'?'Download updates on Wi-Fi':'Download updates automatically'}</label><p class="fine-print">${platform==='pc'?'Downloads happen in the background. Restart when you are ready; music, playlists and settings are preserved.':'Automatic downloads wait for unmetered Wi-Fi. Tap Install when ready, then confirm with Android. Your music and settings stay in place.'} Checks contact GitHub. No account is needed.</p><details data-app-release-notes hidden><summary>What’s new</summary><p data-app-release-text style="white-space:pre-wrap;overflow-wrap:anywhere"></p></details><button class="text-button text" data-app-update="releases">Open GitHub downloads ↗</button>${manualInstall?'<button class="text-button" data-app-update="manual">Install a downloaded ZIP…</button>':''}`;
  parent.append(card);
  card.addEventListener('click',async e=>{const button=e.target.closest('[data-app-update]');if(!button)return;const action=button.dataset.appUpdate;if(action==='manual'){button.disabled=true;try{const r=await manualInstall();toast(r.error||r.message||(r.restarting?'Restarting…':'Update cancelled.'));}catch(error){toast(error.message);}finally{button.disabled=false;}}else void call(action);});
  card.addEventListener('change',e=>{const key=e.target.dataset.appUpdatePref;if(key)void call('preferences',{[key]:e.target.checked});});
  if(current)render(card);else void call('status');
 }
 function render(card){const s=current,busy=['checking','downloading','preparing','restarting','verifying'].includes(s.phase);card.querySelector('[data-app-version]').textContent=`Installed: ${s.current||'Resonance'}`;
  card.querySelector('[data-app-update-status]').textContent=s.message+(s.phase==='downloading'&&s.total?' '+Math.floor(100*(s.received||0)/s.total)+'%':'')+(s.canInstall===false?' This development copy is updated from its source folder.':'');
  const progress=card.querySelector('progress');progress.hidden=!['downloading','preparing','verifying'].includes(s.phase);if(s.phase==='downloading'&&s.total){progress.max=s.total;progress.value=s.received||0;}else progress.removeAttribute('value');
  const button=a=>card.querySelector(`[data-app-update="${a}"]`);button('check').disabled=busy||s.phase==='ready';button('download').hidden=!(s.release&&s.canInstall!==false&&!busy&&s.phase!=='ready');button('install').hidden=s.phase!=='ready'||s.canInstall===false;button('cancel').hidden=!['checking','downloading'].includes(s.phase);button('cancel').textContent=s.phase==='checking'?'Cancel check':'Cancel download';
  for(const input of card.querySelectorAll('[data-app-update-pref]'))input.checked=s[input.dataset.appUpdatePref]!==false;
  card.querySelector('[data-app-release-notes]').hidden=!s.release?.notes;card.querySelector('[data-app-release-text]').textContent=s.release?.notes||'';
 }
 function update(value){current=value;for(const card of document.querySelectorAll('[data-app-updates]'))render(card);
  const ready=value.phase==='ready'&&value.canInstall!==false&&!!value.release?.version;
  for(const button of document.querySelectorAll('[data-update-ready]')){button.hidden=!ready;button.setAttribute('aria-label',ready?'Version '+value.release.version+' is ready to install. Open app updates.':'App updates');}
  if(ready&&value.release.version!==lastReady){lastReady=value.release.version;toast('Resonance '+lastReady+' is ready. Tap the update arrow to install.');}}
 document.addEventListener('click',e=>{if(e.target.closest('[data-update-ready]'))openUpdates?.();});
 subscribe?.(update);
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();void call('status');
 if(!subscribe)setInterval(()=>{if(!document.hidden&&!pending)void call('status');},4000);
 return {refresh:()=>call('status')};
}
