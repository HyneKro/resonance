import {DEFAULT_PREFERENCES} from './default-preferences.js';
export const settingDefault=(key)=>key==='sfx'?true:key==='motion'?!matchMedia('(prefers-reduced-motion: reduce)').matches:DEFAULT_PREFERENCES[key];
export function installSettingResets({state,setPreferences,onEQ}){
 const seen=new WeakSet();let queued=false;
 function install(){queued=false;document.querySelectorAll('[data-preference],#visual-quality,[data-eq],#download-format').forEach(input=>{
  if(seen.has(input))return;const key=input.dataset.preference||(input.id==='visual-quality'?'quality':input.id==='download-format'?'downloadFormat':'eq');if(key!=='eq'&&key!=='downloadFormat'&&settingDefault(key)===undefined)return;
  const label=input.closest('label')||input.parentElement,name=input.getAttribute('aria-label')||({sfx:'Interface sounds',motion:'Motion',downloadFormat:'Download format'})[key]||key;if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',name);const button=document.createElement('button');button.type='button';button.className='setting-reset';button.textContent='↺';button.dataset.resetSetting=key;button.setAttribute('aria-label','Reset '+name+' to default');button.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();button.disabled=true;try{
   if(key==='eq'){onEQ(Number(input.dataset.eq));return;}if(key==='downloadFormat'){input.value='best';input.dispatchEvent(new Event('change',{bubbles:true}));return;}
   const value=settingDefault(key);document.querySelectorAll(`[data-preference="${key}"]`).forEach(el=>{if(el.type==='checkbox')el.checked=value;else el.value=value;});await setPreferences({[key]:value});
  }catch{button.setAttribute('aria-label','Could not save reset. Try again.');}finally{button.disabled=false;}});
  seen.add(input);label.append(button);
 });}
 const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(install);}});observer.observe(document.body,{childList:true,subtree:true});install();return observer;
}
