let serial=0;
const pending=new Map();
export function rpc(action,data={}){
 return new Promise((resolve,reject)=>{
  const bridge=window.ResonanceNative;if(!bridge)return reject(Error('Open the Android app to connect your music.'));
  const id=String(++serial),timer=setTimeout(()=>{pending.delete(id);reject(Error('This is taking longer than expected. Please try again.'));},['pickFolder','pickDestination','captureStart','lyricsFile','settingsFile'].includes(action)?600000:action==='syncMatch'||action==='updateDownloader'?120000:45000);
  pending.set(id,{resolve,reject,timer});bridge.postMessage(JSON.stringify({id,action,data}));
 });
}
if(window.ResonanceNative)window.ResonanceNative.onmessage=event=>{let result;try{result=JSON.parse(event.data);}catch{return;}const p=pending.get(result.id);if(!p)return;clearTimeout(p.timer);pending.delete(result.id);result.error?p.reject(Error(result.error)):p.resolve(result.value);};

export class NativeAudio extends EventTarget {
 constructor(){super();this.snapshot={playing:false,position:0,duration:0,volume:1,id:'',queue:[],index:0};this.sampleAt=performance.now();this.muted=false;}
 update(next){const previous=this.snapshot;next={...next,queue:next.queue??previous.queue,playbackOrder:next.playbackOrder??previous.playbackOrder};this.snapshot=next;this.sampleAt=performance.now();if(previous.id!==next.id)this.dispatchEvent(new Event('trackchange'));if(previous.playing!==next.playing)this.dispatchEvent(new Event(next.playing?'play':'pause'));this.dispatchEvent(new Event('timeupdate'));}
 error(error){this.dispatchEvent(new CustomEvent('nativeerror',{detail:error}));}
 get paused(){return !this.snapshot.playing;}get ended(){return false;}get volume(){return this.snapshot.volume??1;}set volume(value){void rpc('volume',{value}).then(s=>this.update(s)).catch(e=>this.error(e));}
 get duration(){return (this.snapshot.duration||0)/1000;}get currentTime(){return Math.min(this.duration,((this.snapshot.position||0)+(this.paused?0:performance.now()-this.sampleAt))/1000);}set currentTime(seconds){void rpc('seek',{position:seconds*1000}).then(s=>this.update(s)).catch(e=>this.error(e));}
 async play(){this.update(await rpc('play'));}async pause(){this.update(await rpc('pause'));}
}
