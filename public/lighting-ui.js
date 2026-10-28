import {LightingSignal,lightingOptions} from './lighting-signal.js';
import {rememberPanel} from './menu-kit.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const lightingMarkup=()=>'<section class="settings-card card" data-lighting><h3>Govee room lighting</h3><p>Music colors and gentle rhythm pulses over local Wi-Fi. Enable LAN Control in Govee Home, then find and select your lights.</p><div data-lighting-content role="status">Loading lighting settings…</div></section>';
export class LightingClient {
 constructor({request,reactor,toast=()=>{}}){this.request=request;this.reactor=reactor;this.toast=toast;this.signal=new LightingSignal();this.state={enabled:false,options:lightingOptions(),devices:[]};this.last=0;document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state.enabled)void this.stop();});window.addEventListener('pagehide',()=>{if(this.state.enabled)void this.stop();});}
 async refresh(){this.state=await this.request('status');if(!this.state.enabled&&this.timer)this.halt();this.paint();return this.state;}
 mount(root){this.root=root;root.dataset.resumePanel='';root.addEventListener('panelresume',()=>{this.root=root;this.paint();});void this.refresh().catch(e=>this.message(e.message));
  root.onclick=e=>{const b=e.target.closest('[data-lighting-action]');if(!b)return;void this.action(b.dataset.lightingAction).catch(e=>this.message(e.message));};
  root.onchange=e=>{const el=e.target;if(!el.matches('[data-lighting-setting],[data-lighting-device],[data-lighting-role],[data-lighting-color]'))return;
   const options=lightingOptions(this.state.options);
   if(el.dataset.lightingSetting)options[el.dataset.lightingSetting]=Number(el.value);
   else{const row=el.closest('[data-light-id]'),id=row.dataset.lightId;let d=options.devices.find(x=>x.id===id);if(!d){d={id,selected:false,role:'mix',color:options.devices.length%6};options.devices.push(d);}if(el.hasAttribute('data-lighting-device'))d.selected=el.checked;if(el.hasAttribute('data-lighting-role'))d.role=el.value;if(el.hasAttribute('data-lighting-color'))d.color=Number(el.value);}
   void this.configure({options}).catch(e=>this.message(e.message));
  };
 }
 message(text){const status=this.root?.querySelector('[data-lighting-message]');if(status)status.textContent=text;else this.toast(text);}
 paint(){
  if(!this.root?.isConnected)return;const slot=this.root.querySelector('[data-lighting-content]');if(!slot)return;const restore=rememberPanel(this.root),s=this.state,p=s.options;
  slot.innerHTML=`<div class="source-actions stack"><button type="button" class="secondary" data-lighting-action="scan">Find lights</button><button type="button" class="${s.enabled?'secondary':'primary'}" data-lighting-action="${s.enabled?'stop':'start'}">${s.enabled?'Stop sync':'Start sync'}</button></div><p data-lighting-message role="status">${escape(s.error|| (s.enabled?'Syncing while this screen is visible.':'Sync is off. Start it for this listening session.'))}</p><div class="stack">${s.devices.map((d,i)=>{const pref=p.devices.find(x=>x.id===d.id)||{color:i%6,role:'mix'};return `<div class="lighting-device" data-light-id="${escape(d.id)}"><label><input type="checkbox" data-lighting-device ${pref.selected?'checked':''}> ${escape(d.name)}<small> · ${escape(d.model)} · ${escape(d.ip)} · ${d.online?d.on===true?'On':d.on===false?'Off':'Checking':'Not responding'}</small></label><select data-lighting-role aria-label="Music response for ${escape(d.name)}">${[['mix','Full music'],['bass','Bass'],['mids','Midrange'],['highs','High frequencies']].map(([v,t])=>`<option value="${v}" ${pref.role===v?'selected':''}>${t}</option>`).join('')}</select><select data-lighting-color aria-label="Palette color for ${escape(d.name)}">${Array.from({length:6},(_,c)=>`<option value="${c}" ${pref.color===c?'selected':''}>Color ${c+1}</option>`).join('')}</select></div>`;}).join('')||'<p>No lights found yet. Use Find lights after enabling LAN Control.</p>'}</div>${[['brightness','Maximum brightness',.05,1],['response','Music response',0,1.5],['idle','Quiet brightness',0,1]].map(([key,title,min,max])=>`<label class="field">${title} · ${Math.round(p[key]*100)}%<input type="range" min="${min}" max="${max}" step=".05" value="${p[key]}" data-lighting-setting="${key}"></label>`).join('')}<p class="fine-print">Whole-strip color · no Govee account or cloud key. Turn lights on in Govee Home first. Sync preserves their power state. Stop leaves their last color and brightness. Other lighting apps may compete for control.</p>`;restore();
 }
 async configure(data){this.state=await this.request('configure',data);this.paint();if(!this.state.enabled)this.halt();return this.state;}
 async action(action){
  if(action==='scan'){this.message('Looking for Govee lights…');this.state=await this.request('scan');this.paint();return;}
  if(action==='stop')return this.stop();
  if(action==='start'){await this.reactor.connect();await this.configure({enabled:true,options:this.state.options});this.reactor.setLightingActive(true);this.last=performance.now();clearInterval(this.timer);this.timer=setInterval(()=>void this.tick(),50);clearInterval(this.statusTimer);this.statusTimer=setInterval(()=>{if(this.root?.isConnected)void this.refresh().catch(()=>{});},2500);}
 }
 halt(){clearInterval(this.statusTimer);clearInterval(this.timer);this.timer=null;this.reactor.setLightingActive(false);}
 async stop(){this.halt();this.state.enabled=false;this.paint();try{this.state=await this.request('stop');this.paint();}catch(e){this.message(e.message);}}
 async tick(){
  if(this.busy||!this.state.enabled)return;const now=performance.now(),dt=Math.min(.2,(now-this.last)/1000);this.last=now;
  const snapshot=this.reactor.lightingSnapshot(now),frames=this.signal.update(snapshot,dt,this.state.options);
  if(now<(this.sentAt||0)+125)return;this.sentAt=now;this.busy=true;
  try{const result=await this.request('frame',{frames});if(result.enabled===false){this.halt();await this.refresh();}}
  catch(e){this.halt();this.state.enabled=false;this.message(e.message);this.toast('Lighting sync stopped: '+e.message);void this.request('stop').catch(()=>{});}
  finally{this.busy=false;}
 }
}
