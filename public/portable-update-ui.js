import {installAppUpdateUI} from './app-update-ui.js';
export function installPortableUpdateUI({toast,state,openUpdates}){
 if(!window.resonanceDesktop?.installUpdate)return;
 if(window.resonanceDesktop.appUpdate){installAppUpdateUI({request:window.resonanceDesktop.appUpdate,subscribe:window.resonanceDesktop.onAppUpdate,host:()=>document.querySelector('#app-update-slot'),active:()=>state.dialog==='App updates',toast,manualInstall:window.resonanceDesktop.installUpdate,openUpdates});return;}
 const install=()=>{const host=document.querySelector('#app-update-slot');if(state.dialog!=='App updates'||!host||host.querySelector('[data-portable-update]'))return;
  const card=document.createElement('section');card.className='settings-card';card.innerHTML='<h3>App updates</h3><p>Keep your music, playlists and settings when a new portable release arrives.</p><button class="secondary" data-portable-update>Install a portable update…</button><p class="fine-print" data-update-status>Choose the new Resonance ZIP. The app checks it before offering to restart.</p>';
  host.append(card);card.querySelector('button').onclick=async()=>{const button=card.querySelector('button'),status=card.querySelector('[data-update-status]');button.disabled=true;status.textContent='Choose an update, then wait while its contents are checked…';try{const r=await window.resonanceDesktop.installUpdate();status.textContent=r.error||r.message||(r.restarting?'Restarting to apply the update…':r.cancelled?'Update cancelled.':'Ready.');if(r.error)toast(r.error);}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
 };
 new MutationObserver(install).observe(document.body,{childList:true,subtree:true});install();
}
