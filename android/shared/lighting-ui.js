import {LightingSignal,lightingOptions,estimatedSegments} from './lighting-signal.js';
import {rememberPanel} from './menu-kit.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const lightingMarkup=()=>'<section class="settings-card card" data-lighting><h3>Govee room lighting</h3><p>The full music palette and spectrum on every strip. Bass → mids → treble, from start to end. Enable LAN Control in Govee Home, then find and select your lights.</p><div data-lighting-content role="status">Loading lighting settings…</div></section>';
export class LightingClient {
 constructor({request,reactor,toast=()=>{}}){this.request=request;this.reactor=reactor;this.toast=toast;this.signal=new LightingSignal();this.state={enabled:false,options:lightingOptions(),devices:[]};this.last=0;document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state.enabled)void this.stop();});window.addEventListener('pagehide',()=>{if(this.state.enabled)void this.stop();});}
 async refresh(){this.state=await this.request('status');if(!this.state.enabled&&this.timer)this.halt();this.paint();return this.state;}
 mount(root){this.root=root;root.dataset.resumePanel='';root.addEventListener('panelresume',()=>{this.root=root;this.paint();});void this.refresh().catch(e=>this.message(e.message));
  root.onclick=e=>{const b=e.target.closest('[data-lighting-action]');if(!b)return;void this.action(b.dataset.lightingAction).catch(e=>this.message(e.message));};
  root.addEventListener('focusin',e=>{if(e.target.matches('input[type=number]'))this.editing=true;});root.addEventListener('focusout',()=>{this.editing=false;});
  root.addEventListener('pointerdown',e=>{if(e.target.matches('input'))this.editing=true;});root.addEventListener('pointerup',()=>{this.editing=false;});root.addEventListener('pointercancel',()=>{this.editing=false;});
  root.onchange=e=>{const el=e.target;if(!el.matches('[data-lighting-setting],[data-lighting-device],[data-lighting-segments],[data-lighting-reverse]'))return;
   const options=lightingOptions(this.state.options);
   if(el.dataset.lightingSetting)options[el.dataset.lightingSetting]=Number(el.value);
   else{const row=el.closest('[data-light-id]'),id=row.dataset.lightId;let d=options.devices.find(x=>x.id===id);if(!d){d={id,selected:false,segments:estimatedSegments(this.state.devices.find(x=>x.id===id)?.model),reverse:false};options.devices.push(d);}if(el.hasAttribute('data-lighting-device'))d.selected=el.checked;if(el.hasAttribute('data-lighting-segments'))d.segments=Number(el.value);if(el.hasAttribute('data-lighting-reverse'))d.reverse=el.checked;}
   void this.configure({options}).catch(e=>this.message(e.message));
  };
 }
 message(text){const status=this.root?.querySelector('[data-lighting-message]');if(status)status.textContent=text;else this.toast(text);}
 paint(){
  if(!this.root?.isConnected||this.editing)return;const slot=this.root.querySelector('[data-lighting-content]');if(!slot)return;const restore=rememberPanel(this.root),s=this.state,p=s.options;
  slot.innerHTML=`<div class="source-actions stack"><button type="button" class="secondary" data-lighting-action="scan">Find lights</button><button type="button" class="${s.enabled?'secondary':'primary'}" data-lighting-action="${s.enabled?'stop':'start'}">${s.enabled?'Stop sync':'Start sync'}</button><button type="button" class="secondary" data-lighting-action="check">Check strip ends</button></div><p data-lighting-message role="status">${escape(s.error|| (this.previewUntil>performance.now()?'Checking ends for 12 seconds · cyan start → pink end.':s.enabled?'Syncing while this screen is visible.':'Sync is off. Start it for this listening session.'))}</p><div class="stack">${s.devices.map((d,i)=>{const pref=p.devices.find(x=>x.id===d.id)||{segments:estimatedSegments(d.model),reverse:false};return `<div class="lighting-device" data-light-id="${escape(d.id)}"><label><input type="checkbox" data-lighting-device ${pref.selected?'checked':''}> ${escape(d.name)}<small> · ${escape(d.model)} · ${escape(d.ip)} · ${d.streaming?'Streaming':d.online?d.on===true?'On':d.on===false?'Off':'Checking':'Not responding'}</small></label><label class="field">Zones<input type="number" min="1" max="255" step="1" value="${pref.segments}" data-lighting-segments aria-label="Zones for ${escape(d.name)}"></label><label><input type="checkbox" data-lighting-reverse ${pref.reverse?'checked':''}> Reverse strip</label></div>`;}).join('')||'<p>No lights found yet. Use Find lights after enabling LAN Control.</p>'}</div>${[['brightness','Maximum brightness',.05,1],['response','Music response',0,1.5],['idle','Paused glow',0,1]].map(([key,title,min,max])=>`<label class="field">${title} · ${Math.round(p[key]*100)}%<input type="range" min="${min}" max="${max}" step=".05" value="${p[key]}" data-lighting-setting="${key}"></label>`).join('')}<p class="fine-print">40 Hz → 16 kHz on every strip. Quiet frequencies stay dim during playback. Check ends: cyan start, pink end. Adjust estimated Zones if needed. LAN Control and powered-on lights required. Stop releases control and restores brightness. Realtime support varies; use one lighting controller at a time.</p>`;restore();
 }
 async configure(data){this.configuring=(this.configuring||0)+1;try{await this.pendingFrame?.catch(()=>{});this.state=await this.request('configure',data);this.paint();if(!this.state.enabled)this.halt();return this.state;}finally{this.configuring--;}}
 async action(action){
  if(action==='scan'){this.message('Looking for Govee lights…');this.state=await this.request('scan');this.paint();return;}
  if(action==='stop')return this.stop();
  if(action==='check'){this.previewUntil=performance.now()+12000;if(!this.state.enabled)await this.action('start');this.paint();return;}
  if(action==='start'){await this.reactor.connect();await this.configure({enabled:true,options:this.state.options});this.reactor.setLightingActive(true);this.last=performance.now();clearInterval(this.timer);this.timer=setInterval(()=>void this.tick(),16);clearInterval(this.statusTimer);this.statusTimer=setInterval(()=>{if(this.root?.isConnected)void this.refresh().catch(()=>{});},2500);}
 }
 halt(){clearInterval(this.statusTimer);clearInterval(this.timer);this.timer=null;this.reactor.setLightingActive(false);}
 async stop(){this.previewUntil=0;this.halt();this.state.enabled=false;this.paint();try{this.state=await this.request('stop');this.paint();}catch(e){this.message(e.message);}}
 async tick(){
  if(this.busy||this.configuring||!this.state.enabled)return;const now=performance.now(),dt=Math.min(.2,(now-this.last)/1000);this.last=now;
  const snapshot=this.reactor.lightingSnapshot(now),frames=this.signal.update(snapshot,dt,this.state.options);
  if(this.previewUntil>now)for(const frame of frames)frame.pixels=frame.pixels.map((_,i,arr)=>{let t=arr.length===1?.5:i/(arr.length-1);if(this.state.options.devices.find(d=>d.id===frame.id)?.reverse)t=1-t;return [Math.round(t*90),Math.round((1-t)*90),90];});
  if(this.previewUntil&&now>=this.previewUntil){this.previewUntil=0;this.paint();}
  if(now<(this.sentAt||0)+15)return;this.sentAt=now;this.busy=true;
  try{this.pendingFrame=this.request('frame',{frames});const result=await this.pendingFrame;if(result.enabled===false){this.halt();await this.refresh();}}
  catch(e){this.halt();this.state.enabled=false;this.message(e.message);this.toast('Lighting sync stopped: '+e.message);void this.request('stop').catch(()=>{});}
  finally{this.busy=false;this.pendingFrame=null;}
 }
}
