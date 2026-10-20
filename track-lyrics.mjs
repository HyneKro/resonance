import fs from 'node:fs/promises';import path from 'node:path';import {parseFile,TimestampFormat} from 'music-metadata';
import {lyricsJSON,searchLyrics} from './lyrics-provider.mjs';
import {LYRICS_VERSION,lyricsStamp,lyricsMatch,lyricDocument,chooseLyrics} from './public/lyrics.js';
import {searchTitle,searchArtist} from './metadata.mjs';
export const lyricKey=lyricsStamp;
export const exactLyrics=(t,r)=>lyricsMatch(t,r).timed;
export async function findExactLyrics(t,json=lyricsJSON,options={}){
 let error,fallback;
 try{const r=await json('https://lrclib.net/api/get?'+new URLSearchParams({track_name:searchTitle(t.title,t.artist),artist_name:searchArtist(t.artist),album_name:t.album||'',duration:String(Math.round(t.duration))}),options);if(exactLyrics(t,r)&&(r.plainLyrics||r.syncedLyrics||r.instrumental)){if(r.syncedLyrics||r.instrumental)return r;fallback=r;}}
 catch(e){if(e.status===429||options.signal?.aborted)throw e;error=e;}
 try{return chooseLyrics(t,await searchLyrics(t,json,options),{textOnly:!!options.textOnly})||fallback||null;}catch(e){if(fallback)return fallback;throw error||e;}
}
export const lyricRecord=(t,r)=>lyricDocument(t,r);
export function embeddedLyrics(tags=[]){
 return tags.map(tag=>tag.syncText?.length?tag.syncText.map(line=>{
  if(tag.timeStampFormat!==TimestampFormat.milliseconds||!Number.isFinite(line.timestamp))return line.text;
  const seconds=Math.max(0,line.timestamp)/1000;
  return `[${Math.floor(seconds/60)}:${(seconds%60).toFixed(3).padStart(6,'0')}]${line.text}`;
 }).join('\n'):tag.text||'').join('\n');
}
export function createLyricsReader(lib,{json=lyricsJSON,parse=parseFile}={}){
 const pending=new Map();
 async function read(id){
  const t=lib.tracks.get(id);if(!t)throw Error('Track not found');const stamp=lyricKey(t),key='trackLyrics:'+id,previous=lib.getSetting(key),file=path.join(path.dirname(t.path),path.parse(t.path).name+'.lrc'),stat=await fs.stat(file).catch(()=>null);
  const localStamp=[t.mtime,t.size,stat?.mtimeMs,stat?.size].join('|'),local=lib.getSetting('localLyrics:'+id);
  if(previous?.confirmed&&previous.stamp===stamp)return previous;
  if(local?.version===LYRICS_VERSION&&local?.stamp===localStamp&&local.text)return local;
  if(local?.version!==LYRICS_VERSION||local?.stamp!==localStamp){try{
   let text='',source='';if(stat?.isFile()&&stat.size<=256000){text=await fs.readFile(file,'utf8');source='Local lyrics';}
   if(!text&&t.available){const m=await parse(t.path,{duration:false,skipCovers:true});text=embeddedLyrics(m.common.lyrics);source='Embedded lyrics';}
   const value={...lyricDocument(t,{plainLyrics:text,syncedLyrics:text,source},{local:true}),stamp:localStamp};if(!lib.closed)lib.setSetting('localLyrics:'+id,value);if(value.text)return value;
  }catch{/* Retain locally saved lyrics when the audio drive is disconnected. */if(local?.text)return local;}}
  if(previous?.version===LYRICS_VERSION&&previous?.stamp===stamp&&(previous.text||previous.instrumental||Date.now()-previous.savedAt<86400000))return previous;
  if(!t.artist||!t.duration||t.kind==='mix')return {text:'',message:'No matched lyrics available for this recording.'};
  try{const r=await findExactLyrics(t,json,{textOnly:true});
   const chosen=lib.getSetting(key);if(chosen?.confirmed&&chosen.stamp===stamp)return chosen;
   const value=r?lyricRecord(t,r):previous?.stamp===stamp&&previous.text?{...previous,version:LYRICS_VERSION,status:'text'}:{version:LYRICS_VERSION,stamp,savedAt:Date.now(),text:'',status:'missing',message:'No reliable lyric match found yet. Try Find lyrics to review other recordings.'};if(!lib.closed&&lyricKey(lib.tracks.get(id)||{})===stamp)lib.setSetting(key,value);return value;
  }catch{return previous?.stamp===stamp&&(previous.text||previous.instrumental)?previous:{text:'',status:'unavailable',message:'Lyrics service is unavailable right now. Try Find lyrics again later.'};}
 }
 return id=>{if(!pending.has(id))pending.set(id,read(id).finally(()=>pending.delete(id)));return pending.get(id);};
}
