import {validatePortable,planPortable} from './public/portable-settings.js';
import {inheritedLocks} from './public/metadata-locks.js';
import {metadataSnapshot} from './public/metadata-review.js';
import {validateRange} from './public/song-analysis.js';
import {audioStamp} from './audio-research.mjs';
export function transferSnapshot(lib){
 const saved=lib.getSetting('portableSettings')||{};
 return {preferences:lib.config.preferences,sources:lib.config.sources,pending:saved.songs||[],links:saved.sources||[],tracks:lib.list().map(t=>({...t,playbackEdit:lib.getSetting('playbackEdit:'+t.id),lyricOffset:lib.getSetting('lyricOffset:'+t.id)?.value}))};
}
export function storeTransfer(lib,value){
 const clean=validatePortable({format:'resonance-settings',version:1,preferences:{},songs:value.songs,sources:value.sources});
 lib.setSetting('portableSettings',clean);return {ok:true};
}
export function applyTransfer(lib,value){
 const bundle=validatePortable(value.bundle),plan=planPortable(bundle,transferSnapshot(lib).tracks,{replace:value.replace===true});
 // Validate every listening edit before modifying the library.
 for(const item of plan.ready)if(item.record.edits.playbackEdit)validateRange(item.record.edits.playbackEdit,lib.tracks.get(item.id).duration);
 const previous=new Map(lib.tracks);lib.db.exec('BEGIN');
 try{
  for(const {id,record}of plan.ready){
   const t=lib.tracks.get(id),e=record.edits,patch={},locks=inheritedLocks(t);
   for(const k of ['title','artist','album','genre','date'])if(Object.hasOwn(e,k)){patch[k]=e[k];locks[k]=true;}
   if(Object.keys(patch).length){patch.metadataLocks=locks;patch.metadataStatus='manual';patch.metadataSource='Your imported edits';}
   if(Object.hasOwn(patch,'artist')){patch.manualArtists=e.artistCredits||null;patch.musicbrainzArtists=[];}
   if(['title','artist'].some(k=>Object.hasOwn(patch,k)&&patch[k]!==t[k])){patch.metadataUrl='';patch.musicbrainzArtists=[];if(!locks.genre&&!t.genreLocked&&t.genre)patch.genreIdentityStale=true;}
   if(Object.hasOwn(patch,'genre')){patch.genreLocked=true;patch.genreBasis='manual';patch.genreIdentityStale=false;patch.genreEvidence=[];}
   if(Object.hasOwn(e,'favorite'))patch.favorite=e.favorite;
   const updated=lib.save({...t,...patch});
   if(patch.metadataLocks)lib.setSetting('metadataUndo:'+id,{before:metadataSnapshot(t),after:metadataSnapshot(updated)});
   if(e.playbackEdit)lib.setSetting('playbackEdit:'+id,validateRange(e.playbackEdit,t.duration));
   if(Number.isFinite(e.lyricOffset))lib.setSetting('lyricOffset:'+id,{fileStamp:audioStamp(t),value:e.lyricOffset});
  }
  lib.db.exec('COMMIT');
 }catch(error){lib.db.exec('ROLLBACK');lib.tracks=previous;throw error;}
 return {applied:plan.ready.length};
}
