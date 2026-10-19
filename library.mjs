import {metadataLocked} from './public/metadata-locks.js';
import {metadataSnapshot,selectedMetadata} from './public/metadata-review.js';
import {repairArtistCredits,ARTIST_CREDIT_VERSION} from './public/artist-credits.js';
import {preferencesWithDefaults} from './public/default-preferences.js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { parseFile } from 'music-metadata';
import { inferName, matchScore, searchTitle, searchArtist } from './metadata.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GenreDiscovery, providerGenres } from './genres.mjs';
import { sourceType, sourceFiles, validateSource } from './sources.mjs';
const executeFile=promisify(execFile);

const audioExtensions = new Set(['.flac','.mp3','.m4a','.aac','.ogg','.opus','.wav','.webm','.aiff']);
const delay = ms=>new Promise(r=>setTimeout(r,ms));
export class Library {
  constructor(root, dataDir) {
    this.root=root; this.dataDir=dataDir;
    fs.mkdirSync(path.join(dataDir,'artwork'),{recursive:true});
    this.db=new DatabaseSync(path.join(dataDir,'library.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS tracks(id TEXT PRIMARY KEY, path TEXT UNIQUE, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT); CREATE TABLE IF NOT EXISTS playlists(id TEXT PRIMARY KEY, name TEXT, tracks TEXT); CREATE TABLE IF NOT EXISTS candidates(track_id TEXT PRIMARY KEY, data TEXT);`);
    this.tracks=new Map(this.db.prepare('SELECT data FROM tracks').all().map(r=>{const t=JSON.parse(r.data);return [t.id,t]}));
    this.config=this.getSetting('config') || (fs.existsSync(path.join(root,'config.json'))?JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8')):{sources:[],downloadFormat:'best',autoEnrich:false,autoGenres:false});
    this.config.preferences=preferencesWithDefaults(this.config.preferences);
    this.config.sources=(this.config.sources||[]).map(source=>({...source,type:sourceType(source)}));
    this.setSetting('config',this.config);
    this.scanJob={running:false,done:0,total:0,errors:[]}; this.enrichJob={running:false,done:0,total:0,matched:0,errors:0};
    this.mbQueue=Promise.resolve(); this.mbLast=0; this.closed=false;
    // One transaction keeps the initial credit migration from making thousands
    // of individual disk commits during startup.
    this.db.exec('BEGIN');
    try{for(const t of this.tracks.values())if(t.artistCreditVersion!==ARTIST_CREDIT_VERSION)this.save(t);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}
    this.genres=new GenreDiscovery(this);this.genres.seed();this.applyPlaylistOrder();
  }
  getSetting(key) {const r=this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);return r?JSON.parse(r.value):null;}
  setSetting(key,value) {this.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key,JSON.stringify(value));}
  save(track) {track=repairArtistCredits(track);this.tracks.set(track.id,track); this.db.prepare('INSERT OR REPLACE INTO tracks VALUES(?,?,?)').run(track.id,track.path,JSON.stringify(track));return track;}
  list() {return [...this.tracks.values()];}
  applyPlaylistOrder(snapshot=this.getSetting('syncPreview')) {
    if(!snapshot?.entries)return;
    const successful=new Set((snapshot.sources||[]).map(s=>s.id)),positions=new Map(),matches=new Map(),counts=new Map();
    for(const entry of snapshot.entries){
      const count=(counts.get(entry.sourceId)||0)+1;counts.set(entry.sourceId,count);
      const position=Number.isInteger(entry.playlistIndex)&&entry.playlistIndex>0?entry.playlistIndex:count;
      const key=entry.sourceId+':'+entry.id;
      // One local file represents repeated uploads at their first playlist appearance.
      if(!positions.has(key))positions.set(key,position);
      if(entry.status==='existing'&&entry.trackId&&!matches.has(entry.trackId))matches.set(entry.trackId,{position,id:entry.id,sourceId:entry.sourceId});
    }
    for(const track of this.tracks.values()){
      if(!successful.has(track.sourceId))continue;
      const match=matches.get(track.id),position=positions.get(track.sourceId+':'+track.youtubeId)??(match?.sourceId===track.sourceId?match.position:null);
      const playlistId=this.config.sources.find(s=>s.id===track.sourceId)?.playlist||'';
      if(track.playlistIndex!==position||track.playlistOrderAt!==snapshot.checkedAt||track.playlistId!==playlistId)
        this.save({...track,playlistIndex:position,playlistId,playlistOrderAt:snapshot.checkedAt});
    }
  }
  playlists() {return this.db.prepare('SELECT * FROM playlists ORDER BY name').all().map(p=>({...p,tracks:JSON.parse(p.tracks)}));}
  savePlaylist(p) {const id=p.id||randomUUID();const ids=[...new Set((p.tracks||[]).filter(id=>this.tracks.has(id)))];this.db.prepare('INSERT OR REPLACE INTO playlists VALUES(?,?,?)').run(id,String(p.name||'Untitled playlist').slice(0,100),JSON.stringify(ids));return {id,name:p.name,tracks:ids};}
  async saveSource(input){
    if(input.id&&!this.config.sources.some(s=>s.id===input.id))throw Error('Source not found.');
    const source=await validateSource(input,this.config.sources),previous=this.config.sources.find(s=>s.id===source.id);
    if(previous)Object.assign(previous,source);else this.config.sources.push(source);
    this.setSetting('config',this.config);return previous||source;
  }
  disconnectSource(id){
    if(!this.config.sources.some(s=>s.id===id))throw Error('Source not found.');
    this.config.sources=this.config.sources.filter(s=>s.id!==id);
    for(const track of this.tracks.values())if(track.sourceId===id){
      const other=this.config.sources.find(s=>s.trackIds?.includes(track.id));
      this.save({...track,...(other?{sourceId:other.id,kind:other.kind}:{available:false})});
    }
    this.setSetting('config',this.config);
  }
  async scan() {
    if(this.scanJob.running)return;
    this.scanJob={running:true,done:0,total:0,errors:[]};
    try {
      for(const source of this.config.sources) {
        let result;try{result=await sourceFiles(source);}catch(e){this.scanJob.errors.push(`${source.name}: ${e.message}`);continue;}
        const {files:found,complete}=result;this.scanJob.errors.push(...result.errors);this.scanJob.total+=found.length;
        const seen=new Set();let index=0;
        const worker=async()=>{while(index<found.length){const p=found[index++]; const id=createHash('sha256').update(path.resolve(p).toLowerCase()).digest('hex').slice(0,24);seen.add(id);
          try{const st=await fsp.stat(p);let old=this.tracks.get(id);
            const owner=old&&this.config.sources.some(s=>s.id===old.sourceId)?old.sourceId:source.id,kind=owner===source.id?source.kind:old.kind;
            if(old && old.mtime===st.mtimeMs && old.size===st.size && old.importVersion===2 && old.duration>0){if(!old.available||old.sourceId!==owner||old.kind!==kind)this.save({...old,available:true,sourceId:owner,kind});this.scanJob.done++;continue;}
            const guessed=inferName(p);let meta={common:{},format:{}};let parseError='';
            try{meta=await parseFile(p,{duration:true,skipCovers:false});}catch(e){parseError=e.message;}
            const c=meta.common,f=meta.format;
            const side=await fsp.readFile(p.replace(/\.[^.]+$/,'.info.json'),'utf8').then(JSON.parse).catch(()=>null);
            let artwork=old?.artwork||'';
            if(!artwork && c.picture?.[0]){const pic=c.picture[0];const ext=pic.format.includes('png')?'png':pic.format.includes('webp')?'webp':'jpg';artwork=`${id}.${ext}`;await fsp.writeFile(path.join(this.dataDir,'artwork',artwork),pic.data);}
            if(!artwork){for(const ext of ['.jpg','.png','.webp']){const cover=p.replace(/\.[^.]+$/,ext);try{await fsp.copyFile(cover,path.join(this.dataDir,'artwork',id+ext));artwork=id+ext;break;}catch{}}}
            const base={id,path:p,sourceId:source.id,kind:source.kind,...guessed,title:c.title||side?.track||guessed.title,artist:side?.artist||c.artist||guessed.artist,recordingArtists:side?.artists||(side?.artist?[side.artist]:c.artists)||[],album:c.album||side?.album||'',genre:c.genre?.join(', ')||guessed.genre,date:c.date||String(c.year||side?.release_date||''),sourceTags:(side?.tags||[]).slice(0,100),description:(side?.description||'').slice(0,20000),uploadDate:side?.upload_date||'',channel:side?.channel||side?.uploader||'',youtubeId:side?.id||p.match(/\[([\w-]{11})\]\.[^.]+$/)?.[1]||'',sourceUrl:side?.webpage_url||'',views:side?.view_count||null,metadataSource:c.title?'Embedded tags':'Filename',metadataStatus:c.title?'embedded':'unmatched',plays:0,listenedSeconds:0,position:0,favorite:false,addedAt:Date.now(),lastPlayed:0};
            this.save({...base,...old,sourceId:owner,kind,rawTitle:guessed.rawTitle,artwork,available:true,mtime:st.mtimeMs,size:st.size,importVersion:2,duration:f.duration||side?.duration||old?.duration||0,sampleRate:f.sampleRate||0,bits:f.bitsPerSample||0,bitrate:f.bitrate||0,codec:f.codec||path.extname(p).slice(1).toUpperCase(),channels:f.numberOfChannels||2,parseError});
          }catch(e){if(source.type==='m3u'&&e.code==='ENOENT'&&this.tracks.has(id))this.save({...this.tracks.get(id),available:false});this.scanJob.errors.push(`${path.basename(p)}: ${e.message}`);}this.scanJob.done++;
        }};
        await Promise.all([worker(),worker(),worker(),worker()]);
        if(complete){source.trackIds=[...seen];if(source.type!=='m3u')for(const t of this.tracks.values())if(t.sourceId===source.id&&!seen.has(t.id)&&!this.config.sources.some(s=>s.id!==source.id&&s.trackIds?.includes(t.id)))this.save({...t,available:false});}
      }
    }finally{this.setSetting('config',this.config);this.applyPlaylistOrder();this.scanJob.running=false;this.scanJob.finishedAt=Date.now();}
  }
  async mbFetch(url) {
    const go=async()=>{for(let attempt=0;attempt<3;attempt++){if(this.closed)throw Error('Library is closing');await delay(Math.max(0,1200-(Date.now()-this.mbLast)));this.mbLast=Date.now();const r=await fetch(url,{headers:{'User-Agent':'Resonance/1.1 (local personal music library; MusicBrainz metadata)'},signal:AbortSignal.timeout(18000)});if(r.ok)return r.json();if(![429,502,503,504].includes(r.status)||attempt===2)throw Error(`MusicBrainz returned ${r.status}`);await delay(Math.min(15000,Math.max(Number(r.headers.get('retry-after'))*1000||0,2500*(attempt+1))));}};
    const promise=this.mbQueue.then(go,go);this.mbQueue=promise.catch(()=>{});return promise;
  }
  async candidates(id,query='',{force=false}={}) {
    const t=this.tracks.get(id);if(!t)throw Error('Track not found');
    if(!query&&!force){const cached=this.db.prepare('SELECT data FROM candidates WHERE track_id=?').get(id);if(cached&&JSON.parse(cached.data).length)return JSON.parse(cached.data);}
    const escape=s=>String(s).replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,' ').trim();
    const cleanTitle=s=>searchTitle(s,t.artist).replace(/\s*\((?:feat\.|ft\.).*?\)/gi,'').replace(/^["']+|["']+$/g,'').trim();
    const parts=query.split(/\s+-\s+/);
    const q=query?(parts.length>1?`recording:"${escape(cleanTitle(parts.slice(1).join(' - ')))}" AND artist:"${escape(parts[0])}"`: `recording:"${escape(cleanTitle(query))}"`):`recording:"${escape(cleanTitle(t.title))}"${t.artist?` AND artist:"${escape(searchArtist(t.artist))}"`:''}`;
    const data=await this.mbFetch(`https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&fmt=json&limit=8`);
    const candidates=(data.recordings||[]).map(r=>{const releases=[...(r.releases||[])].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));const rel=releases.find(x=>x.status==='Official')||releases[0];const c={id:r.id,title:r.title,artist:r['artist-credit']?.map(a=>a.name+(a.joinphrase||'')).join('')||'',album:rel?.title||'',date:r['first-release-date']||rel?.date||'',genre:providerGenres(r).join(', '),artistIds:(r['artist-credit']||[]).filter(a=>a.artist?.id).map(a=>({id:a.artist.id,name:a.artist.name})),releaseId:rel?.id||'',releaseIds:releases.slice(0,4).map(x=>x.id),duration:(r.length||0)/1000,sourceUrl:`https://musicbrainz.org/recording/${r.id}`};return {...c,confidence:Math.round(matchScore(t,c)*100)};}).sort((a,b)=>b.confidence-a.confidence);
    this.db.prepare('INSERT OR REPLACE INTO candidates VALUES(?,?)').run(id,JSON.stringify(candidates));return candidates;
  }
  async cacheArtwork(id,url) {
    const u=new URL(url);if(u.protocol!=='https:'||!(/(^|\.)ytimg\.com$/.test(u.hostname)||u.hostname==='coverartarchive.org'||/(^|\.)archive\.org$/.test(u.hostname)))throw Error('Unsupported artwork host');
    const r=await fetch(url,{signal:AbortSignal.timeout(16000)});if(!r.ok)throw Error(`Artwork returned ${r.status}`);
    const type=r.headers.get('content-type')||'';if(!type.startsWith('image/'))throw Error('Not an image');if(Number(r.headers.get('content-length'))>12e6)throw Error('Image too large');
    const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>12e6)throw Error('Image too large');chunks.push(chunk);}
    const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';const filename=`${id}.${ext}`;await fsp.writeFile(path.join(this.dataDir,'artwork',filename),Buffer.concat(chunks));return filename;
  }
  async sourceMetadata(id) {
    const t=this.tracks.get(id);if(!t?.youtubeId)throw Error('Check your playlists first to identify this track’s YouTube source.');
    if(t.sourceFetchedAt&&Date.now()-t.sourceFetchedAt<86400000)return t;
    const {stdout}=await executeFile(path.join(this.root,'tools','yt-dlp.exe'),['--ignore-config','--no-warnings','--skip-download','--no-playlist','--dump-single-json','--socket-timeout','20','--js-runtimes',`node:${path.join(this.root,'tools','node.exe')}`,`https://www.youtube.com/watch?v=${t.youtubeId}`],{windowsHide:true,timeout:90000,maxBuffer:12e6});
    const info=JSON.parse(stdout);const current=this.tracks.get(id);
    const patch={channel:info.channel||info.uploader||current.channel,uploadDate:info.upload_date||'',views:info.view_count??null,sourceFetchedAt:Date.now(),sourceUrl:info.webpage_url||current.sourceUrl,description:(info.description||'').slice(0,20000),sourceTags:(info.tags||[]).slice(0,100),sourceCategories:info.categories||[]};
    if(current.metadataStatus!=='matched'){
      if(info.artists||info.artist)patch.recordingArtists=info.artists||[info.artist];if(info.artist)patch.artist=info.artist;if(info.track)patch.title=info.track;if(info.album)patch.album=info.album;if(info.release_date)patch.date=info.release_date;
      if(info.artist||info.track){patch.metadataSource='YouTube recording metadata';patch.metadataStatus='source';}
    }
    for(const key of ['title','artist','album','date'])if(metadataLocked(current,key))delete patch[key];
    if(metadataLocked(current,'artist'))delete patch.recordingArtists;
    if(current.metadataLocks||['manual','confirmed'].includes(current.metadataStatus)){delete patch.metadataSource;delete patch.metadataStatus;}
    const saved=this.save({...current,...patch});this.genres.seed();return this.tracks.get(saved.id);
  }
  async applyCandidate(id,candidateId,automatic=false,selected=null,fields) {
    const candidates=JSON.parse(this.db.prepare('SELECT data FROM candidates WHERE track_id=?').get(id)?.data||'[]');const c=selected||candidates.find(x=>x.id===candidateId);if(!c)throw Error('Search for this candidate first');
    const original=this.tracks.get(id);if(!original)throw Error('Track not found');
    if(automatic&&['manual','confirmed'].includes(original.metadataStatus))return original;
    let artwork=original.artwork;
    if(!artwork)for(const release of c.releaseIds||[c.releaseId]){try{artwork=await this.cacheArtwork(id,`https://coverartarchive.org/release/${release}/front-500`);break;}catch{}}
    const current=this.tracks.get(id);if(!current||this.closed)throw Error('Library unavailable');
    if(['title','artist','album','date','metadataStatus'].some(k=>current[k]!==original[k])){if(automatic)return current;throw Error('Song details changed while saving. Search again.');}
    const patch={};for(const key of ['title','artist','album','date'])patch[key]=automatic?current[key]||c[key]||'':c[key]||current[key]||'';
    if(!automatic){const chosen=selectedMetadata(current,c,fields);const before=metadataSnapshot(current);const updated=this.save({...current,...chosen,artwork:current.artwork||artwork,metadataSource:'MusicBrainz · your choice',metadataStatus:'confirmed',metadataUrl:c.sourceUrl,matchedAt:Date.now()});this.setSetting('metadataUndo:'+id,{before,after:metadataSnapshot(updated)});return updated;}
    for(const key of Object.keys(patch))if(current.metadataLocks?.[key])delete patch[key];
    return this.save({...current,...patch,genre:current.genreLocked?current.genre:c.genre||current.genre,musicbrainzArtists:c.artistIds||current.musicbrainzArtists,artwork:current.artwork||artwork,metadataSource:'MusicBrainz',metadataStatus:automatic?'matched':'confirmed',metadataUrl:c.sourceUrl,matchedAt:Date.now()});
  }
  async enrich() {
    if(this.enrichJob.running)return;const tracks=this.list().filter(t=>t.kind!=='mix'&&t.available&&t.artist&&['unmatched','error'].includes(t.metadataStatus));
    this.enrichJob={running:true,done:0,total:tracks.length,matched:0,errors:0,stop:false};
    try{for(const t of tracks){if(this.enrichJob.stop||this.closed)break;try{const c=await this.candidates(t.id);if(c[0]?.confidence>=95 && (!c[1]||c[0].confidence>c[1].confidence||c[0].title===c[1].title&&c[0].artist===c[1].artist)){await this.applyCandidate(t.id,c[0].id,true);this.enrichJob.matched++;}else this.save({...this.tracks.get(t.id),metadataStatus:'review'});}catch(e){this.enrichJob.errors++;this.enrichJob.lastError=e.message;await delay(4000);}this.enrichJob.done++;}}
    finally{this.enrichJob.running=false;}
  }
  close(){this.closed=true;this.enrichJob.stop=true;this.genres.stop();this.db.close();}
}
