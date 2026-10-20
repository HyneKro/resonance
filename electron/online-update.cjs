const fs=require('node:fs/promises'),path=require('node:path');
const {RELEASES_URL,findRelease,downloadRelease,verifyFile,selectRelease}=require('./github-releases.cjs');
function restoreRelease(r,current){if(!r)return null;return selectRelease([{tag_name:r.tag,draft:false,body:r.notes,assets:[{name:r.name,state:'uploaded',size:r.bytes,digest:'sha256:'+r.sha256,browser_download_url:r.url}]}],current);}
class OnlineUpdate {
 constructor({directory,current,canInstall,emit=()=>{},find=findRelease,download=downloadRelease}){Object.assign(this,{directory,current,canInstall,emit,find,download});this.state={phase:'idle',current,canInstall,autoCheck:true,autoDownload:true,checkedAt:0,release:null,message:'Updates come directly from GitHub Releases.'};this.saving=Promise.resolve();this.ready=this.load().catch(e=>this.set({phase:'error',message:'Update storage is unavailable. '+e.message}));}
 snapshot(){return {...this.state};}
 set(patch){Object.assign(this.state,patch);this.emit(this.snapshot());return this.snapshot();}
 async load(){await fs.mkdir(this.directory,{recursive:true});try{const s=JSON.parse(await fs.readFile(path.join(this.directory,'preferences.json'),'utf8'));this.state.autoCheck=s.autoCheck!==false;this.state.autoDownload=s.autoDownload!==false;this.state.checkedAt=Number(s.checkedAt)||0;}catch{}
  try{const r=restoreRelease(JSON.parse(await fs.readFile(path.join(this.directory,'pending.json'),'utf8')),this.current);if(r&&await verifyFile(path.join(this.directory,'download.zip'),r))this.set({phase:'ready',release:r,message:`Version ${r.version} is ready. Restart when it suits you.`});else await fs.unlink(path.join(this.directory,'download.zip')).catch(()=>{});}catch{}
  return this.snapshot();
 }
 async save(){const text=JSON.stringify({autoCheck:this.state.autoCheck,autoDownload:this.state.autoDownload,checkedAt:this.state.checkedAt});const next=this.saving.catch(()=>{}).then(async()=>{const file=path.join(this.directory,'preferences.json');await fs.writeFile(file+'.tmp',text);await fs.rename(file+'.tmp',file);});this.saving=next;await next;}
 async preferences(p){await this.ready;if(typeof p.autoCheck==='boolean')this.state.autoCheck=p.autoCheck;if(typeof p.autoDownload==='boolean')this.state.autoDownload=p.autoDownload;await this.save();return this.set({});}
 async check(automatic=false){await this.ready;if(this.busy||['preparing','restarting'].includes(this.state.phase)||automatic&&(this.state.phase==='ready'||!this.state.autoCheck||Date.now()-this.state.checkedAt<6*3600000))return this.snapshot();const prepared=this.state.phase==='ready'?this.snapshot():null;this.busy=true;this.abort=new AbortController();this.set({phase:'checking',message:'Checking GitHub Releases…'});
  try{const release=await this.find(this.current,{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(30000)])});if(prepared&&(!release||release.version===prepared.release.version))this.set({...prepared,checkedAt:Date.now()});else this.set({checkedAt:Date.now(),release,phase:release?'available':'current',message:release?`Version ${release.version} is available.`:'You have the latest version.'});await this.save();}
  catch(e){const message=this.abort.signal.aborted?'Update check cancelled.':e.message;this.set(prepared?{...prepared,message:message+' Your downloaded update is still available.'}:{phase:'error',message});}finally{this.busy=false;}
  if(this.state.phase==='available'&&this.state.autoDownload&&this.canInstall)return this.startDownload();return this.snapshot();
 }
 async startDownload(){await this.ready;if(this.busy||!this.state.release||!this.canInstall||this.state.phase==='ready')return this.snapshot();this.busy=true;this.abort=new AbortController();const r=this.state.release;this.set({phase:'downloading',received:0,message:`Downloading ${r.version}…`});
  try{await this.download(r,path.join(this.directory,'download.zip'),{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(30*60000)]),onProgress:(received,total)=>this.set({received,total})});await fs.writeFile(path.join(this.directory,'pending.json'),JSON.stringify(r));this.set({phase:'ready',message:`Version ${r.version} is verified and ready. Your music and settings will stay in place.`});}
  catch(e){this.set({phase:this.abort.signal.aborted?'available':'error',message:this.abort.signal.aborted?'Download cancelled.':e.message});}finally{this.busy=false;}return this.snapshot();
 }
 cancel(){this.abort?.abort();return this.snapshot();}
 async archive(){await this.ready;if(this.busy||this.state.phase!=='ready'||!this.state.release)throw Error('Download an update first.');const file=path.join(this.directory,'download.zip');if(!await verifyFile(file,this.state.release)){this.set({phase:'error',message:'The saved update has changed. Download it again.'});throw Error(this.state.message);}return {file,version:this.state.release.version};}
 close(){this.abort?.abort();}
}
module.exports={OnlineUpdate,restoreRelease,RELEASES_URL};
