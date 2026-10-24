import {downloadFailure,fallbackCandidates,recordingQueries,reviewRecordings} from './public/recording-fallback.js';
import {catalogEntries} from './spotify.mjs';
import {readDeezerPlaylist} from './deezer.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { classifyEntry } from './metadata.mjs';

export class PlaylistSync {
  constructor(library) {this.lib=library;this.job={running:false,phase:'idle',message:'Ready to check your playlists',done:0,total:0,errors:[]};this.child=null;this.cancelled=false;this.coverJob={running:false,done:0,total:0};this.preview=library.getSetting('syncPreview')||null;}
  executable(){return path.join(this.lib.root,'tools','yt-dlp.exe');}
  run(args,onLine,timeout=180000) {
    return new Promise((resolve,reject)=>{
      const p=spawn(this.executable(),['--ignore-config','--no-colors','--no-warnings',...args],{windowsHide:true});this.child=p;let output='',error='',pending='';
      const timer=setTimeout(()=>{p.kill();reject(Error('YouTube request timed out. Please retry.'));},timeout);
      p.stdout.on('data',d=>{output+=d;pending+=d;let i;while((i=pending.indexOf('\n'))>=0){onLine?.(pending.slice(0,i));pending=pending.slice(i+1);}if(output.length>50e6){p.kill();reject(Error('Playlist response too large'));}});
      p.stderr.on('data',d=>{error=(error+d).slice(-12000);});p.on('error',e=>{clearTimeout(timer);reject(e);});
      p.on('close',code=>{clearTimeout(timer);if(this.child===p)this.child=null;if(this.cancelled)reject(Error('Cancelled'));else if(code!==0)reject(Error(error.trim()||`yt-dlp exited with ${code}`));else resolve(output);});
    });
  }
  cancel(){this.spotifyAbort?.abort();this.cancelled=true;this.job.message='Stopping after the current operation…';if(this.child){if(process.platform==='win32')spawn('taskkill',['/pid',String(this.child.pid),'/T','/F'],{windowsHide:true});else this.child.kill();}}
  async check(){
    if(this.job.running)return;this.cancelled=false;this.spotifyAbort=new AbortController();this.job={running:true,phase:'checking',message:'Reading connected playlists…',done:0,total:this.lib.config.sources.filter(s=>s.playlist).length,errors:[]};
    const entries=[],sources=[];
    try{const archive=await fsp.readFile(path.join(this.lib.dataDir,'downloads.txt'),'utf8').catch(()=>'');const archived=new Set(archive.split(/\r?\n/).map(x=>x.split(' ')[1]).filter(Boolean));
      for(const source of this.lib.config.sources){if(this.cancelled)break;if(!source.playlist)continue;
        this.job.message=`Checking ${source.name}…`;
        try{
          if(['spotify','deezer'].includes(source.type)){const result=await catalogEntries(this,source,archived,{provider:source.type,...(source.type==='deezer'?{read:readDeezerPlaylist}:{})});entries.push(...result.entries);sources.push(result.source);this.job.errors.push(...result.notices.map(n=>source.name+': '+n));this.job.done++;continue;}
          const output=await this.run(['--flat-playlist','--dump-single-json','--ignore-errors','--socket-timeout','25',`https://www.youtube.com/playlist?list=${source.playlist}`]);
          const playlist=JSON.parse(output);sources.push({id:source.id,name:playlist.title,count:playlist.entries?.length||0});
          const local=this.lib.list().filter(t=>t.sourceId===source.id);
          for(const [entryIndex,e] of (playlist.entries||[]).entries()){if(!e?.id)continue;const alias=local.find(t=>t.originalYoutubeId===e.id&&t.available!==false);const classification=alias?{status:'existing',trackId:alias.id,reason:'Alternative recording saved'}:classifyEntry(e,local,archived);const entry={id:e.id,title:e.title||'Unavailable video',duration:e.duration||0,channel:e.channel||e.uploader||'',thumbnail:e.thumbnails?.filter(x=>x.url?.startsWith('https://i.ytimg.com/')).sort((a,b)=>(b.width||0)-(a.width||0))[0]?.url||`https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,sourceId:source.id,playlistIndex:Number.isInteger(e.playlist_index)&&e.playlist_index>0?e.playlist_index:entryIndex+1,...classification};entries.push(entry);
            if(classification.status==='existing'&&classification.trackId&&!alias){const t=this.lib.tracks.get(classification.trackId);this.lib.save({...t,youtubeId:e.id,channel:entry.channel,sourceUrl:`https://www.youtube.com/watch?v=${e.id}`,youtubeThumbnail:entry.thumbnail});}
          }
        }catch(e){if(!this.cancelled)this.job.errors.push(`${source.name}: ${e.message}`);}this.job.done++;
      }
      if(!this.cancelled){this.preview={checkedAt:Date.now(),entries,sources,errors:[...this.job.errors]};this.lib.setSetting('syncPreview',this.preview);this.saveCatalogLinks();this.job.message=`${entries.filter(e=>e.status==='new').length} new finds · ${entries.filter(e=>e.status==='review').length} matches to review`;this.job.phase='ready';void this.cacheCovers();}
    }catch(e){this.job.errors.push(e.message);}finally{this.job.running=false;if(this.cancelled){this.job.phase='cancelled';this.job.message='Playlist check cancelled';}}
  }
  selectSpotifyMatch(sourceId,spotifyId,videoId){return this.selectCatalogMatch(sourceId,'spotify',spotifyId,videoId);}
  selectCatalogMatch(sourceId,provider,trackId,videoId){
    if(!['spotify','deezer'].includes(provider))throw Error('Choose a supported playlist.');
    const idField=provider+'Id',cacheKey=provider+'Matches';
    if(this.job.running)throw Error('Wait for the playlist update to finish.');
    const entry=this.preview?.entries.find(e=>e.sourceId===sourceId&&e[idField]===trackId&&e.provider===provider&&e.status==='review');
    const candidate=entry?.candidates?.find(c=>c.id===videoId);if(!candidate)throw Error('Choose one of the reviewed YouTube matches.');
    for(const e of this.preview.entries.filter(e=>e.sourceId===sourceId&&e[idField]===trackId&&e.provider===provider&&e.status==='review'))Object.assign(e,{id:candidate.id,matchedTitle:candidate.title,matchedChannel:candidate.channel,matchedDuration:candidate.duration});
    const cache=this.lib.getSetting(cacheKey)||{};if(cache[trackId]){cache[trackId].chosenId=videoId;this.lib.setSetting(cacheKey,cache);}
    this.lib.setSetting('syncPreview',this.preview);return entry;
  }
  saveSpotifyLinks(){return this.saveCatalogLinks();}
  saveCatalogLinks(){
    for(const entry of this.preview?.entries||[]){if(!['spotify','deezer'].includes(entry.provider)||entry.status!=='existing')continue;
      const track=this.lib.list().find(t=>t.sourceId===entry.sourceId&&(t.id===entry.trackId||t.youtubeId===entry.id));
      if(track){this.lib.save({...track,[entry.provider+'Id']:entry[entry.provider+'Id'],[entry.provider+'Title']:entry.title,[entry.provider+'Artist']:entry.channel,[entry.provider+'Url']:entry[entry.provider+'Url']});entry.trackId=track.id;}
    }
    if(this.preview)this.lib.setSetting('syncPreview',this.preview);this.lib.applyPlaylistOrder(this.preview);
  }
  async searchAlternatives(sourceId,id,query=''){
    if(this.job.running)throw Error('Wait for the playlist update to finish.');
    const entry=this.preview?.entries.find(e=>e.sourceId===sourceId&&e.id===id&&e.status!=='existing');if(!entry)throw Error('This playlist entry changed. Reopen Downloads.');
    this.cancelled=false;const entries=[],previous=this.job;this.alternativeReview=null;
    this.job={...previous,running:true,phase:'searching',message:'Finding audio uploads and music videos…'};
    try{for(const target of recordingQueries(entry,String(query).slice(0,300))){const output=await this.run(['--flat-playlist','--dump-single-json','--socket-timeout','20',target],null,60000);entries.push(...JSON.parse(output).entries||[]);}
      const choices=reviewRecordings(entry,entries);this.alternativeReview={sourceId,id,choices};return choices;
    }finally{this.job={...previous,running:false};}
  }
  selectAlternative(sourceId,id,videoId){
    if(this.job.running)throw Error('Wait for the playlist update to finish.');
    const review=this.alternativeReview,choice=review?.sourceId===sourceId&&review.id===id&&review.choices.find(c=>c.id===videoId);
    const entry=this.preview?.entries.find(e=>e.sourceId===sourceId&&e.id===id&&e.status!=='existing');if(!choice||!entry)throw Error('Search again before choosing this recording.');
    if(!['spotify','deezer'].includes(entry.provider))entry.originalYoutubeId??=entry.id;
    Object.assign(entry,{id:choice.id,alternativeTitle:choice.title,matchedTitle:choice.title,matchedChannel:choice.channel,matchedDuration:choice.duration,alternativeKind:choice.musicVideo?'music-video':'upload',alternativeSelected:true,status:'review',reason:'Alternative selected by you'});delete entry.downloadError;
    if(['spotify','deezer'].includes(entry.provider)&&!entry.candidates?.some(c=>c.id===choice.id))entry.candidates=[...(entry.candidates||[]),{...choice,score:0}];
    if(['spotify','deezer'].includes(entry.provider)){const key=entry.provider+'Matches',cache=this.lib.getSetting(key)||{};cache[entry[entry.provider+'Id']]={at:Date.now(),candidates:entry.candidates,chosenId:entry.id};this.lib.setSetting(key,cache);}
    this.lib.setSetting('syncPreview',this.preview);this.alternativeReview=null;return entry;
  }
  async alternative(entry,args,onLine){
    if(entry.originalYoutubeId)return false;
    this.job.message='Looking for another upload of '+entry.title+'…';const tried=new Set();
    for(const target of recordingQueries(entry)){
      if(this.cancelled)throw Error('Cancelled');
      if(tried.size>=3)break;
      const videoSearch=target.endsWith('official music video'),attemptLimit=videoSearch?3:2;
      if(tried.size>=attemptLimit)continue;
      this.job.message=videoSearch?'Looking for a music video of '+entry.title+'…':'Looking for another upload of '+entry.title+'…';
      const output=await this.run(['--flat-playlist','--dump-single-json','--socket-timeout','20',target],null,60000);
      if(this.cancelled)throw Error('Cancelled');
      for(const candidate of fallbackCandidates(entry,JSON.parse(output).entries||[])){
        if(tried.has(candidate.id)||tried.size>=attemptLimit)continue;tried.add(candidate.id);
        try{await this.run([...args.slice(0,-1),'https://www.youtube.com/watch?v='+candidate.id],onLine,7200000);
          entry.originalYoutubeId=entry.id;entry.id=candidate.id;entry.alternativeTitle=candidate.title;entry.alternativeKind=candidate.musicVideo?'music-video':'upload';return true;
        }catch(error){if(this.cancelled||downloadFailure(error.message)!=='unavailable')throw error;}
      }
    }return false;
  }
  saveAlternativeLinks(){
    for(const entry of this.preview?.entries||[]){if(!entry.originalYoutubeId||entry.status!=='existing')continue;
      const track=this.lib.list().find(t=>t.youtubeId===entry.id&&t.sourceId===entry.sourceId);
      if(track){this.lib.save({...track,originalYoutubeId:entry.originalYoutubeId,alternativeRecording:true,alternativeKind:entry.alternativeKind||'upload',alternativeSelected:!!entry.alternativeSelected});entry.trackId=track.id;}
    }
  }
  async cacheCovers(){
    if(this.coverJob.running)return;const tracks=this.lib.list().filter(t=>t.youtubeThumbnail&&!t.artwork);this.coverJob={running:true,done:0,total:tracks.length,failed:0};let i=0;
    const worker=async()=>{while(i<tracks.length&&!this.lib.closed){const t=tracks[i++];try{const artwork=await this.lib.cacheArtwork(t.id,t.youtubeThumbnail);this.lib.save({...this.lib.tracks.get(t.id),artwork,artworkSource:'YouTube'});}catch{this.coverJob.failed++;}this.coverJob.done++;}};
    try{await Promise.all([worker(),worker(),worker()]);}finally{this.coverJob.running=false;}
  }
  async download(selected){
    if(this.job.running)throw Error('An update is already running');if(!this.preview)throw Error('Check your playlists first');if(this.lib.scanJob.running)throw Error('Wait for the library scan to finish');
    const keys=new Set(selected||[]),seen=new Set();
    const archive=await fsp.readFile(path.join(this.lib.dataDir,'downloads.txt'),'utf8').catch(()=>'');const archived=new Set(archive.split(/\r?\n/).map(x=>x.split(' ')[1]).filter(Boolean));
    const entries=this.preview.entries.filter(e=>{if(!keys.has(`${e.sourceId}:${e.id}`)||!['new','review'].includes(e.status)||seen.has(e.id))return false;seen.add(e.id);if(archived.has(e.id)){e.status='existing';e.reason='Download archive';return false;}return this.lib.config.sources.some(s=>s.id===e.sourceId&&s.playlist)&&/^[\w-]{11}$/.test(e.id);});
    this.lib.setSetting('syncPreview',this.preview);
    this.cancelled=false;this.job={running:true,phase:'downloading',message:'Starting downloads…',done:0,total:entries.length,errors:[],downloaded:0};
    try{for(const entry of entries){if(this.cancelled)break;const source=this.lib.config.sources.find(s=>s.id===entry.sourceId);this.job.message=entry.title;
      try{await fsp.access(source.path,fs.constants.W_OK);
        const nodeRuntime=fs.existsSync(path.join(this.lib.root,'tools','node.exe'))?path.join(this.lib.root,'tools','node.exe'):process.execPath;
        const args=['--no-playlist','--windows-filenames','--no-overwrites','--continue','--newline','--no-simulate','--progress','--print','after_move:RESONANCE_FILE %(filepath)j','--socket-timeout','25','--retries','3','--fragment-retries','3','--js-runtimes',`node:${nodeRuntime}`,'-f','bestaudio/best','-x','--audio-format',this.lib.config.downloadFormat==='flac'?'flac':'best','--embed-metadata','--write-info-json','--write-thumbnail','--convert-thumbnails','jpg','--download-archive',path.join(this.lib.dataDir,'downloads.txt'),'-o',path.join(source.path,'%(title).170B [%(id)s].%(ext)s'),'--progress-template','download:PROGRESS %(progress._percent_str)s %(progress._speed_str)s ETA %(progress._eta_str)s',`https://www.youtube.com/watch?v=${entry.id}`];
        if(fs.existsSync(path.join(this.lib.root,'tools','ffmpeg.exe')))args.unshift('--ffmpeg-location',path.join(this.lib.root,'tools'));
        let completedFile='';const onLine=line=>{if(line.startsWith('PROGRESS '))this.job.progress=line.slice(9).trim();else if(line.startsWith('RESONANCE_FILE '))try{completedFile=JSON.parse(line.slice(15));}catch{}};
        try{await this.run(args,onLine,7200000);}catch(error){
          if(this.cancelled||downloadFailure(error.message)!=='unavailable')throw error;
          if(!await this.alternative(entry,args,onLine))throw Error('Recording unavailable; no sufficiently close alternative was found. Skipped.');
        }
        const track=await this.lib.importDownloaded(source,completedFile);
        this.lib.save({...track,playlistIndex:entry.playlistIndex,playlistOrderAt:this.preview.checkedAt,playlistId:source.playlist,
          ...(['spotify','deezer'].includes(entry.provider)?{[entry.provider+'Id']:entry[entry.provider+'Id'],[entry.provider+'Title']:entry.title,[entry.provider+'Artist']:entry.channel,[entry.provider+'Url']:entry[entry.provider+'Url']}:{}),
          ...(entry.originalYoutubeId?{originalYoutubeId:entry.originalYoutubeId,alternativeRecording:true,alternativeKind:entry.alternativeKind||'upload',alternativeSelected:!!entry.alternativeSelected}:{})});
        entry.trackId=track.id;entry.status='existing';delete entry.downloadError;entry.reason=entry.originalYoutubeId?'Downloaded alternative: '+entry.alternativeTitle:'Downloaded';this.job.downloaded++;
        this.lib.setSetting('syncPreview',this.preview);
      }catch(e){if(!this.cancelled){entry.downloadError=e.message.slice(0,400);this.job.errors.push(`${entry.title}: ${e.message}`);this.lib.setSetting('syncPreview',this.preview);}if(downloadFailure(e.message)==='pause'){this.job.paused=true;break;}}this.job.done++;
    }}finally{this.job.running=false;this.job.phase=this.cancelled?'cancelled':this.job.paused?'paused':'complete';this.job.message=this.cancelled?'Update cancelled — completed downloads are kept':this.job.paused?'Downloads paused. Finished songs are saved; wait before retrying.':`Update complete · ${this.job.downloaded} downloaded`;this.job.progress='';await this.lib.scan();this.saveAlternativeLinks();this.saveCatalogLinks();}
  }
}
