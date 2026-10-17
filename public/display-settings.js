export const validRefreshRate=value=>Number.isFinite(value)&&value>=20&&value<=1000?value:0;
export const resolvedFrameRate=(setting,displayRate)=>setting==='auto'?validRefreshRate(displayRate)||60:validRefreshRate(setting)||60;
export class RefreshRateTracker{
 constructor(){this.reset();this.rate=60;}
 reset(){this.previous=0;this.samples=[];}
 sample(time){
  const delta=time-this.previous;this.previous=time;if(delta<1||delta>50)return this.rate;
  this.samples.push(delta);if(this.samples.length<120)return this.rate;
  const sorted=this.samples.sort((a,b)=>a-b),ms=sorted[Math.floor(sorted.length*.2)],raw=1000/ms;
  const rates=[24,30,48,50,60,72,75,90,100,120,144,165,180,200,240,280,300,360,480];
  const nearest=rates.reduce((a,b)=>Math.abs(b-raw)<Math.abs(a-raw)?b:a);
  this.rate=Math.abs(nearest-raw)/raw<.035?nearest:Math.round(raw);this.samples=[];return this.rate;
 }
}

export function installDisplaySettings({reactor,desktop=window.resonanceDesktop}){
 const tracker=new RefreshRateTracker(),select=document.querySelector('[data-preference=targetFPS]');let nativeRate=0;
 function label(){const option=select.querySelector('[value=auto]');if(option)option.textContent=nativeRate?`Auto · ${Math.round(nativeRate)} Hz screen`:'Auto · match screen';}
 function display(state){nativeRate=validRefreshRate(state?.displayFrequency);reactor.displayRefreshRate=nativeRate||tracker.rate;label();reactor.needsFrame=true;}
 desktop?.onWindowState?.(display);desktop?.windowState?.().then(display).catch(()=>{});
 reactor.observeDisplayFrame=time=>{if(!nativeRate)reactor.displayRefreshRate=tracker.sample(time);};
 document.addEventListener('visibilitychange',()=>tracker.reset());window.addEventListener('resize',()=>tracker.reset());label();
 return {apply(p){reactor.targetFPS=p.targetFPS??'auto';reactor.hdrMode=p.hdrMode||'auto';select.value=String(reactor.targetFPS);document.querySelector('[data-preference=hdrMode]').value=reactor.hdrMode;reactor.needsFrame=true;}};
}
