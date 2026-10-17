import fs from 'node:fs/promises';import path from 'node:path';import {parseFile} from 'music-metadata';
import {normalize,matchScore,searchTitle,searchArtist} from './metadata.mjs';import {remoteJSON} from './remote-artwork.mjs';
export const lyricKey=t=>[t.title,t.artist,t.album,Math.round(t.duration||0)].join('|');
export function exactLyrics(t,r){return !!r&&normalize(searchTitle(r.trackName))===normalize(searchTitle(t.title,t.artist))&&normalize(searchArtist(r.artistName))===normalize(searchArtist(t.artist))&&Number.isFinite(r.duration)&&t.duration>0&&Math.abs(r.duration-t.duration)<=3&&matchScore(t,{title:r.trackName,artist:r.artistName,duration:r.duration})>=.95;}
export async function findExactLyrics(t,json=remoteJSON,options={}){
 const r=await json('https://lrclib.net/api/get?'+new URLSearchParams({track_name:searchTitle(t.title,t.artist),artist_name:searchArtist(t.artist),album_name:t.album||'',duration:String(Math.round(t.duration))}),options);
 if(exactLyrics(t,r))return r;
 const matches=await json('https://lrclib.net/api/search?'+new URLSearchParams({track_name:searchTitle(t.title,t.artist),artist_name:searchArtist(t.artist)}),options);
 return (Array.isArray(matches)?matches:[]).filter(r=>exactLyrics(t,r)&&(r.plainLyrics||r.syncedLyrics||r.instrumental)).sort((a,b)=>Math.abs(a.duration-t.duration)-Math.abs(b.duration-t.duration))[0]||null;
}
export function lyricRecord(t,r){return {stamp:lyricKey(t),savedAt:Date.now(),source:'LRCLIB',url:'https://lrclib.net/api/get/'+r.id,instrumental:!!r.instrumental,text:String(r.plainLyrics||r.syncedLyrics||'').replace(/\[\d+:\d+(?:\.\d+)?\]/g,'').slice(0,64000)};}
export function createLyricsReader(lib,{json=remoteJSON,parse=parseFile}={}){
 const pending=new Map();
 async function read(id){
  const t=lib.tracks.get(id);if(!t)throw Error('Track not found');const stamp=lyricKey(t),key='trackLyrics:'+id,previous=lib.getSetting(key),file=path.join(path.dirname(t.path),path.parse(t.path).name+'.lrc'),stat=await fs.stat(file).catch(()=>null);
  const localStamp=[t.mtime,t.size,stat?.mtimeMs,stat?.size].join('|'),local=lib.getSetting('localLyrics:'+id);
  if(previous?.confirmed&&previous.stamp===stamp)return previous;
  if(local?.stamp===localStamp&&local.text)return local;
  if(local?.stamp!==localStamp){try{
   let text='',source='';if(stat?.isFile()&&stat.size<=256000){text=await fs.readFile(file,'utf8');source='Local lyrics';}
   if(!text&&t.available){const m=await parse(t.path,{duration:false,skipCovers:true});text=(m.common.lyrics||[]).map(x=>x.text||(x.syncText||[]).map(y=>y.text).join('\n')).join('\n');source='Embedded lyrics';}
   const value={stamp:localStamp,text:text.replace(/\[\d+:\d+(?:\.\d+)?\]/g,'').slice(0,64000),source,savedAt:Date.now()};if(!lib.closed)lib.setSetting('localLyrics:'+id,value);if(value.text)return value;
  }catch{/* Retain locally saved lyrics when the audio drive is disconnected. */if(local?.text)return local;}}
  if(previous?.stamp===stamp&&(previous.text||previous.instrumental||Date.now()-previous.savedAt<86400000))return previous;
  if(!t.artist||!t.duration||t.kind==='mix')return {text:'',message:'No matched lyrics available for this recording.'};
  try{const r=await findExactLyrics(t,json);
   const chosen=lib.getSetting(key);if(chosen?.confirmed&&chosen.stamp===stamp)return chosen;
   const value=exactLyrics(t,r)?lyricRecord(t,r):{stamp,savedAt:Date.now(),text:'',message:'No exact lyric match found yet.'};if(!lib.closed&&lyricKey(lib.tracks.get(id)||{})===stamp)lib.setSetting(key,value);return value;
  }catch{return previous?.stamp===stamp?previous:{text:'',message:'Lyrics are unavailable right now. Try again when connected.'};}
 }
 return id=>{if(!pending.has(id))pending.set(id,read(id).finally(()=>pending.delete(id)));return pending.get(id);};
}
