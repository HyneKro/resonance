import {GENRE_RESEARCH_VERSION,trustedRecording,wikidataGenres,readWikidata,catalogueGenre,catalogueArtistGenre,searchCatalogue} from './genre-research.mjs';
// Genre evidence is kept separately from editable track metadata. Artist genres
// are suggestions, never presented as a verified classification of a recording.
import { normalize } from './metadata.mjs';
import fs from 'node:fs/promises';
import {genreArtists,genreTitle,genreKey,genreResearchArtists,genreSearchTracks,localGenreCatalogue,localCatalogueEvidence} from './public/genre-identity.js';

const aliases = new Map();
const families = {
  'Drum & Bass':['drum and bass','drum & bass','drum n bass','dnb','d&b'],
  'Liquid Drum & Bass':['liquid drum and bass','liquid drum & bass','liquid dnb','liquid funk'],
  'Neurofunk':['neurofunk'], 'Jungle':['jungle'], 'Breakcore':['breakcore'],
  'IDM':['idm','intelligent dance music'], 'Electronic':['electronic','electronica'],
  'Ambient':['ambient'], 'Dark Ambient':['dark ambient'], 'Downtempo':['downtempo','down tempo'],
  'Trip-Hop':['trip hop','trip-hop'], 'Hip-Hop':['hip hop','hip-hop','hiphop'],
  'Lo-fi Hip-Hop':['lofi hiphop','lo-fi hip-hop','lofi hip hop','lo-fi hip hop'],
  'House':['house'], 'Deep House':['deep house'], 'Progressive House':['progressive house'],
  'Tech House':['tech house'], 'Techno':['techno'], 'Minimal Techno':['minimal techno'],
  'Trance':['trance'], 'Psytrance':['psytrance','psychedelic trance'], 'Dubstep':['dubstep'],
  'Future Bass':['future bass'], 'Bass Music':['bass music'], 'UK Garage':['uk garage'],
  'Breakbeat':['breakbeat','breakbeats'], 'Chillout':['chillout','chill out'],
  'Synthwave':['synthwave'], 'Retrowave':['retrowave'], 'Darksynth':['darksynth'],
  'Vaporwave':['vaporwave'], 'Phonk':['phonk'], 'Trap':['trap'], 'Glitch Hop':['glitch hop'],
  'Glitch':['glitch'], 'Dub':['dub'], 'Reggae':['reggae'], 'Dancehall':['dancehall'],
  'Rock':['rock'], 'Alternative Rock':['alternative rock'], 'Indie Rock':['indie rock'],
  'Post-Rock':['post rock','post-rock'], 'Progressive Rock':['progressive rock'],
  'Psychedelic Rock':['psychedelic rock'], 'Shoegaze':['shoegaze'], 'Dream Pop':['dream pop'],
  'Pop':['pop'], 'Indie Pop':['indie pop'], 'Synth-pop':['synthpop','synth-pop','synth pop'],
  'Art Pop':['art pop'], 'Electropop':['electropop'], 'Disco':['disco'], 'Nu Disco':['nu disco'],
  'Funk':['funk'], 'Soul':['soul'], 'R&B':['r&b','rhythm and blues'],
  'Jazz':['jazz'], 'Nu Jazz':['nu jazz'], 'Jazz Fusion':['jazz fusion','fusion jazz'],
  'Blues':['blues'], 'Metal':['metal'], 'Heavy Metal':['heavy metal'],
  'Progressive Metal':['progressive metal'], 'Metalcore':['metalcore'], 'Death Metal':['death metal'],
  'Black Metal':['black metal'], 'Djent':['djent'], 'Punk':['punk'], 'Post-Punk':['post-punk','post punk'],
  'Classical':['classical'], 'Modern Classical':['modern classical','neoclassical'],
  'Orchestral':['orchestral'], 'Soundtrack':['soundtrack','film score'], 'Video Game Music':['video game music','vgm'],
  'Folk':['folk'], 'Indie Folk':['indie folk'], 'Country':['country'], 'World':['world music'],
  'Experimental':['experimental'], 'Industrial':['industrial'], 'Noise':['noise'],
  'Hardstyle':['hardstyle'], 'Hardcore':['hardcore'], 'Happy Hardcore':['happy hardcore'],
  'Chiptune':['chiptune','8-bit'], 'Electro':['electro'], 'Electro Swing':['electro swing'],
  'Future Garage':['future garage'], 'Future Funk':['future funk'], 'Chillwave':['chillwave'],
  'EDM':['edm','electronic dance music'], 'Dancefloor Drum & Bass':['dancefloor drum and bass','dancefloor drum & bass'],
  'Electro House':['electro house'], 'Melodic Dubstep':['melodic dubstep'], 'Chilltrap':['chilltrap'], 'EDM Trap':['trap [edm]'],
  'Folktronica':['folktronica'], 'Indietronica':['indietronica'], 'Dance-pop':['dance pop','dance-pop'],
  'Alternative Hip-Hop':['alternative hip hop','alternative hip-hop'], 'Rap':['rap'],
  'Instrumental Hip-Hop':['instrumental hip hop','instrumental hip-hop'], 'Cloud Rap':['cloud rap'], 'Psybass':['psybass','psy bass'], 'Psydub':['psydub'], 'Psybient':['psybient','psychedelic ambient'], 'Wave':['wave music','hardwave'], 'Witch House':['witch house'], 'Melodic Techno':['melodic techno'], 'Melodic House':['melodic house'], 'Bass House':['bass house'], 'Future House':['future house'], 'Midtempo':['midtempo','midtempo bass'], 'Speed Garage':['speed garage'], 'Jersey Club':['jersey club'], 'Drift Phonk':['drift phonk'], 'Brazilian Phonk':['brazilian phonk'], 'Nu Metal':['nu metal'], 'Alternative Metal':['alternative metal'], 'J-Pop':['jpop','j-pop'], 'K-Pop':['kpop','k-pop'], 'City Pop':['city pop'], 'Math Rock':['math rock'], 'Post-Hardcore':['post hardcore'], 'Drumstep':['drumstep'], 'Riddim':['riddim dubstep'], 'Complextro':['complextro'], 'Chillstep':['chill step'], 'Chillout':['chill music'], 'Synthpop':['synth pop','synth-pop'], 'Jump Up':['jump-up','jump up dnb'], 'Latin':['latin music']
};
for(const [name,terms] of Object.entries(families))for(const term of [name,...terms])aliases.set(normalize(term),name);
export const genreTaxonomy=()=>Object.fromEntries(aliases);
export function canonicalGenre(value,official=false){
  const s=String(value||'').trim();if(!s||s.length>65)return '';
  if(['music','entertainment','musicvideo','visualizer','officialvideo','officialaudio','audio','video','youtube','unknown','other','none','aggressive'].includes(normalize(s)))return '';
  return aliases.get(normalize(s))||aliases.get(normalize(s.replace(/\s+(?:music|beats|songs)$/i,'')))||(official?s.replace(/\b\w/g,c=>c.toUpperCase()):'');
}
export function providerGenres(entity){
  const values=[...(entity?.genres||[]).map(g=>({...g,official:true})),...(entity?.tags||[])];
  return [...new Set(values.filter(g=>(g.count??1)>0).sort((a,b)=>(b.count||0)-(a.count||0)).map(g=>canonicalGenre(g.name,g.official)).filter(Boolean))].slice(0,5);
}
export function localGenreEvidence(track){
  const result=[];
  const add=(name,scope,source)=>{name=canonicalGenre(name);if(name&&!result.some(e=>e.name===name))result.push({name,scope,source,confidence:'descriptive'});};
  // Only explicit genre fields, hashtags, bracket labels, or genre-led mix titles.
  for(const tag of track.sourceTags||[])add(tag,'source','YouTube tags');
  for(const m of (track.description||'').matchAll(/(?:^|\n)\s*(?:genre|style)\s*:\s*([^\n]+)/gi))for(const v of m[1].split(/[,;|/]/))add(v,'source','YouTube description');
  for(const m of (track.description||'').matchAll(/#([\p{L}\d_-]+)/gu))add(m[1],'source','YouTube hashtag');
  for(const m of (track.rawTitle||'').matchAll(/[\[(]([^\])]+)[\])]/g))for(const v of m[1].split(/[,;|/]/))add(v,'filename','Filename label');
  if(track.kind==='mix'){
    const title=(track.rawTitle||track.title||'').toLowerCase();
    for(const [name,terms] of Object.entries(families))for(const term of terms){
      if(term.length<4)continue;
      const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if(new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`,'i').test(title)){add(name,'filename','Mix title');break;}
    }
  }
  return result.slice(0,6);
}
const DAY=86400000, uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
export class GenreDiscovery {
  constructor(lib){this.lib=lib;this.inflight=new Map();this.readWikidata=readWikidata;this.searchCatalogue=searchCatalogue;this.job={running:false,done:0,total:0,found:0,errors:0,phase:'idle',message:''};lib.db.exec('CREATE TABLE IF NOT EXISTS genre_cache(key TEXT PRIMARY KEY, data TEXT NOT NULL, fetched INTEGER NOT NULL)');}
  async cached(key,fetcher,days=30){const row=this.lib.db.prepare('SELECT * FROM genre_cache WHERE key=?').get(key);if(row&&row.fetched>=(this.refreshSince||0)&&Date.now()-row.fetched<days*DAY)return JSON.parse(row.data);const value=await fetcher();if(!this.lib.closed)this.lib.db.prepare('INSERT OR REPLACE INTO genre_cache VALUES(?,?,?)').run(key,JSON.stringify(value),Date.now());return value;}
  entity(type,id,inc='genres+tags'){if(!uuid.test(id||''))return Promise.resolve(null);return this.cached(`${type}:${id}:${inc}`,()=>this.lib.mbFetch(`https://musicbrainz.org/ws/2/${type}/${id}?inc=${inc}&fmt=json`));}
  async artistByName(name){
    if(!name||name.length>140)return null;
    return this.cached(`artist-search-v5:${genreKey(name)}`,async()=>{
      const q=`artist:"${name.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,' ')}"`;
      const data=await this.lib.mbFetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(q)}&fmt=json&limit=8`);
      const exact=(data.artists||[]).filter(a=>[a.name,...(a.aliases||[]).map(x=>x.name)].some(n=>genreKey(n)===genreKey(name))&&Number(a.score)>=95);
      // Homonyms need a confirmed recording, not a guess based on popularity.
      return exact.length===1?{id:exact[0].id,name:exact[0].name}:null;
    },14);
  }
  evidence(names,scope,type,id){return names.map(name=>({name,scope,source:'MusicBrainz',url:`https://musicbrainz.org/${type}/${id}`,confidence:scope==='artist'?'suggested':'catalogued'}));}
  saveEvidence(id,evidence,patch={}){
    const t=this.lib.tracks.get(id);if(!t||this.lib.closed)return t;
    // Read the current row after every network wait: never undo a user edit.
    if(t.genreLocked)return Object.keys(patch).length?this.lib.save({...t,...patch}):t;
    const old=(t.genreEvidence||[]).filter(e=>['manual','embedded'].includes(e.scope));
    const all=[...old,...evidence].map(e=>e.scope==='manual'?e:{...e,name:canonicalGenre(e.name,true)}).filter(e=>e.name).filter((e,i,a)=>a.findIndex(x=>x.name===e.name&&x.scope===e.scope)===i);
    const specific=all.filter(e=>e.scope!=='artist');const chosen=specific.length?specific:all;
    const genre=[...new Set(chosen.map(e=>e.name))].slice(0,6).join(', ');
    const next={...t,...patch,genre,genreEvidence:all,genreBasis:genre?(specific.length?'track':'artist'):'unknown'};return JSON.stringify(next)===JSON.stringify(t)?t:this.lib.save(next);
  }
  seed(){let count=0;for(const t of this.lib.list()){
    if(t.genreLocked)continue;
    let evidence=t.genreEvidence||[];
    if(t.genre&&!evidence.length){evidence=t.genre.split(/[,;]/).map(s=>({name:canonicalGenre(s,true),scope:t.metadataStatus==='manual'?'manual':t.genreBasis==='artist'?'artist':t.metadataSource==='Embedded tags'?'embedded':'recording',source:t.metadataSource||'Existing metadata',...(t.metadataUrl?{url:t.metadataUrl}:{}),confidence:'existing'})).filter(e=>e.name);}
    if(t.metadataStatus==='manual'&&t.genre&&!t.genreEvidence){this.lib.save({...t,genreEvidence:evidence,genreLocked:true,genreBasis:'manual'});continue;}
    const all=[...evidence,...localGenreEvidence(t)];if(all.length){const result=this.saveEvidence(t.id,all);if(result.genre!==t.genre)count++;}
  }
    const catalogue=localGenreCatalogue(this.lib.list());for(const t of this.lib.list())if(!t.genre&&!t.genreLocked){const evidence=localCatalogueEvidence(t,catalogue);if(evidence.length){this.saveEvidence(t.id,evidence);count++;}}
    return count;}
  async readLocalSources(){for(const t of this.lib.list()){
    if(this.job.stop||this.lib.closed)break;if(t.genreLocalVersion===1)continue;
    let patch={genreLocalVersion:1};try{const side=t.path.replace(/\.[^.]+$/,'.info.json');const stat=await fs.stat(side);if(stat.size<20e6){const info=JSON.parse(await fs.readFile(side,'utf8'));patch={...patch,sourceTags:(info.tags||[]).slice(0,100),description:(info.description||'').slice(0,20000)};}}catch{}
    if(!this.lib.closed)this.lib.save({...this.lib.tracks.get(t.id),...patch});
  }if(!this.lib.closed)this.seed();}
  async artistEvidence(t){
    const evidence=[],errors=[],attempt=async fn=>{try{return await fn();}catch(e){errors.push(e);return null;}};
    const ids=t.musicbrainzArtists?.filter(a=>uuid.test(a.id))||[];
    if(!ids.length)for(const name of genreResearchArtists(t).slice(0,4)){if(genreKey(name)===genreKey(t.channel)&&!t.artistCreditSource&&!t.recordingArtists?.length)continue;const a=await attempt(()=>this.artistByName(name));if(a)ids.push(a);}
    for(const artist of ids.slice(0,3)){const data=await attempt(()=>this.entity('artist',artist.id,'genres+tags+url-rels'));if(data){const genres=providerGenres(data);evidence.push(...this.evidence(genres,'artist','artist',artist.id));if(!genres.length)evidence.push(...await attempt(()=>wikidataGenres(data,id=>this.cached('wikidata:'+id,()=>this.readWikidata(id),90)))||[]);}}
    if(!evidence.length)for(const name of genreResearchArtists(t).slice(0,2)){
      if(!ids.length&&genreKey(name)===genreKey(t.channel)&&!t.artistCreditSource&&!t.recordingArtists?.length)continue;
      const results=await attempt(()=>this.cached('catalogue-artist-v6:'+genreKey(name),()=>this.searchCatalogue({artist:name},true)));
      evidence.push(...catalogueArtistGenre(name,results||[]));
    }
    if(!evidence.length&&errors.length)throw errors[0];
    return evidence;
  }
  async recordingByCredits(t){
    const artist=genreArtists(t)[0];if(!artist||!genreTitle(t))return null;
    const escape=s=>s.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,' ').trim();
    const q=`recording:"${escape(genreTitle(t))}" AND artist:"${escape(artist)}"`;
    const data=await this.cached('recording-credits-v4:'+genreKey(artist)+':'+genreKey(genreTitle(t)),()=>this.lib.mbFetch('https://musicbrainz.org/ws/2/recording?fmt=json&limit=25&query='+encodeURIComponent(q)),14);
    return trustedRecording(t,(data.recordings||[]).map(r=>({id:r.id,title:r.title,artist:(r['artist-credit']||[]).map(c=>c.name+(c.joinphrase||'')).join(''),artistIds:(r['artist-credit']||[]).map(c=>c.artist).filter(Boolean),duration:(r.length||0)/1000,confidence:Number(r.score)||0})));
  }
  discoverTrack(id,options={}){if(this.inflight.has(id))return this.inflight.get(id);const task=this.researchTrack(id,options).finally(()=>this.inflight.delete(id));this.inflight.set(id,task);return task;}
  async researchTrack(id,{deep=true}={}){
    let t=this.lib.tracks.get(id);if(!t||t.genreLocked)return t;
    const errors=[],attempt=async fn=>{if(this.lib.closed)return null;try{return await fn();}catch(e){errors.push(e.message);return null;}};
    if(deep&&t.youtubeId&&(!t.genre||t.genreBasis==='artist')&&(!t.sourceFetchedAt||Date.now()-t.sourceFetchedAt>30*DAY))await attempt(()=>this.lib.sourceMetadata(id));
    t=this.lib.tracks.get(id);if(this.lib.closed||!t)return t;
    const identity=[t.title,t.artist,t.duration].join('|');
    let evidence=[...(t.genreEvidence||[]),...localGenreEvidence(t)];
    let recordingId=t.metadataUrl?.match(/musicbrainz\.org\/recording\/([a-f\d-]+)/i)?.[1];
    if(deep&&t.kind!=='mix'&&!recordingId&&genreSearchTracks(t).some(q=>genreArtists(q).length)){
      const candidates=await attempt(()=>this.lib.candidates(id,'',{force:!!this.refreshSince||t.genreResearchVersion!==GENRE_RESEARCH_VERSION}));
      recordingId=trustedRecording(t,candidates||[])?.id;
      if(!recordingId)for(const query of genreSearchTracks(t)){recordingId=(await attempt(()=>this.recordingByCredits(query)))?.id;if(recordingId)break;}
    }
    if(recordingId){
      const r=await attempt(()=>this.entity('recording',recordingId,'genres+tags+artists+releases'));
      if(r){
        const artists=(r['artist-credit']||[]).filter(a=>a.artist).map(a=>({id:a.artist.id,name:a.artist.name}));
        // Commit the matched credits together with their genre evidence below.
        // Saving them here used to make our own credit repair look like a user
        // edit, aborting the genre result on the first successful lookup.
        t={...this.lib.tracks.get(id),musicbrainzArtists:artists};
        evidence.push(...this.evidence(providerGenres(r),'recording','recording',recordingId));
        const releases=[...(r.releases||[])].sort((a,b)=>(a.title===t.album?-2:0)+(a.status==='Official'?-1:0)-((b.title===t.album?-2:0)+(b.status==='Official'?-1:0)));
        if(!providerGenres(r).length)for(const rel of releases.slice(0,4)){
          const release=await attempt(()=>this.entity('release',rel.id,'genres+tags+release-groups'));if(!release)continue;
          const group=release['release-group'];
          if(group?.['secondary-types']?.includes('Compilation'))continue;
          evidence.push(...this.evidence(providerGenres(release),'release','release',rel.id));
          if(group?.id){const g=await attempt(()=>this.entity('release-group',group.id));evidence.push(...this.evidence(providerGenres(g),'release','release-group',group.id));}
          if(evidence.some(e=>e.scope==='release'))break;
        }
      }
    }
    if(deep&&t.kind!=='mix'&&t.duration>0&&!evidence.some(e=>e.scope!=='artist')){
      for(const query of genreSearchTracks(t).filter(q=>genreArtists(q).length)){const results=await attempt(()=>this.cached('catalogue-v6:'+genreKey(query.artist)+':'+genreKey(genreTitle(query)),()=>this.searchCatalogue(query)));const found=catalogueGenre(query,results||[]);evidence.push(...found);if(found.length)break;}
    }
    evidence.push(...await attempt(()=>this.artistEvidence(t))||[]);
    const current=this.lib.tracks.get(id);if(this.lib.closed||!current)return current;
    if([current.title,current.artist,current.duration].join('|')!==identity)return current;
    if(!evidence.length)evidence.push(...localCatalogueEvidence(t,localGenreCatalogue(this.lib.list())));
    return this.saveEvidence(id,evidence,{...(t.musicbrainzArtists?.length?{musicbrainzArtists:t.musicbrainzArtists}:{}),genreCheckedAt:Date.now(),genreResearchVersion:GENRE_RESEARCH_VERSION,genreStatus:errors.length?'partial':'checked',genreError:[...new Set(errors)].join(' · ').slice(0,500)});
  }
  async start({retryMissing=false}={}){
    if(this.job.running)return;this.refreshSince=retryMissing?Date.now():0;this.seed();this.job={running:true,done:0,total:0,found:0,errors:0,phase:'artists',message:'Reading local source labels',stop:false};await this.readLocalSources();
    // Shared artists first: one cached lookup can help dozens of recordings.
    const groups=new Map();for(const t of this.lib.list().filter(t=>t.available&&!t.genreLocked&&t.artist&&(!retryMissing||!t.genre||t.genreBasis==='artist'))){
      const key=genreResearchArtists(t).map(genreKey).join('|');if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);
    }
    const pending=[...groups.values()].filter(ts=>ts.some(t=>retryMissing||t.genreResearchVersion!==GENRE_RESEARCH_VERSION||!t.genreArtistAt||Date.now()-t.genreArtistAt>30*DAY)).sort((a,b)=>b.length-a.length);
    const deep=this.lib.list().filter(t=>t.available&&!t.genreLocked&&(retryMissing?!t.genre||t.genreBasis==='artist':t.genreResearchVersion!==GENRE_RESEARCH_VERSION||!t.genreCheckedAt||Date.now()-t.genreCheckedAt>(t.genreError?1:30)*DAY)).sort((a,b)=>Number(!!a.genre)-Number(!!b.genre));
    this.job.total=pending.length+deep.length;let consecutive=0;
    const failure=e=>{this.job.errors++;this.job.lastError=e.message;if(++consecutive>=6){this.job.stop=true;this.job.message='Provider is unavailable. Progress is saved; try again later.';}};
    try{
      for(const tracks of pending){if(this.job.stop||this.lib.closed)break;this.job.message=tracks[0].artist;try{
        const representative=tracks.find(t=>t.musicbrainzArtists?.length)||tracks[0];const evidence=await this.artistEvidence(representative);
        for(const old of tracks){const current=this.lib.tracks.get(old.id);const t=this.saveEvidence(old.id,[...(current.genreEvidence||[]).filter(e=>e.scope!=='artist'),...localGenreEvidence(current),...evidence],{genreArtistAt:Date.now()});if(!old.genre&&t?.genre)this.job.found++;}
        consecutive=0;
      }catch(e){failure(e);}this.job.done++;}
      if(!this.job.stop)this.job.phase='recordings';
      for(const old of deep){if(this.job.stop||this.lib.closed)break;this.job.message=`${old.artist?old.artist+' · ':''}${old.title}`;try{const hadGenre=!!this.lib.tracks.get(old.id)?.genre;const t=await this.discoverTrack(old.id);if(!hadGenre&&t?.genre)this.job.found++;if(t?.genreError&&!t.genre)failure(Error(t.genreError));else consecutive=0;}catch(e){failure(e);if(!this.lib.closed){const t=this.lib.tracks.get(old.id);this.lib.save({...t,genreStatus:'error',genreError:e.message});}}this.job.done++;}
    }finally{this.job.running=false;this.job.phase=this.job.stop?'paused':'complete';this.refreshSince=0;if(!this.job.stop)this.job.message=this.job.total===0?'Everything has already been checked recently. Retry missing genres to search again.':`Finished · ${this.job.found} tracks gained genres · ${this.job.done} lookups${this.job.errors?' · '+this.job.errors+' failed':''}. Unverified tracks stay unlabelled.`;if(!this.lib.closed)this.lib.setSetting('genreJob',this.job);}
  }
  stop(){if(!this.job.running)return;this.job.stop=true;this.job.message='Pausing after the current lookup…';}
}
