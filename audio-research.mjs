import {spawn} from 'node:child_process';
import os from 'node:os';
import {createInterface} from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ProfileReader,PROFILE_FILTER,AUDIO_PROFILE_VERSION,validateRange} from './public/song-analysis.js';
export const audioStamp=t=>[t.path,t.size,t.mtime??t.modified,t.duration].join('|');
export async function analyzeFile(file,{duration=0,executable,signal,onProgress=()=>{}}={}){
 const reader=new ProfileReader(duration),child=spawn(executable,['-hide_banner','-nostdin','-nostats','-threads','1','-filter_threads','1','-i',file,'-vn','-map','0:a:0','-af',PROFILE_FILTER,'-f','null','-'],{windowsHide:true,stdio:['ignore','pipe','pipe'],signal});
 try{os.setPriority(child.pid,os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{/* Priority is optional on some hosts. */}
 let errors='';child.stderr.on('data',d=>{errors=(errors+d).slice(-16000);});
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(errors.includes('No such file')?'Audio file unavailable.':'This file could not be analyzed.')));});
 const lines=createInterface({input:child.stdout});let last=0;
 const timeout=setTimeout(()=>child.kill(),Math.max(120000,Math.min(900000,duration*500)));timeout.unref();
 try{await Promise.all([done,(async()=>{for await(const line of lines){reader.line(line);if(reader.duration>last+2){last=reader.duration;onProgress(duration?Math.min(.99,last/duration):0);}}})()]);const value=reader.finish();if(value.duration<.1)throw Error('No decodable audio found.');return value;}
 finally{clearTimeout(timeout);lines.close();if(child.exitCode==null)child.kill();}
}
export class AudioResearch {
 constructor(lib,{decode=analyzeFile}={}){this.lib=lib;this.decode=decode;this.queue=[];this.backlog=[];this.running=false;this.job={running:false,queued:0,id:'',progress:0,error:''};this.controller=null;this.enabled=false;this.refresh=setInterval(()=>{if(this.enabled&&!this.running){this.enabled=false;this.setLeveling(true);}},30000);this.refresh.unref();}
 read(id){const t=this.lib.tracks.get(id);if(!t)throw Error('Track not found');const saved=this.lib.getSetting('audioProfile:'+id);return saved?.version===AUDIO_PROFILE_VERSION&&saved.stamp===audioStamp(t)?saved:null;}
 status(id){const profile=this.read(id),error=this.lib.getSetting('audioError:'+id);return {profile,edit:this.lib.getSetting('playbackEdit:'+id)||{enabled:false},job:{...this.job,running:this.job.id===id&&this.job.running||this.queue.includes(id),queued:this.queue.length},error:error?.stamp===audioStamp(this.lib.tracks.get(id))?error.message:''};}
 request(id,force=false,priority=false){const t=this.lib.tracks.get(id);if(!t?.available)throw Error('Track unavailable');if(!force&&(this.read(id)||this.status(id).error))return this.status(id);this.lib.setSetting('audioError:'+id,null);if(this.job.id===id){if(priority)this.foreground=true;}else if(!this.queue.includes(id)||priority){this.queue=this.queue.filter(x=>x!==id);if(this.queue.length>=8)this.queue.pop();priority?this.queue.unshift(id):this.queue.push(id);if(priority&&this.running)this.controller?.abort();}void this.pump();return this.status(id);}
 setLeveling(enabled){enabled=!!enabled;if(enabled===this.enabled)return;this.enabled=enabled;this.backlog=enabled?[...this.lib.tracks.values()].filter(t=>t.available).map(t=>t.id):[];if(!enabled&&!this.foreground)this.controller?.abort();void this.pump();}
 coverage(){let total=0,ready=0,failed=0;for(const t of this.lib.tracks.values()){if(!t.available)continue;total++;if(this.read(t.id))ready++;else if(this.status(t.id).error)failed++;}return {total,ready,failed,enabled:this.enabled,running:this.running,progress:this.job.progress};}
 next(){while(this.queue.length||this.backlog.length){this.foreground=!!this.queue.length;const id=(this.foreground?this.queue:this.backlog).shift(),t=this.lib.tracks.get(id);if(t?.available&&(this.foreground||!this.read(id)&&!this.status(id).error))return id;}return null;}
 async pump(){if(this.running||this.lib.closed)return;this.running=true;
  try{let id;while(!this.lib.closed&&(id=this.next())){const t=this.lib.tracks.get(id);const stamp=audioStamp(t);this.controller=new AbortController();this.job={running:true,id,queued:this.queue.length,progress:0,error:''};
   try{await fs.access(t.path);const profile=await this.decode(t.path,{duration:t.duration,executable:path.join(this.lib.root,'tools','ffmpeg.exe'),signal:this.controller.signal,onProgress:p=>this.job.progress=p});if(!this.lib.closed&&audioStamp(this.lib.tracks.get(id)||{})===stamp){this.lib.setSetting('audioProfile:'+id,{...profile,stamp,savedAt:Date.now()});this.lib.setSetting('audioError:'+id,'');}}
   catch(e){if(this.controller.signal.aborted&&this.enabled)this.backlog.unshift(id);else if(!this.lib.closed&&!this.controller.signal.aborted){this.job.error=e.message;this.lib.setSetting('audioError:'+id,{message:e.message,stamp});}}
   this.job.running=false;this.job.id='';await new Promise(r=>setTimeout(r,200));
  }}finally{this.running=false;this.job.running=false;this.job.id='';}
 }
 stop(){clearInterval(this.refresh);this.enabled=false;this.queue=[];this.backlog=[];this.controller?.abort();}
 edit(id,value){const t=this.lib.tracks.get(id);if(!t)throw Error('Track not found');const edit=validateRange(value,t.duration);this.lib.setSetting('playbackEdit:'+id,edit);return this.status(id);}
}
