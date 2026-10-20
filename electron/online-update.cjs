const fs=require('node:fs/promises'),path=require('node:path');
const {RELEASES_URL,findRelease,downloadRelease,verifyFile,selectRelease,compareVersions,updateChannel}=require('./github-releases.cjs');
const checkInterval=state=>state.failedVersion||state.phase==='error'?5*60000:state.release?30*60000:6*3600000;
function restoreRelease(r,current){if(!r)return null;return selectRelease([{tag_name:r.tag,draft:false,body:r.notes,assets:[{name:r.name,state:'uploaded',size:r.bytes,digest:'sha256:'+r.sha256,browser_download_url:r.url}]}],current);}
class OnlineUpdate {
 constructor({directory,current,canInstall,emit=()=>{},find=findRelease,download=downloadRelease}){Object.assign(this,{directory,current,canInstall,emit,find,download});this.state={phase:'idle',current,channel:updateChannel(current),canInstall,autoCheck:true,autoDownload:true,checkedAt:0,release:null,message:'Updates come directly from GitHub Releases.'};this.saving=Promise.resolve();this.ready=this.load().catch(e=>this.set({phase:'error',message:'Update storage is unavailable. '+e.message}));}
 snapshot(){return {...this.state};}
 set(patch){Object.assign(this.state,patch);this.emit(this.snapshot());return this.snapshot();}
 async load(){await fs.mkdir(this.directory,{recursive:true});try{const s=JSON.parse(await fs.readFile(path.join(this.directory,'preferences.json'),'utf8'));this.state.autoCheck=s.autoCheck!==false;this.state.autoDownload=s.autoDownload!==false;this.state.checkedAt=s.channel===this.state.channel?Number(s.checkedAt)||0:0;this.state.failedVersion=s.channel===this.state.channel?String(s.failedVersion||''):'';}catch{}
  try{const r=restoreRelease(JSON.parse(await fs.readFile(path.join(this.directory,'pending.json'),'utf8')),this.current);if(r&&await verifyFile(path.join(this.directory,'download.zip'),r))this.set({phase:r.version===this.state.failedVersion?'error':'ready',release:r,message:r.version===this.state.failedVersion?'This update could not be installed. Check for a newer release or download it again.':`Version ${r.version} is ready. Restart when it suits you.`});else await fs.unlink(path.join(this.directory,'download.zip')).catch(()=>{});}catch{}
  return this.snapshot();
 }
 async save(){const text=JSON.stringify({channel:this.state.channel,autoCheck:this.state.autoCheck,autoDownload:this.state.autoDownload,checkedAt:this.state.checkedAt,failedVersion:this.state.failedVersion||''});const next=this.saving.catch(()=>{}).then(async()=>{const file=path.join(this.directory,'preferences.json');await fs.writeFile(file+'.tmp',text);await fs.rename(file+'.tmp',file);});this.saving=next;await next;}
 async preferences(p){await this.ready;if(typeof p.autoCheck==='boolean')this.state.autoCheck=p.autoCheck;if(typeof p.autoDownload==='boolean')this.state.autoDownload=p.autoDownload;await this.save();return this.set({});}
 async check(automatic=false,{forInstall=false}={}){await this.ready;if(this.busy||this.installing&&!forInstall||['preparing','restarting'].includes(this.state.phase)||automatic&&(!this.state.autoCheck||Date.now()-this.state.checkedAt<checkInterval(this.state)))return this.snapshot();const before=this.snapshot(),prepared=before.phase==='ready'?before:null;this.busy=true;this.abort=new AbortController();this.set({phase:'checking',checkedAt:Date.now(),message:this.state.channel==='development'?'Checking for development updates…':'Checking for approved updates…'});
  try{let release=await this.find(this.current,{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(30000)])});
   // A stale GitHub response must not replace a newer known package with an older one.
   if(before.release&&(!release||compareVersions(release.version,before.release.version)<0))release=before.release;
   if(prepared&&release?.version===prepared.release.version)this.set({...prepared,checkedAt:Date.now()});
   else if(release?.version===this.state.failedVersion)this.set({release,phase:'error',message:'No newer release is available yet. The failed update will not be retried automatically. You can check again or download it again.'});
   else this.set({release,phase:release?'available':'current',message:release?`Version ${release.version} is available.`:(this.state.channel==='development'?'You have the latest development build.':'You have the latest approved version.')});
  }catch(e){const message=this.abort.signal.aborted?'Update check cancelled.':e.message;this.set(prepared?{...prepared,checkedAt:Date.now(),message:message+' Your downloaded update is still available.'}:{phase:'error',message});}
  finally{try{await this.save();}finally{this.busy=false;}}
  if(this.state.phase==='available'&&this.state.autoDownload&&this.canInstall)return this.startDownload({forInstall});return this.snapshot();
 }
 async startDownload({forInstall=false}={}){await this.ready;if(this.busy||this.installing&&!forInstall||!this.state.release||!this.canInstall||['ready','preparing','restarting'].includes(this.state.phase))return this.snapshot();this.busy=true;this.abort=new AbortController();const r=this.state.release;this.set({phase:'downloading',received:0,message:`Downloading ${r.version}…`});
  try{await this.download(r,path.join(this.directory,'download.zip'),{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(30*60000)]),onProgress:(received,total)=>this.set({received,total})});await fs.writeFile(path.join(this.directory,'pending.json'),JSON.stringify(r));this.set({phase:'ready',failedVersion:'',message:`Version ${r.version} is verified and ready. Your music and settings will stay in place.`});await this.save();}
  catch(e){this.set({phase:this.abort.signal.aborted?'available':'error',message:this.abort.signal.aborted?'Download cancelled.':e.message});}finally{this.busy=false;}return this.snapshot();
 }
 cancel(){this.abort?.abort();return this.snapshot();}
 async archive(){await this.ready;if(this.busy||this.state.phase!=='ready'||!this.state.release)throw Error('Download an update first.');const file=path.join(this.directory,'download.zip');if(!await verifyFile(file,this.state.release)){this.set({phase:'error',message:'The saved update has changed. Download it again.'});throw Error(this.state.message);}return {file,version:this.state.release.version};}
 async install(installArchive){
  await this.ready;if(this.busy||this.installing||this.state.phase!=='ready')return this.snapshot();
  this.installing=true;const requested=this.state.release.version;
  try{
   await this.check(false,{forInstall:true});
   // A replacement gets its own ready state and user confirmation, never a silent restart.
   if(this.abort?.signal.aborted||this.state.phase!=='ready'||this.state.release.version!==requested)return this.snapshot();
   const r=await this.archive();this.set({phase:'preparing',message:'Checking and preparing the update…'});
   const result=await installArchive(r.file,r.version);
   if(result.error)throw Error(result.error);
   return this.set({phase:result.restarting?'restarting':'ready',message:result.message||(result.restarting?'Restarting to install…':'Ready whenever you are.')});
  }catch(e){
   this.set({phase:'error',failedVersion:requested,message:e.message});await this.save();
   // One bounded recovery lookup; never automatically retry the same rejected version.
   await this.check(false,{forInstall:true});return this.snapshot();
  }finally{this.installing=false;}
 }
 close(){this.abort?.abort();}
}
module.exports={OnlineUpdate,restoreRelease,checkInterval,RELEASES_URL};
