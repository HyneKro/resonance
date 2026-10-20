import {LYRICS_VERSION,lyricsStamp,lyricsQueries,chooseLyrics,lyricDocument,importedLyrics} from './lyrics.js';
import {rpc} from './native.js';
import {timingOffset} from './lyric-timing.js';

const pending=new Map();
async function query(url){
 const r=await rpc('lyricsRequest',{url});if(r.status===404)return null;
 if(r.status!==200){const e=Error('Lyrics service unavailable. Try again later.');e.status=r.status;throw e;}return r.data;
}
export async function searchMobileLyrics(track){
 const records=new Map();let error;
 for(const q of lyricsQueries(track)){try{const rows=await query('https://lrclib.net/api/search?'+new URLSearchParams(q));for(const r of Array.isArray(rows)?rows:[])if(Number.isSafeInteger(r.id))records.set(r.id,r);}catch(e){error=e;if(e.status===429)throw e;}
  if(chooseLyrics(track,[...records.values()],{textOnly:false})?.syncedLyrics)break;
 }if(!records.size&&error)throw error;return [...records.values()];
}
export const saveMobileLyrics=(track,record)=>rpc('lyricsSave',{id:track.id,record});
export function readMobileLyricsBase(track){
 const key=track.id+'|'+lyricsStamp(track);if(pending.has(key))return pending.get(key);
 const promise=(async()=>{
  const saved=await rpc('lyricsCached',{id:track.id}),old=saved.record;
  if(saved.track?.lyrics&&/selected by you/i.test(saved.track.lyricsSource)&&!old.stamp)return {text:saved.track.lyrics,source:saved.track.lyricsSource,status:'text',lines:[],confirmed:true};
  if(old.stamp===lyricsStamp(track)&&(old.confirmed||old.version===LYRICS_VERSION&&(old.text||old.instrumental||Date.now()-old.savedAt<86400000)))return old;
  try{const r=chooseLyrics(track,await searchMobileLyrics(track));
   if(r)return await saveMobileLyrics(track,lyricDocument(track,r));
   if(old.stamp===lyricsStamp(track)&&old.text)return old;
   if(saved.track?.lyrics)return {text:saved.track.lyrics,source:saved.track.lyricsSource,status:'text',lines:[]};
   return await saveMobileLyrics(track,{version:LYRICS_VERSION,stamp:lyricsStamp(track),savedAt:Date.now(),status:'missing',text:'',lines:[]});
  }catch(e){
   if(old.stamp===lyricsStamp(track)&&old.text)return old;return {text:saved.track?.lyrics||'',source:saved.track?.lyricsSource||'',status:'unavailable',message:e.message,lines:[]};}
 })().finally(()=>pending.delete(key));pending.set(key,promise);return promise;
}
const fileStamp=t=>[t.path,t.size,t.modified??t.mtime,t.duration].join('|');
async function basis(r){const data=new TextEncoder().encode(JSON.stringify([r.text,r.lines,r.source,r.syncedLyrics]));const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function mobileLyricsTiming(track,action='status',data={}){
 const base=await readMobileLyricsBase(track),saved=await rpc('lyricsCached',{id:track.id}),source=await basis(base),stamp=fileStamp(saved.track);
 let timing=saved.timing||{},offset=saved.offset||{};
 if(action==='restore'){timing={};offset={};}
 if(action==='offset')offset={fileStamp:stamp,value:timingOffset(data.value)};
 if(action==='import'){
  const record=importedLyrics(track,data.text);
  timing={base:source,fileStamp:stamp,record};offset={};
 }
 if(action!=='status')await rpc('lyricsTimingSave',{id:track.id,stamp:lyricsStamp(track),timing,offset});
 const improved=timing.base===source&&timing.fileStamp===stamp;
 return {record:{...(improved?timing.record:base),offset:offset.fileStamp===stamp?timingOffset(offset.value):0},improved,supported:false,installed:false};
}
export async function readMobileLyrics(track){return (await mobileLyricsTiming(track)).record;}
