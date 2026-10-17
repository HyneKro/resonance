import {randomUUID} from 'node:crypto';
import {matchScore,searchTitle,searchArtist} from './metadata.mjs';
import {lyricKey,lyricRecord} from './track-lyrics.mjs';
import {remoteJSON} from './remote-artwork.mjs';
import {themeCues} from './public/track-character.js';
import {metadataSnapshot} from './public/metadata-review.js';
export function createTrackSearch(lib,{json=remoteJSON}={}){
 const pending=new Map();
 async function search(id,{artist,title}={}){
  const track=lib.tracks.get(id);if(!track)throw Error('Track not found');
  const request=randomUUID(),stamp=lyricKey(track),metadataStamp=JSON.stringify(metadataSnapshot(track));pending.set(id,request);
  title=String(title??track.title??'').slice(0,300).trim();artist=searchArtist(String(artist??track.artist??'').slice(0,200).trim());
  if(!title)throw Error('Enter a song title.');
  const results=await Promise.allSettled([
   lib.candidates(id,artist?artist+' - '+searchTitle(title,artist):searchTitle(title,artist),{force:true}),
   json('https://lrclib.net/api/search?'+new URLSearchParams({track_name:searchTitle(title,artist),...(artist?{artist_name:artist}:{})}))
  ]);
  const recordings=results[0].status==='fulfilled'?results[0].value:[],raw=results[1].status==='fulfilled'&&Array.isArray(results[1].value)?results[1].value:[];
  const lyrics=raw.filter(r=>Number.isSafeInteger(r.id)&&r.id>0&&(r.plainLyrics||r.syncedLyrics||r.instrumental)).slice(0,50).map(r=>({id:String(r.id),title:r.trackName,artist:r.artistName,album:r.albumName||'',duration:r.duration||0,confidence:Math.round(matchScore(track,{title:r.trackName,artist:r.artistName,duration:r.duration})*100),...lyricRecord(track,r)})).sort((a,b)=>b.confidence-a.confidence).slice(0,12);
  const errors=results.flatMap((r,i)=>r.status==='rejected'?[`${i?'LRCLIB':'MusicBrainz'}: ${r.reason.message}`]:[]);
  const value={request,stamp,metadataStamp,recordings,lyrics,errors,searchedAt:Date.now()};
  if(lib.closed||lyricKey(lib.tracks.get(id)||{})!==stamp)throw Error('The song changed during the search. Search again.');
  if(pending.get(id)!==request)throw Error('A newer search is already in progress.');
  lib.setSetting('trackSearch:'+id,value);pending.delete(id);return value;
 }
 async function apply(id,{request,kind,candidateId,fields}={}){
  const t=lib.tracks.get(id),saved=lib.getSetting('trackSearch:'+id);if(!t)throw Error('Track not found');
  if(!saved||saved.request!==request||saved.stamp!==lyricKey(t))throw Error('These results are out of date. Search again.');
  if(kind==='lyrics'){
   const c=saved.lyrics.find(c=>c.id===String(candidateId));if(!c)throw Error('Choose a result from this search.');
   const value={stamp:lyricKey(t),savedAt:Date.now(),source:c.source,url:c.url,text:c.text,instrumental:c.instrumental,confirmed:true};
   lib.setSetting('trackLyrics:'+id,value);
   // A chosen lyric also refreshes the stored visual cues without inventing themes.
   const prior=lib.getSetting('characterResearch:'+id)||{};lib.setSetting('characterResearch:'+id,{...prior,trackKey:lyricKey(t),cues:themeCues(c.text),sources:[...(prior.sources||[]).filter(s=>s.name!=='LRCLIB'),{name:'LRCLIB',url:c.url}]});
   return value;
  }
  if(kind!=='recording')throw Error('Choose recording details or lyrics.');
  if(saved.metadataStamp!==JSON.stringify(metadataSnapshot(t)))throw Error('Song details changed. Search again to compare the current values.');
  const c=saved.recordings.find(c=>c.id===candidateId);if(!c)throw Error('Choose a result from this search.');
  // Pass the already validated snapshot. Background research cannot replace it.
  return lib.applyCandidate(id,candidateId,false,c,fields);
 }
 return {search,apply};
}
