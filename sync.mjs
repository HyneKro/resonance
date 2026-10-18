import {downloadFailure,fallbackCandidates} from './public/recording-fallback.js';
import {spotifyEntries} from './spotify.mjs';
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
          if(source.type==='spotify'){const result=await spotifyEntries(this,source,archived);entries.push(...result.entries);sources.push(result.source);this.job.errors.push(...result.notices.map(n=>source.name+': '+n));this.job.done++;continue;}
          const output=await this.run(['--flat-playlist','--dump-single-json','--ignore-errors','--socket-timeout','25',`https://www.youtube.com/playlist?list=${source.playlist}`]);
          const playlist=JSON.parse(output);sources.push({id:source.id,name:playlist.title,count:playlist.entries?.length||0});
          const local=this.lib.list().filter(t=>t.sourceId===source.id);
          for(const [entryIndex,e] of (playlist.entries||[]).entries()){if(!e?.id)continue;const alias=local.find(t=>t.originalYoutubeId===e.id&&t.available!==false);const classification=alias?{status:'existing',trackId:alias.id,reason:'Alternative recording saved'}:classifyEntry(e,local,archived);const entry={id:e.id,title:e.title||'Unavailable video',duration:e.duration||0,channel:e.channel||e.uploader||'',thumbnail:e.thumbnails?.filter(x=>x.url?.startsWith('https://i.ytimg.com/')).sort((a,b)=>(b.width||0)-(a.width||0))[0]?.url||`https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,sourceId:source.id,playlistIndex:Number.isInteger(e.playlist_index)&&e.playlist_index>0?e.playlist_index:entryIndex+1,...classification};entries.push(entry);
            if(classification.status==='existing'&&classification.trackId&&!alias){const t=this.lib.tracks.get(classification.trackId);this.lib.save({...t,youtubeId:e.id,channel:entry.channel,sourceUrl:`https://www.youtube.com/watch?v=${e.id}`,youtubeThumbnail:entry.thumbnail});}
          }
        }catch(e){if(!this.cancelled)this.job.errors.push(`${source.name}: ${e.message}`);}this.job.done++;
      }
      if(!this.cancelled){this.preview={checkedAt:Date.now(),entries,sources,errors:[...this.job.errors]};this.lib.setSetting('syncPreview',this.preview);this.saveSpotifyLinks();this.job.message=`${entries.filter(e=>e.status==='new').length} new finds · ${entries.filter(e=>e.status==='review').length} matches to review`;this.job.phase='ready';void this.cacheCovers();}
    }catch(e){this.job.errors.push(e.message);}finally{this.job.running=false;if(this.cancelled){this.job.phase='cancelled';this.job.message='Playlist check cancelled';}}
  }
  selectSpotifyMatch(sourceId,spotifyId,videoId){
    if(this.job.running)throw Error('Wait for the playlist update to finish.');
    const entry=this.preview?.entries.find(e=>e.sourceId===sourceId&&e.spotifyId===spotifyId&&e.provider==='spotify'&&e.status==='review');
    const candidate=entry?.candidates?.find(c=>c.id===videoId);if(!candidate)throw Error('Choose one of the reviewed YouTube matches.');
    for(const e of this.preview.entries.filter(e=>e.sourceId===sourceId&&e.spotifyId===spotifyId&&e.status==='review'))Object.assign(e,{id:candidate.id,matchedTitle:candidate.title,matchedChannel:candidate.channel,matchedDuration:candidate.duration});
    const cache=this.lib.getSetting('spotifyMatches')||{};if(cache[spotifyId]){cache[spotifyId].chosenId=videoId;this.lib.setSetting('spotifyMatches',cache);}
    this.lib.setSetting('syncPreview',this.preview);return entry;
  }
  saveSpotifyLinks(){
    for(const entry of this.preview?.entries||[]){if(entry.provider!=='spotify'||entry.status!=='existing')continue;
      const track=this.lib.list().find(t=>t.sourceId===entry.sourceId&&(t.id===entry.trackId||t.youtubeId===entry.id));
      if(track){this.lib.save({...track,spotifyId:entry.spotifyId,spotifyTitle:entry.title,spotifyArtist:entry.channel,spotifyUrl:entry.spotifyUrl});entry.trackId=track.id;}
    }
    if(this.preview)this.lib.setSetting('syncPreview',this.preview);this.lib.applyPlaylistOrder(this.preview);
  }
  async alternative(entry,args,onLine){
    this.job.message='Looking for another recording of '+entry.title+'…';
    const query=[entry.channel,entry.title,'audio'].join(' ').slice(0,450);
    const output=await this.run(['--flat-playlist','--dump-single-json','--socket-timeout','20','ytsearch5:'+query],null,60000);
    if(this.cancelled)throw Error('Cancelled');
    const candidates=fallbackCandidates(entry,JSON.parse(output).entries||[]);
    for(const candidate of candidates){
      try{await this.run([...args.slice(0,-1),'https://www.youtube.com/watch?v='+candidate.id],onLine,7200000);
        entry.originalYoutubeId=entry.id;entry.id=candidate.id;entry.alternativeTitle=candidate.title;
        return true;
      }catch(error){if(this.cancelled||downloadFailure(error.message)!=='unavailable')throw error;}
    }return false;
  }
  saveAlternativeLinks(){
    for(const entry of this.preview?.entries||[]){if(!entry.originalYoutubeId||entry.status!=='existing')continue;
      const track=this.lib.list().find(t=>t.youtubeId===entry.id&&t.sourceId===entry.sourceId);
      if(track){this.lib.save({...track,originalYoutubeId:entry.originalYoutubeId,alternativeRecording:true});entry.trackId=track.id;}
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
        const args=['--no-playlist','--windows-filenames','--no-overwrites','--continue','--newline','--socket-timeout','25','--retries','3','--fragment-retries','3','--js-runtimes',`node:${nodeRuntime}`,'-f','bestaudio/best','-x','--audio-format',this.lib.config.downloadFormat==='flac'?'flac':'best','--embed-metadata','--write-info-json','--write-thumbnail','--convert-thumbnails','jpg','--download-archive',path.join(this.lib.dataDir,'downloads.txt'),'-o',path.join(source.path,'%(title).170B [%(id)s].%(ext)s'),'--progress-template','download:PROGRESS %(progress._percent_str)s %(progress._speed_str)s ETA %(progress._eta_str)s',`https://www.youtube.com/watch?v=${entry.id}`];
        if(fs.existsSync(path.join(this.lib.root,'tools','ffmpeg.exe')))args.unshift('--ffmpeg-location',path.join(this.lib.root,'tools'));
        const onLine=line=>{if(line.startsWith('PROGRESS '))this.job.progress=line.slice(9).trim();};
        try{await this.run(args,onLine,7200000);}catch(error){
          if(this.cancelled||downloadFailure(error.message)!=='unavailable')throw error;
          if(!await this.alternative(entry,args,onLine))throw Error('Recording unavailable; no sufficiently close alternative was found. Skipped.');
        }
        entry.status='existing';entry.reason=entry.originalYoutubeId?'Downloaded alternative: '+entry.alternativeTitle:'Downloaded';this.job.downloaded++;
        this.lib.setSetting('syncPreview',this.preview);
      }catch(e){if(!this.cancelled)this.job.errors.push(`${entry.title}: ${e.message}`);if(downloadFailure(e.message)==='pause'){this.job.paused=true;break;}}this.job.done++;
    }}finally{this.job.running=false;this.job.phase=this.cancelled?'cancelled':this.job.paused?'paused':'complete';this.job.message=this.cancelled?'Update cancelled — completed downloads are kept':this.job.paused?'Downloads paused. Finished songs are saved; wait before retrying.':`Update complete · ${this.job.downloaded} downloaded`;this.job.progress='';await this.lib.scan();this.saveAlternativeLinks();this.saveSpotifyLinks();}
  }
}
