// Resume after a paint, not inside its animation callback. A timer also lets
// preparation finish when the window is hidden and animation frames stop.
export function yieldSceneWork(){
 return new Promise(resolve=>{
  let settled=false,frame;
  const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);if(frame!==undefined)globalThis.cancelAnimationFrame?.(frame);resolve();};
  const timer=setTimeout(finish,50);
  frame=globalThis.requestAnimationFrame?.(()=>setTimeout(finish,0));
 });
}

export class ScenePreparation{
 constructor({cancelled=()=>false,yieldWork=yieldSceneWork,now=()=>performance.now()}={}){this.cancelled=cancelled;this.yieldWork=yieldWork;this.now=now;}
 check(){if(this.cancelled())throw Error('Scene preparation cancelled');}
 async checkpoint(){this.check();await this.yieldWork();this.check();}
 async fill(count,write,{batch=1024,budget=3}={}){
  this.check();let began=this.now();
  for(let start=0;start<count;start+=batch){
   for(let i=start;i<Math.min(count,start+batch);i++)write(i);
   if(start+batch<count&&this.now()-began>=budget){await this.checkpoint();began=this.now();}
  }
  await this.checkpoint();
 }
 async upload(gl,buffer,data,usage){
  this.check();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,usage);await this.checkpoint();
  const chunk=65536; // At most 256 KiB of float data per presentation frame.
  for(let i=0;i<data.length;i+=chunk){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,i*data.BYTES_PER_ELEMENT,data.subarray(i,i+chunk));await this.checkpoint();}
 }
 async drain(gl){
  this.check();const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  if(!fence)throw Error('Scene preparation fence unavailable');
  try{
   gl.flush();let status;
   do{await this.checkpoint();status=gl.clientWaitSync(fence,0,0);}while(status===gl.TIMEOUT_EXPIRED);
   if(status===gl.WAIT_FAILED)throw Error('Scene preparation interrupted');
  }finally{gl.deleteSync(fence);}
 }
}
