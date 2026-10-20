import {createHash} from 'node:crypto';
import {audioStamp} from './audio-research.mjs';
import {importedLyrics} from './public/lyrics.js';
import {timingOffset} from './public/lyric-timing.js';

// Preserve the saved-lyrics fingerprint used by earlier releases.
const basis=r=>createHash('sha256').update(JSON.stringify([r.text,r.lines,r.source,r.syncedLyrics,r.offset||0])).digest('hex');
export class LyricsSettings {
 constructor(lib,read){Object.assign(this,{lib,read});}
 track(id){const t=this.lib.tracks.get(id);if(!t)throw Error('Song not found');return t;}
 saved(id,base){
  const t=this.track(id),entry=this.lib.getSetting('lyricTiming:'+id),offset=this.lib.getSetting('lyricOffset:'+id);
  return {...(entry?.fileStamp===audioStamp(t)&&entry.base===basis(base)?entry.record:base),
   offset:offset?.fileStamp===audioStamp(t)?timingOffset(offset.value):0};
 }
 async status(id){
  const t=this.track(id),base=await this.read(id),saved=this.lib.getSetting('lyricTiming:'+id);
  return {record:this.saved(id,base),improved:saved?.fileStamp===audioStamp(t)&&saved.base===basis(base)};
 }
 async change(id,action,data={}){
  const t=this.track(id),base=await this.read(id),fileStamp=audioStamp(t);
  if(action==='offset'){
   if(!Number.isFinite(Number(data.value)))throw Error('Invalid timing adjustment');
   this.lib.setSetting('lyricOffset:'+id,{fileStamp,value:timingOffset(data.value)});
  }else if(action==='restore'){
   this.lib.setSetting('lyricTiming:'+id,null);this.lib.setSetting('lyricOffset:'+id,null);
  }else if(action==='import'){
   const record=importedLyrics(t,data.text);
   this.lib.setSetting('lyricTiming:'+id,{fileStamp,base:basis(base),record});this.lib.setSetting('lyricOffset:'+id,null);
  }else throw Error('Unknown lyrics action');
  return this.status(id);
 }
}
