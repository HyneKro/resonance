// Transport clicks move through the queue immediately; only the settled target
// opens an audio decoder and starts artwork/lyrics/analysis work.
export class SkipBurst {
 constructor(delay=110){this.delay=delay;this.pending=null;}
 request(index,run){
  this.cancel();
  return new Promise((resolve,reject)=>{
   this.pending={index,resolve};
   this.timer=setTimeout(()=>{this.pending=null;Promise.resolve().then(run).then(resolve,reject);},this.delay);
  });
 }
 cancel(){clearTimeout(this.timer);this.pending?.resolve(false);this.pending=null;}
}

// At most one write is in flight. A newer snapshot always follows an older one,
// and repeated volume/queue/playing events share a single delayed save.
export class LatestStateWriter {
 constructor(write,delay=180){this.write=write;this.delay=delay;this.dirty=false;this.running=null;}
 schedule(){this.dirty=true;clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush(),this.delay);}
 async flush(){
  clearTimeout(this.timer);
  if(!this.running&&this.dirty){
   this.running=(async()=>{
    do{this.dirty=false;await this.write();}while(this.dirty);
   })().finally(()=>{this.running=null;});
  }
  // All callers, including window shutdown, await the entire drain.
  if(this.running)await this.running;
  if(this.dirty)return this.flush();
 }
}
