import {Reactor} from './reactor.js';
import {rpc} from './native.js';
export class MobileReactor extends Reactor {
 constructor(audio){super(audio);this.portraitScene=true;this.mode='resonance';this.quality='eco';this.scale=.7;this.targetFPS=60;this.hdrMode='off';this.latest={};this.analysisActive=true;this.focused=true;}
 get audioActive(){return this.audio.snapshot.capturing||super.audioActive;}
 async connect(){
  if(this.context)return;
  this.context={sampleRate:48000,state:'running',baseLatency:0,outputLatency:0};
  const analyser=(key,size)=>({fftSize:size,getFloatFrequencyData:out=>{const values=this.latest[key];out.fill(-100);if(values)out.set(values.slice(0,out.length));},getFloatTimeDomainData:out=>{const values=this.latest.wave;out.fill(0);if(values)for(let i=0;i<Math.min(values.length,out.length);i++)out[i]=values[i]/32767;}});
  this.analyser=analyser('long',8192);this.midAnalyser=analyser('mid',2048);this.fastAnalyser=analyser('fast',1024);this.freq=new Float32Array(4096);this.midFreq=new Float32Array(1024);this.fastFreq=new Float32Array(512);this.wave=new Float32Array(1024);this.freq.fill(-100);this.refreshVisualSync(true);
 }
 eq(values){this.eqValues=values;}
 async pollAnalysis(){
  if(this.polling)return;this.polling=true;
  try{while(this.analysisActive&&this.focused&&!this.musicOnly){const started=performance.now();this.latest=await rpc('analysis');if(this.latest.rate&&this.context)this.context.sampleRate=this.latest.rate;await new Promise(r=>setTimeout(r,Math.max(0,33-(performance.now()-started))));}}catch{}finally{this.polling=false;}
 }
 async foreground(active){this.focused=active;this.analysisActive=active&&!this.musicOnly&&!this.sceneSuspended;await rpc('visuals',{enabled:this.analysisActive}).catch(()=>{});if(this.analysisActive){this.previousFrame=0;this.start();void this.pollAnalysis();}else{this.running=false;cancelAnimationFrame(this.frameRequest);}}
 setSceneSuspended(enabled){super.setSceneSuspended(enabled);void this.foreground(this.focused);}
 setMusicOnly(enabled){super.setMusicOnly(enabled);void this.foreground(this.focused);}
 updateMeters(){const status=document.querySelector('#hdr-status');if(status)status.textContent=this.gpu?.output?.description()||'Standard display output';}
}
