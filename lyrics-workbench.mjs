import {createHash,randomUUID} from 'node:crypto';
import {audioStamp} from './audio-research.mjs';
import {importedLyrics} from './public/lyrics.js';
import {timingOffset} from './public/lyric-timing.js';
import {checkLyricsEngine,installLyricsEngine,analyzeLyricsAudio} from './lyrics-engine.mjs';
const basis=r=>createHash('sha256').update(JSON.stringify([r.text,r.lines,r.source,r.syncedLyrics,r.offset||0])).digest('hex');
export class LyricsWorkbench {
 constructor(lib,read,{analyze=analyzeLyricsAudio,install=installLyricsEngine,check=checkLyricsEngine}={}){
  Object.assign(this,{lib,read,analyze,install,check});this.job={running:false};this.controller=null;this.verified=false;
 }
 track(id){const t=this.lib.tracks.get(id);if(!t)throw Error('Song not found');return t;}
 saved(id,base){const t=this.track(id),entry=this.lib.getSetting('lyricTiming:'+id),offset=this.lib.getSetting('lyricOffset:'+id);return {...(entry?.fileStamp===audioStamp(t)&&entry.base===basis(base)?entry.record:base),offset:offset?.fileStamp===audioStamp(t)?timingOffset(offset.value):0};}
 async status(id){
  const t=this.track(id),base=await this.read(id),proposal=this.lib.getSetting('lyricProposal:'+id),saved=this.lib.getSetting('lyricTiming:'+id);
  return {record:this.saved(id,base),installed:await this.check(this.lib.dataDir),supported:process.platform==='win32'&&process.arch==='x64',job:this.job,
   improved:saved?.fileStamp===audioStamp(t)&&saved.base===basis(base),proposal:proposal?.fileStamp===audioStamp(t)&&proposal.base===basis(base)&&proposal.input===basis(this.saved(id,base))?proposal:null};
 }
 start(id,kind){
  if(this.job.running)throw Error('One lyrics task is already running. Wait or cancel it first.');
  const t=this.track(id);if(kind==='analyze'&&(!t.available||!(t.duration>0)||t.duration>1200))throw Error('Choose an available song under 20 minutes.');
  const controller=new AbortController();this.controller=controller;this.job={running:true,id,kind,progress:0,message:kind==='install'?'Downloading the local lyrics tool…':'Checking this recording…'};
  void (async()=>{
   try{
    if(kind==='install'){if(!await this.check(this.lib.dataDir))await this.install(this.lib.dataDir,{signal:controller.signal,onProgress:p=>this.job.progress=p});this.job.message='Local lyrics tool is ready.';}
    else{
     const base=await this.read(id),input=this.saved(id,base),stamp=audioStamp(t),source=basis(base),inputStamp=basis(input);
     if(!input.text||input.instrumental)throw Error('Find or import the lyrics first. This pass aligns existing words.');
     if(!this.verified){if(!await this.check(this.lib.dataDir,{verify:true}))throw Error('Install the local lyrics tool first.');this.verified=true;}
     const value=await this.analyze(this.lib.dataDir,t,input,{signal:controller.signal,onProgress:p=>this.job.progress=p});
     if(controller.signal.aborted)throw Error('Cancelled');
     const fresh=await this.read(id);
     if(this.lib.closed||audioStamp(this.track(id))!==stamp||basis(fresh)!==source||basis(this.saved(id,fresh))!==inputStamp)throw Error('The song or lyrics changed during analysis. Please run it again.');
     this.lib.setSetting('lyricProposal:'+id,{id:randomUUID(),fileStamp:stamp,base:source,input:inputStamp,record:value});
     this.job.message='Timing proposal ready. Preview it before saving.';
    }
   }catch(e){this.job.message=controller.signal.aborted?'Cancelled. Your lyrics are unchanged.':e.message;}
   finally{this.job.running=false;}
  })();
  return {job:this.job};
 }
 async change(id,action,data={}){
  const t=this.track(id),base=await this.read(id),fileStamp=audioStamp(t);
  if(action==='offset'){if(!Number.isFinite(Number(data.value)))throw Error('Invalid timing adjustment');this.lib.setSetting('lyricOffset:'+id,{fileStamp,value:timingOffset(data.value)});}
  else if(action==='restore'){this.lib.setSetting('lyricTiming:'+id,null);this.lib.setSetting('lyricOffset:'+id,null);}
  else if(action==='apply'){
   const p=this.lib.getSetting('lyricProposal:'+id);if(!p||p.id!==data.proposalId||p.fileStamp!==fileStamp||p.base!==basis(base)||p.input!==basis(this.saved(id,base)))throw Error('This proposal is out of date. Check the song again.');
   this.lib.setSetting('lyricTiming:'+id,{fileStamp,base:p.base,record:p.record});this.lib.setSetting('lyricOffset:'+id,null);this.lib.setSetting('lyricProposal:'+id,null);
  }else if(action==='import'){
   const r=importedLyrics(t,data.text);
   this.lib.setSetting('lyricTiming:'+id,{fileStamp,base:basis(base),record:r});this.lib.setSetting('lyricOffset:'+id,null);
  }else throw Error('Unknown lyrics action');
  return this.status(id);
 }
 cancel(){this.controller?.abort();return {job:this.job};}
 stop(){this.controller?.abort();}
}
