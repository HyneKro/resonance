import {DEFAULT_PREFERENCES} from './default-preferences.js';
import {metadataLocked} from './metadata-locks.js';
import {normalizeCollections} from './smart-collections.js';
import {VISUAL_SETTINGS,visualNumber} from './visual-settings.js';
import {sanitizeRoles} from './sound-roles.js';
const clean=(s,max=400)=>typeof s==='string'?s.replace(/[\u0000-\u001f]/g,'').slice(0,max):'';
const fold=s=>clean(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const fields=['title','artist','album','genre','date'];
const deviceKeys=new Set(['visualSyncDevices','visualSyncOffsetMs','desktopVisualSyncOffsetMs','visualSyncAuto','quality','targetFPS','hdrMode','sonaFloating','dancePosition']);
export function portablePreferences(value={}){
 const out={};
 for(const [key,def] of Object.entries({...DEFAULT_PREFERENCES,eqLow:0,eqMid:0,eqHigh:0,motion:true,sfx:true,artistGenres:true,sort:'title'})){
  if(deviceKeys.has(key)||!Object.hasOwn(value,key))continue;
  const v=value[key];
  if(typeof def==='boolean'&&typeof v==='boolean')out[key]=v;
  else if(typeof def==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000){
   const range={eqLow:[-12,6],eqMid:[-12,6],eqHigh:[-12,6],sfxVolume:[0,1],intensity:[.2,1.5],responsiveness:[.25,8],fluidity:[0,1.5],iridescence:[0,1.5],depth:[0,1.5],spectralDetail:[0,1.5],cameraSpeed:[0,20],crossfadeSeconds:[0,8]}[key];
   out[key]=VISUAL_SETTINGS[key]?visualNumber(key,v):range?Math.max(range[0],Math.min(range[1],v)):def;
  }else if(typeof def==='string'&&typeof v==='string'&&/^[\w -]{1,80}$/.test(v))out[key]=v;
 }
 if(Array.isArray(value.smartCollections))out.smartCollections=normalizeCollections(value.smartCollections);
 if(value.soundRoles&&typeof value.soundRoles==='object')out.soundRoles=sanitizeRoles(value.soundRoles);
 return out;
}
export function playlistLink(s){
 const type=s?.type||'youtube';if(!['youtube','spotify','deezer'].includes(type))return null;
 let id=clean(s.playlist,150);
 if(s.url){try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  if(type==='youtube'&&['www.youtube.com','youtube.com','music.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('list')||'';
  else if(type==='spotify'&&u.hostname==='open.spotify.com')id=u.pathname.match(/^\/(?:intl-\w+\/)?playlist\/([A-Za-z0-9]+)\/?$/)?.[1]||'';
  else if(type==='deezer'&&['www.deezer.com','deezer.com'].includes(u.hostname))id=u.pathname.match(/^\/(?:[a-z]{2}\/)?playlist\/(\d+)\/?$/)?.[1]||'';
  else return null;
 }catch{return null;}}
 if(!(type==='youtube'?/^[\w-]{2,150}$/:type==='spotify'?/^[A-Za-z0-9]{10,40}$/:/^\d{1,25}$/).test(id))return null;
 return {type,name:clean(s.name,100)||'Imported playlist',url:type==='youtube'?'https://music.youtube.com/playlist?list='+id:type==='spotify'?'https://open.spotify.com/playlist/'+id:'https://www.deezer.com/playlist/'+id,kind:s.kind==='mix'?'mix':'track'};
}
export function songIdentity(t){
 const out={title:clean(t.rawTitle||t.title),artist:clean(t.originalArtist||t.artist||t.channel),duration:Number.isFinite(t.duration)?Math.round(t.duration*10)/10:0};
 for(const [k,re]of [['youtubeId',/^[\w-]{11}$/],['spotifyId',/^[A-Za-z0-9]{22}$/],['deezerId',/^\d{1,25}$/]])if(re.test(String(t[k]||'')))out[k]=String(t[k]);
 return out;
}
function edits(t){
 const out={};
 for(const k of fields)if(metadataLocked(t,k)&&typeof t[k]==='string')out[k]=clean(t[k]);
 if(Array.isArray(t.manualArtists)&&out.artist)out.artistCredits=t.manualArtists.filter(s=>typeof s==='string').slice(0,30).map(s=>clean(s));
 if(typeof t.favorite==='boolean')out.favorite=t.favorite;
 if(t.playbackEdit&&typeof t.playbackEdit.enabled==='boolean'){
  const e=t.playbackEdit;if(!e.enabled)out.playbackEdit={enabled:false};
  else if(Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start>=0&&e.end-e.start>=1)out.playbackEdit={enabled:true,start:e.start,end:e.end};
 }
 if(Number.isFinite(t.lyricOffset))out.lyricOffset=Math.max(-60,Math.min(60,t.lyricOffset));
 return out;
}
export const recordKey=r=>{
 for(const k of ['youtubeId','spotifyId','deezerId'])if(r.identity[k])return k+':'+r.identity[k];
 return fold(r.identity.title)+'|'+fold(r.identity.artist)+'|'+r.identity.duration;
};
export function validatePortable(value){
 if(value?.format!=='resonance-settings'||value.version!==1)throw Error('Choose a Resonance settings file (version 1).');
 if(!Array.isArray(value.songs)||value.songs.length>20000||!Array.isArray(value.sources)||value.sources.length>200)throw Error('This file has an invalid or oversized collection.');
 const songs=value.songs.map(r=>{
  if(!r?.identity||!r.edits)throw Error('A song entry is incomplete.');
  const identity=songIdentity(r.identity),patch=edits({...r.edits,metadataLocks:Object.fromEntries(fields.map(k=>[k,Object.hasOwn(r.edits,k)])),manualArtists:r.edits.artistCredits});
  if(!identity.title&&!identity.youtubeId&&!identity.spotifyId&&!identity.deezerId)throw Error('A song has no usable identity.');
  if(patch.playbackEdit?.enabled&&patch.playbackEdit.end>identity.duration+.1)throw Error('A listening edit extends past its recording.');
  if(patch.artistCredits&&patch.artistCredits.join('; ')!==patch.artist)delete patch.artistCredits;
  return {identity,edits:patch};
 }).filter(r=>Object.keys(r.edits).length);
 const unique=new Map();
 for(const record of songs){const key=recordKey(record),previous=unique.get(key);if(previous&&JSON.stringify(previous)!==JSON.stringify(record))throw Error('The file contains conflicting entries for the same recording.');unique.set(key,record);}
 return {format:'resonance-settings',version:1,preferences:portablePreferences(value.preferences),sources:value.sources.map(playlistLink).filter(Boolean),songs:[...unique.values()]};
}
export function exportPortable(snapshot){
 const songs=new Map((snapshot.pending||[]).map(r=>[recordKey(r),r]));
 for(const t of snapshot.tracks||[]){const patch=edits(t);if(!Object.keys(patch).length)continue;const record={identity:songIdentity(t),edits:patch};songs.set(recordKey(record),record);}
 const links=new Map([...(snapshot.sources||[]),...(snapshot.links||[])].map(playlistLink).filter(Boolean).map(s=>[s.url,s]));
 return validatePortable({format:'resonance-settings',version:1,preferences:snapshot.preferences,sources:[...links.values()],songs:[...songs.values()]});
}
export function planPortable(bundle,tracks,{replace=false}={}){
 const byId=new Map(),byName=new Map();
 for(const t of tracks){
  for(const k of ['youtubeId','spotifyId','deezerId'])if(t[k]){const key=k+':'+t[k];byId.set(key,[...(byId.get(key)||[]),t]);}
  for(const title of new Set([t.title,t.rawTitle].filter(Boolean))){const key=fold(title)+'|'+fold(t.originalArtist||t.artist||t.channel);byName.set(key,[...(byName.get(key)||[]),t]);}
 }
 const result={ready:[],pending:[],conflicts:[],identical:0};
 for(const record of bundle.songs){
  const i=record.identity,keys=['youtubeId','spotifyId','deezerId'].filter(k=>i[k]),found=new Map();
  for(const k of keys)for(const t of byId.get(k+':'+i[k])||[])found.set(t.id,t);
  let candidates=[...found.values()];
  // Provider IDs on both sides must agree. Never reuse a cut for a different upload.
  if(!keys.length)candidates=byName.get(fold(i.title)+'|'+fold(i.artist))||[];
  candidates=candidates.filter(t=>!keys.some(k=>t[k]&&String(t[k])!==i[k])&&(!i.duration||!t.duration||Math.abs(t.duration-i.duration)<=1)&&(!record.edits.playbackEdit?.enabled||record.edits.playbackEdit.end<=Number(t.duration)+.1));
  if(candidates.length!==1){result.pending.push(record);continue;}
  const t=candidates[0],local=edits(t),patch=record.edits;
  const conflict=Object.keys(patch).some(k=>k!=='favorite'&&Object.hasOwn(local,k)&&JSON.stringify(local[k])!==JSON.stringify(patch[k]));
  if(conflict&&!replace){result.conflicts.push(record);continue;}
  if(Object.keys(patch).every(k=>JSON.stringify(local[k])===JSON.stringify(patch[k]))){result.identical++;continue;}
  result.ready.push({id:t.id,record});
 }
 // A file may identify one local recording using two different provider IDs.
 // Do not let conflicting records silently overwrite each other in file order.
 const targets=new Map();
 for(const item of result.ready){const group=targets.get(item.id)||[];group.push(item);targets.set(item.id,group);}
 result.ready=[];
 for(const group of targets.values()){
  if(group.length>1&&group.some(x=>JSON.stringify(x.record.edits)!==JSON.stringify(group[0].record.edits)))result.conflicts.push(...group.map(x=>x.record));
  else{result.ready.push(group[0]);result.identical+=group.length-1;}
 }
 return result;
}
