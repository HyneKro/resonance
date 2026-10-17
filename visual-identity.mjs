import {lyricKey} from './track-lyrics.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {parseFile} from 'music-metadata';
import {createTrackCharacter,themeCues} from './public/track-character.js';
export function createIdentityReader(lib,{parse=parseFile}={}){
 const pending=new Map();
 function finish(track,lyrics){
  const stored=lib.getSetting('characterResearch:'+track.id),research=stored?.trackKey===lyricKey(track)?stored:null,combined={cues:Array.from({length:6},(_,i)=>(lyrics?.cues?.[i]||0)+(research?.cues?.[i]||0)),source:[lyrics?.source,research?.sources?.some(s=>s.name==='LRCLIB')?'Matched lyric cues':''].filter(Boolean).join(' + ')};
  const profile={...createTrackCharacter(track,combined,lib.getSetting('visualNotes:'+track.id)||''),savedAt:Date.now(),status:research?.sources?.length?'searched':'local',sources:research?.sources||[],instrumental:research?.instrumental||false};
  if(!lib.closed)lib.setSetting('trackCharacter:'+track.id,profile);return profile;
 }
 async function read(id){
  const track=lib.tracks.get(id);if(!track)throw Error('Track not found');
  const lyricPath=path.join(path.dirname(track.path),path.parse(track.path).name+'.lrc');
  const stat=await fs.stat(lyricPath).catch(()=>null),stamp=[track.mtime,track.size,stat?.mtimeMs,stat?.size].join('|'),key='visualLyrics:'+id;
  let lyrics=lib.getSetting(key);
  if(lyrics?.version!==1||lyrics.stamp!==stamp){
   let text='',source='',readFailed=!track.available;
   try{
    if(stat?.isFile()&&stat.size<=256000){text=await fs.readFile(lyricPath,'utf8');source='Local lyric cues';}
    if(!text&&track.available){const metadata=await parse(track.path,{duration:false,skipCovers:true});text=(metadata.common.lyrics||[]).map(t=>t.text||(t.syncText||[]).map(x=>x.text).join(' ')).join(' ');source=text?'Embedded lyric cues':'';}
   }catch{readFailed=true;}
   if(readFailed&&lyrics?.source)return finish(track,lyrics);
   lyrics={version:1,stamp,cues:themeCues(text.slice(0,32000)),source:text.trim()?source:''};if(!lib.closed)lib.setSetting(key,lyrics);
  }
  return finish(lib.tracks.get(id)||track,lyrics);
 }
 return id=>{if(!pending.has(id))pending.set(id,read(id).finally(()=>pending.delete(id)));return pending.get(id);};
}
