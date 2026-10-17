import {GENRE_RESEARCH_VERSION} from './genre-research.mjs';
import {createTrackCharacter,themeCues} from './public/track-character.js';
import {exactLyrics,lyricKey,lyricRecord,findExactLyrics} from './track-lyrics.mjs';
export {exactLyrics} from './track-lyrics.mjs';
import {normalize,matchScore} from './metadata.mjs';import {remoteJSON,cacheWallpaper} from './remote-artwork.mjs';
const DAY=86400000,uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
export const researchStamp=t=>[t.title,t.artist,t.album,t.genre,Math.round(t.duration||0),t.youtubeId].join('|');
export class TrackResearch{
 constructor(lib,readIdentity,{enabled=true,json=remoteJSON,cacheImage=cacheWallpaper}={}){Object.assign(this,{lib,readIdentity,enabled,json,cacheImage});this.queue=[];this.queued=new Set();this.running=false;this.timer=null;this.abort=new AbortController();this.job={running:false,saved:0,searched:0,total:0,errors:0,updated:0};}
 seed(){if(this.lib.closed)return;for(const t of this.lib.tracks.values()){if(!this.lib.getSetting('trackCharacter:'+t.id))this.lib.setSetting('trackCharacter:'+t.id,{...createTrackCharacter(t),savedAt:Date.now(),status:'local'});}this.count();}
 count(){const rows=this.lib.db.prepare("SELECT key,value FROM settings WHERE key LIKE 'trackCharacter:%'").all();this.job.saved=rows.filter(r=>this.lib.tracks.has(r.key.slice(15))).length;this.job.total=this.lib.tracks.size;this.job.searched=this.lib.db.prepare("SELECT key,value FROM settings WHERE key LIKE 'characterResearch:%'").all().filter(r=>this.lib.tracks.has(r.key.slice(18))&&JSON.parse(r.value)?.version===4).length;}
 due(t){const saved=this.lib.getSetting('characterResearch:'+t.id);return !saved||saved.version!==4||saved.stamp!==researchStamp(t)||Date.now()-(saved.checkedAt||0)>(saved.error?DAY:30*DAY);}
 start(){if(!this.enabled||this.lib.closed)return;this.seed();const current=this.lib.getSetting('player')?.id;if(current)this.enqueue(current,true);for(const t of this.lib.tracks.values())if(t.available&&this.due(t))this.enqueue(t.id);this.pump();}
 enqueue(id,priority=false){const t=this.lib.tracks.get(id);if(!this.enabled||!t||id===this.activeId||!this.due(t))return;if(this.queued.has(id)){if(priority){this.queue=this.queue.filter(x=>x!==id);this.queue.unshift(id);}return;}this.queued.add(id);priority?this.queue.unshift(id):this.queue.push(id);this.pump();}
 stop(){this.enabled=false;clearTimeout(this.timer);this.abort.abort();this.queue=[];this.queued.clear();this.job.running=false;}
 pump(){if(this.running||this.timer||!this.enabled||this.lib.closed)return;const id=this.queue.shift();if(!id){this.job.running=false;return;}this.queued.delete(id);this.activeId=id;this.running=true;this.job.running=true;void this.research(id).catch(()=>{this.job.errors++;}).finally(()=>{this.activeId=null;this.running=false;if(!this.enabled||this.lib.closed)return;this.count();this.timer=setTimeout(()=>{this.timer=null;this.pump();},1800);this.timer.unref?.();});}
 async get(id){const profile=await this.readIdentity(id);this.enqueue(id,true);return profile;}
 async artistPhoto(track){
  const artist=track.musicbrainzArtists?.find(a=>uuid.test(a.id)&&normalize(a.name)===normalize(track.artist));if(!artist)return null;
  const key='artistWallpaper:'+artist.id,cached=this.lib.getSetting(key);if(cached&&Date.now()-cached.at<90*DAY)return cached.image;
  const entity=await this.lib.genres.entity('artist',artist.id,'url-rels');const wiki=(entity?.relations||[]).find(r=>r.type==='wikipedia'&&/^https:\/\/en\.wikipedia\.org\/wiki\//.test(r.url?.resource||''));let image=null;
  if(wiki){const title=decodeURIComponent(new URL(wiki.url.resource).pathname.slice(6));const data=await this.json('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'pageimages',piprop:'original|name',pilicense:'free',titles:title}),{signal:this.abort.signal});const page=Object.values(data?.query?.pages||{})[0];
   if(page?.original?.width>=640&&page.original.source?.startsWith('https://upload.wikimedia.org/')){
    const info=await this.json('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'extmetadata',titles:'File:'+page.pageimage}),{signal:this.abort.signal});const meta=Object.values(info?.query?.pages||{})[0]?.imageinfo?.[0]?.extmetadata;
    const plain=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,' ').slice(0,250);if(meta?.LicenseShortName?.value)image=await this.cacheImage(this.lib,page.original.source,{label:track.artist,source:wiki.url.resource,credit:plain(meta.Artist?.value),license:plain(meta.LicenseShortName.value),licenseUrl:meta.LicenseUrl?.value||'',kind:'artist'},{signal:this.abort.signal});
   }
  }if(!this.lib.closed)this.lib.setSetting(key,{at:Date.now(),image});return image;
 }
 async research(id){
  let t=this.lib.tracks.get(id);if(!t||this.lib.closed)return;const captured=researchStamp(t),prior=this.lib.getSetting('characterResearch:'+id),result={version:4,stamp:captured,checkedAt:Date.now(),cues:[],sources:[],error:''},assets=[];let candidate;
  const attempt=async fn=>{try{return await fn();}catch(e){if(this.abort.signal.aborted)throw e;result.error=e.message;return null;}};
  if(t.genreResearchVersion!==GENRE_RESEARCH_VERSION||!t.genreCheckedAt||Date.now()-t.genreCheckedAt>30*DAY)await attempt(()=>this.lib.genres.discoverTrack(id));
  t=this.lib.tracks.get(id)||t;
  if(t.artist&&t.kind!=='mix'&&t.duration<1800){
   const list=await attempt(()=>this.lib.candidates(id));const best=list?.[0];if(best?.confidence>=95&&(!list[1]||best.confidence>list[1].confidence||best.title===list[1].title&&best.artist===list[1].artist))candidate=best;
   if(candidate&&!['manual','confirmed'].includes(t.metadataStatus)){await attempt(()=>this.lib.applyCandidate(id,candidate.id,true,candidate));t=this.lib.tracks.get(id)||t;}
   const chosen=this.lib.getSetting('trackLyrics:'+id);
   const lyrics=chosen?.confirmed&&chosen.stamp===lyricKey(t)?null:await attempt(()=>findExactLyrics(t,this.json,{signal:this.abort.signal}));
   if(chosen?.confirmed&&chosen.stamp===lyricKey(t)){result.cues=themeCues(chosen.text);result.sources.push({name:'LRCLIB',url:chosen.url});}
   if(exactLyrics(t,lyrics)){result.lyrics=lyricRecord(t,lyrics);result.cues=themeCues((lyrics.plainLyrics||lyrics.syncedLyrics||'').slice(0,64000));result.instrumental=!!lyrics.instrumental;result.sources.push({name:'LRCLIB',url:'https://lrclib.net/api/get/'+lyrics.id});}
  }
  if(candidate){result.sources.push({name:'MusicBrainz',url:candidate.sourceUrl});for(const release of (candidate.releaseIds||[candidate.releaseId]).filter(x=>uuid.test(x||'')).slice(0,2)){const image=await attempt(()=>this.cacheImage(this.lib,`https://coverartarchive.org/release/${release}/front-1200`,{label:candidate.album||t.title,source:`https://musicbrainz.org/release/${release}`,kind:'cover'},{signal:this.abort.signal}));if(image)assets.push(image);}}
  if(/^[\w-]{11}$/.test(t.youtubeId||'')){const image=await attempt(()=>this.cacheImage(this.lib,`https://i.ytimg.com/vi/${t.youtubeId}/maxresdefault.jpg`,{label:t.title,source:`https://www.youtube.com/watch?v=${t.youtubeId}`,kind:'cover'},{signal:this.abort.signal}));if(image)assets.push(image);}
  const photo=await attempt(()=>this.artistPhoto(t));if(photo)assets.unshift(photo);
  if(this.lib.closed)return;const latest=this.lib.tracks.get(id);if(!latest)return;
  // Preserve old good evidence on outages, and never assign delayed results to an edited song.
  if([latest.title,latest.artist,latest.album].join('|')!==[t.title,t.artist,t.album].join('|'))return;
  result.stamp=researchStamp(latest);result.trackKey=lyricKey(latest);if(result.lyrics){const chosen=this.lib.getSetting('trackLyrics:'+id);if(!chosen?.confirmed||chosen.stamp!==lyricKey(latest))this.lib.setSetting('trackLyrics:'+id,result.lyrics);else{result.cues=themeCues(chosen.text);result.sources=result.sources.filter(s=>s.name!=='LRCLIB');result.sources.push({name:'LRCLIB',url:chosen.url});}delete result.lyrics;}if(result.error&&!result.sources.length&&prior?.trackKey===lyricKey(latest)&&prior?.sources?.length){result.cues=prior.cues;result.sources=prior.sources;}
  this.lib.setSetting('characterResearch:'+id,result);
  if(assets.length)this.lib.setSetting('wallpaper:'+id,{version:1,stamp:researchStamp(latest),assets:assets.slice(0,3),savedAt:Date.now()});
  this.job.updated++;await this.readIdentity(id);
 }
}
