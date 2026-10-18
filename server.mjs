import {metadataSnapshot} from './public/metadata-review.js';
import {summarizeProfile,cleanMapState} from './public/constellation-model.js';
import {AudioResearch} from './audio-research.mjs';
import {CAMERA_SPEED} from './public/scene-camera.js';
import {KALEIDOSCOPE_MODES} from './public/kaleidoscope.js';
import {createStorageReader,applicationStoragePaths} from './storage.mjs';
import {companionPosition} from './public/companion-model.js';
import {createTrackSearch} from './track-search.mjs';
import {createLyricsReader} from './track-lyrics.mjs';
import {TrackResearch,researchStamp} from './track-research.mjs';
import {preferencesWithDefaults} from './public/default-preferences.js';
import {createIdentityReader} from './visual-identity.mjs';
import {VISUAL_SETTINGS,visualNumber,THEMES} from './public/visual-settings.js';
import {sanitizeRoles} from './public/sound-roles.js';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Library } from './library.mjs';
import { PlaylistSync } from './sync.mjs';
import { visualMode, isVisualMode } from './public/scene-catalog.js';
import { validPalette, PALETTE_VERSION } from './public/artwork-palette.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.flac':'audio/flac','.mp3':'audio/mpeg','.m4a':'audio/mp4','.aac':'audio/aac','.wav':'audio/wav','.ogg':'audio/ogg','.opus':'audio/ogg','.webm':'audio/webm','.ico':'image/x-icon'};
export function parseRange(header,size){if(!header)return null;const m=/^bytes=(\d*)-(\d*)$/.exec(header);if(!m||!m[1]&&!m[2])throw Error('range');let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));let end=m[1]?m[2]?Number(m[2]):size-1:size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start<0||end<start)throw Error('range');return {start,end:Math.min(end,size-1)};}
export async function startServer({port=38721,dataDir=process.env.RESONANCE_DATA||path.join(root,'data'),autoScan=true,chooseSource=null,profileDir,applicationPaths}={}){
  const lib=new Library(root,dataDir),sync=new PlaylistSync(lib),token=randomBytes(24).toString('hex');const trackSearch=createTrackSearch(lib),readLyrics=createLyricsReader(lib),readIdentity=createIdentityReader(lib),research=new TrackResearch(lib,readIdentity,{enabled:autoScan});const sessions=new Map();let sourceMutation=false;
  const audioResearch=new AudioResearch(lib);
  const loudnessTimer=setTimeout(()=>audioResearch.setLeveling(lib.config.preferences?.leveling),4000);loudnessTimer.unref();
  const storage=createStorageReader(lib,{profileDir,applicationPaths:applicationPaths??await applicationStoragePaths(root)});
  const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  async function serveFile(req,res,file){let stat;try{stat=await fsp.stat(file);}catch{return json(res,{error:'File unavailable. Reconnect the music drive and rescan.'},404);}let range;try{range=parseRange(req.headers.range,stat.size);}catch{res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
    const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':path.dirname(file)===path.join(dataDir,'artwork')?'public, max-age=3600':'no-cache'};if(range){headers['Content-Range']=`bytes ${range.start}-${range.end}/${stat.size}`;headers['Content-Length']=range.end-range.start+1;}else headers['Content-Length']=stat.size;
    res.writeHead(range?206:200,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file,range||{});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }
  const server=http.createServer(async(req,res)=>{try{
    if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return json(res,{error:'Local access only'},403);
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
    const url=new URL(req.url,'http://127.0.0.1');const route=decodeURIComponent(url.pathname);
    let body={};if(req.method==='POST'||req.method==='DELETE'){
      if(req.headers['x-resonance-token']!==token||req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(res,{error:'Request rejected'},403);
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1e6)return json(res,{error:'Request too large'},413);}try{body=raw?JSON.parse(raw):{};}catch{return json(res,{error:'Invalid JSON'},400);}
    }else if(!['GET','HEAD'].includes(req.method))return json(res,{error:'Method not allowed'},405);
    if(req.method==='GET'&&route==='/api/library')return json(res,{token,tracks:lib.list(),playlists:lib.playlists(),config:lib.config,session:lib.getSetting('player'),capabilities:{sourcePicker:!!chooseSource}});
    if(req.method==='POST'&&route==='/api/source-picker'){
      if(!['folder','m3u','youtube','spotify'].includes(body.type))return json(res,{error:'Choose a source type.'},400);
      return json(res,{path:chooseSource?await chooseSource(body.type):null});
    }
    if(route==='/api/sources'&&['POST','DELETE'].includes(req.method)){
      if(sourceMutation||lib.scanJob.running||sync.job.running)return json(res,{error:'Wait for the current scan or playlist update to finish.'},409);
      sourceMutation=true;try{if(req.method==='DELETE')lib.disconnectSource(body.id);else await lib.saveSource(body);}catch(e){return json(res,{error:e.message},400);}finally{sourceMutation=false;}
      sync.preview=null;lib.setSetting('syncPreview',null);
      if(req.method==='POST')void lib.scan().then(()=>research.start());
      return json(res,{config:lib.config});
    }
    if(route==='/api/audio-profile'&&req.method==='GET')return json(res,audioResearch.status(url.searchParams.get('id')));
    if(route==='/api/constellation'&&req.method==='GET'){
      const profiles={},colors={},failed=[];
      for(const t of lib.tracks.values()){
        if(!t.available)continue;const p=audioResearch.read(t.id),summary=summarizeProfile(p);
        if(summary)profiles[t.id]=summary;else if(audioResearch.status(t.id).error)failed.push(t.id);
        const c=lib.getSetting('artworkPalette:'+t.artwork)?.colors?.[0];
        if(Array.isArray(c)&&c.length===3&&c.every(Number.isFinite))colors[t.id]='#'+c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
      }
      return json(res,{profiles,colors,failed,saved:cleanMapState(lib.getSetting('constellation'),[...lib.tracks.keys()]),canPrepare:true});
    }
    if(route==='/api/constellation'&&req.method==='POST'){const saved=cleanMapState(body,[...lib.tracks.keys()]);lib.setSetting('constellation',saved);return json(res,{ok:true});}
    if(route==='/api/audio-profile'&&req.method==='POST')return json(res,audioResearch.request(body.id,body.force===true,body.priority===true));
    if(route==='/api/loudness-status'&&req.method==='GET')return json(res,audioResearch.coverage());
    if(route==='/api/playback-edit'&&req.method==='POST')return json(res,audioResearch.edit(body.id,body));
    if(req.method==='GET'&&route==='/api/status')return json(res,{scan:lib.scanJob,enrich:lib.enrichJob,genres:lib.genres.job,sync:sync.job,covers:sync.coverJob,character:research.job,count:lib.tracks.size});
    if(req.method==='GET'&&route==='/api/storage')return json(res,await storage({refresh:url.searchParams.get('refresh')==='1'}));
    if(route==='/api/artwork-palette'&&['GET','POST'].includes(req.method)){
      const artwork=req.method==='GET'?url.searchParams.get('artwork'):body.artwork;
      if(typeof artwork!=='string'||!/^([a-f0-9]{24})\.(jpg|png|webp)$/.test(artwork))return json(res,{error:'Invalid artwork'},400);
      let stat;try{stat=await fsp.stat(path.join(dataDir,'artwork',artwork));}catch{return json(res,{error:'Artwork unavailable'},404);}
      const key='artworkPalette:'+artwork;
      if(req.method==='POST'){
        if(!validPalette(body.colors))return json(res,{error:'Invalid palette'},400);
        lib.setSetting(key,{version:body.colors.length===6?PALETTE_VERSION:1,colors:body.colors,mtime:stat.mtimeMs,size:stat.size});return json(res,{ok:true});
      }
      const cached=lib.getSetting(key);return json(res,cached?.mtime===stat.mtimeMs&&cached?.size===stat.size?cached:null);
    }
    if(route==='/api/visual-identity'&&(req.method==='GET'||req.method==='POST')){
      const id=req.method==='GET'?url.searchParams.get('id'):body.id;if(!lib.tracks.has(id))return json(res,{error:'Track not found'},404);
      if(req.method==='POST'){if(typeof body.notes!=='string')return json(res,{error:'Enter theme hints as text'},400);lib.setSetting('visualNotes:'+id,body.notes.slice(0,1600));}
      return json(res,await research.get(id));
    }
    if(req.method==='POST'&&route==='/api/track-search')return json(res,await trackSearch.search(body.id,body));
    if(req.method==='POST'&&route==='/api/track-search/apply')return json(res,await trackSearch.apply(body.id,body));
    if(req.method==='GET'&&route==='/api/track-lyrics'){const id=url.searchParams.get('id');if(!lib.tracks.has(id))return json(res,{error:'Track not found'},404);return json(res,await readLyrics(id));}
    if(req.method==='GET'&&route==='/api/wallpaper'){const id=url.searchParams.get('id'),t=lib.tracks.get(id);if(!t)return json(res,{error:'Track not found'},404);research.enqueue(id,true);const saved=lib.getSetting('wallpaper:'+id);return json(res,saved?.stamp===researchStamp(t)?saved:{assets:[]});}
    if(req.method==='POST'&&route==='/api/genres'){lib.config.autoGenres=!body.stop;lib.setSetting('config',lib.config);if(body.stop)lib.genres.stop();else{lib.enrichJob.stop=true;lib.config.autoEnrich=false;lib.setSetting('config',lib.config);void lib.genres.start({retryMissing:body.retryMissing===true});}return json(res,lib.genres.job);}
    if(req.method==='POST'&&route==='/api/genres/track'){const t=lib.tracks.get(body.id);if(!t)return json(res,{error:'Track not found'},404);if(body.unlock)lib.save({...t,genreLocked:false,genreEvidence:(t.genreEvidence||[]).filter(e=>e.scope!=='manual')});return json(res,await lib.genres.discoverTrack(body.id));}
    if(req.method==='GET'&&route==='/api/sync/preview')return json(res,sync.preview||{entries:[],sources:[]});
    if(req.method==='POST'&&route==='/api/scan'){if(sourceMutation||sync.job.running)return json(res,{error:'Wait for the source update to finish'},409);void lib.scan().then(()=>research.start());return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/enrich'){lib.config.autoEnrich=!body.stop;lib.setSetting('config',lib.config);if(body.stop)lib.enrichJob.stop=true;else void lib.enrich();return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/sync/check'){if(sourceMutation||lib.scanJob.running)return json(res,{error:'Wait for the library scan to finish'},409);void sync.check();return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/sync/download'){if(sourceMutation||lib.scanJob.running||sync.job.running||!sync.preview)return json(res,{error:'Check the playlists first and wait for the check to finish'},409);void sync.download(body.selected).then(()=>research.start()).catch(e=>{sync.job.errors.push(e.message);sync.job.running=false;});return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/sync/cancel'){sync.cancel();return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/candidates')return json(res,await lib.candidates(body.id,String(body.query||'').slice(0,300)));
    if(req.method==='POST'&&route==='/api/source-metadata')return json(res,await lib.sourceMetadata(body.id));
    if(req.method==='POST'&&route==='/api/match')return json(res,await lib.applyCandidate(body.id,body.candidateId));
    if(req.method==='POST'&&route==='/api/metadata/undo'){const t=lib.tracks.get(body.id),undo=lib.getSetting('metadataUndo:'+body.id);if(!t||!undo)throw Error('There is no recent metadata change to undo.');if(JSON.stringify(metadataSnapshot(t))!==JSON.stringify(undo.after))throw Error('Details have changed since that edit. Review them before changing again.');const restored=lib.save({...t,...undo.before});lib.setSetting('metadataUndo:'+body.id,null);return json(res,restored);}
    if(req.method==='POST'&&route==='/api/track'){
      const t=lib.tracks.get(body.id);if(!t)return json(res,{error:'Track not found'},404);const patch={};for(const k of ['title','artist','album','genre','date'])if(typeof body[k]==='string')patch[k]=body[k].slice(0,400);
      if(Object.keys(patch).length){patch.metadataStatus='manual';patch.metadataSource='Your edits';patch.metadataLocks={...(t.metadataLocks||{})};for(const k of ['title','artist','album','genre','date'])if(Object.hasOwn(patch,k)&&patch[k]!==t[k])patch.metadataLocks[k]=true;}if(typeof patch.genre==='string'&&patch.genre!==t.genre){patch.genreLocked=true;patch.genreBasis='manual';patch.genreEvidence=patch.genre.split(/[,;]/).map(name=>({name:name.trim(),scope:'manual',source:'Your edits',confidence:'manual'})).filter(e=>e.name);}if(typeof body.favorite==='boolean')patch.favorite=body.favorite;const updated=lib.save({...t,...patch});if(patch.metadataStatus)lib.setSetting('metadataUndo:'+body.id,{before:metadataSnapshot(t),after:metadataSnapshot(updated)});return json(res,updated);
    }
    if(req.method==='POST'&&route==='/api/listen'){
      const t=lib.tracks.get(body.id);if(!t)return json(res,{error:'Track not found'},404);if(typeof body.session!=='string'||body.session.length>100)return json(res,{error:'Invalid session'},400);
      const key=body.id+':'+body.session;const previous=sessions.get(key)||{total:0,counted:false,at:Date.now()-16000};const increment=Math.max(0,Math.min(16,Number(body.seconds)||0,(Date.now()-previous.at)/1000+1));previous.total+=increment;previous.at=Date.now();const qualifies=!previous.counted&&previous.total>=Math.min(30,t.duration>0?t.duration*.5:30);if(qualifies)previous.counted=true;sessions.set(key,previous);if(sessions.size>500)sessions.delete(sessions.keys().next().value);
      lib.save({...t,listenedSeconds:(t.listenedSeconds||0)+increment,plays:t.plays+(qualifies?1:0),lastPlayed:increment?Date.now():t.lastPlayed,position:Math.max(0,Math.min(t.duration||Infinity,Number(body.position)||0))});return json(res,{ok:true,counted:previous.counted,track:lib.tracks.get(t.id)});
    }
    if(req.method==='POST'&&route==='/api/player'){lib.setSetting('player',{id:body.id,position:Number(body.position)||0,volume:Math.max(0,Math.min(1,Number(body.volume)||0)),queue:Array.isArray(body.queue)?body.queue.filter(id=>lib.tracks.has(id)).slice(0,10000):[],queueIndex:Math.max(0,Math.min(9999,Number.isInteger(body.queueIndex)?body.queueIndex:0)),history:Array.isArray(body.history)?body.history.filter(e=>e&&lib.tracks.has(e.id)&&typeof e.session==='string'&&e.session.length<=100&&Number.isFinite(e.at)&&e.at>0).slice(-200).map(({id,session,at})=>({id,session,at})):[],queueContext:Array.isArray(body.queueContext)?[...new Set(body.queueContext.filter(id=>lib.tracks.has(id)))].slice(0,10000):[]});return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/playlists')return json(res,lib.savePlaylist(body));
    if(req.method==='DELETE'&&route==='/api/playlists'){lib.db.prepare('DELETE FROM playlists WHERE id=?').run(body.id);return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/sync/match'){try{return json(res,sync.selectSpotifyMatch(body.sourceId,body.spotifyId,body.videoId));}catch(e){return json(res,{error:e.message},400);}}
    if(req.method==='POST'&&route==='/api/config'){if(body.downloadFormat)lib.config.downloadFormat=body.downloadFormat==='flac'?'flac':'best';if(body.preferences&&typeof body.preferences==='object'){const p={...(lib.config.preferences||{})};if(body.preferences.visualSyncDevices&&typeof body.preferences.visualSyncDevices==='object')p.visualSyncDevices=body.preferences.visualSyncDevices;if(KALEIDOSCOPE_MODES.some(m=>m.id===body.preferences.kaleidoscopeMode))p.kaleidoscopeMode=body.preferences.kaleidoscopeMode;if(Object.hasOwn(body.preferences,'dancePosition')){const position=companionPosition(body.preferences.dancePosition);if(position||body.preferences.dancePosition===null)p.dancePosition=position;}for(const k of ['leveling','skipSilence','rollercoaster','cameraZoom','sonaFloating','visualSyncAuto','danceCompanion','kaleidoscope','sfx','motion','artistGenres','meters','dynamicVisuals','coverPalette','musicOnly','autoDirection','coverInterface'])if(typeof body.preferences[k]==='boolean')p[k]=body.preferences[k];for(const [k,min,max]of [['crossfadeSeconds',0,8],['cameraSpeed',CAMERA_SPEED.min,CAMERA_SPEED.max],['visualSyncOffsetMs',-1000,1000],['desktopVisualSyncOffsetMs',0,1000],['sfxVolume',0,1],['intensity',.2,1.5],['fluidity',0,1.5],['iridescence',0,1.5],['depth',0,1.5],['spectralDetail',0,1.5],['responsiveness',.25,8]])if(Number.isFinite(body.preferences[k]))p[k]=Math.max(min,Math.min(max,body.preferences[k]));for(const key of Object.keys(VISUAL_SETTINGS))if(Number.isFinite(body.preferences[key]))p[key]=visualNumber(key,body.preferences[key]);if(Object.hasOwn(THEMES,body.preferences.visualTheme))p.visualTheme=body.preferences.visualTheme;if(body.preferences.soundRoles&&typeof body.preferences.soundRoles==='object')p.soundRoles=sanitizeRoles(body.preferences.soundRoles);if(body.preferences.responseDesignVersion===1)p.responseDesignVersion=1;if(body.preferences.colorDesignVersion===2)p.colorDesignVersion=2;if(['white','palette','frequency','birth'].includes(body.preferences.particleColor))p.particleColor=body.preferences.particleColor;if(['auto','on','off'].includes(body.preferences.hdrMode))p.hdrMode=body.preferences.hdrMode;if(['auto',30,60,90,120,144,165,240,360].includes(body.preferences.targetFPS))p.targetFPS=body.preferences.targetFPS;if(isVisualMode(body.preferences.mode))p.mode=visualMode(body.preferences.mode);if(['auto','high','eco'].includes(body.preferences.quality))p.quality=body.preferences.quality;if(['youtube','title','artist','added','recent','plays','duration'].includes(body.preferences.sort))p.sort=body.preferences.sort;lib.config.preferences=preferencesWithDefaults(p);}lib.setSetting('config',lib.config);audioResearch.setLeveling(lib.config.preferences?.leveling);return json(res,lib.config);}
    if(route.startsWith('/audio/')){const t=lib.tracks.get(route.slice(7));if(!t)return json(res,{error:'Track not found'},404);return serveFile(req,res,t.path);}
    if(route==='/sona-motions.webp')return serveFile(req,res,path.join(root,'public','sona-motions.webp'));
    if(['/song-analysis.js','/listening-enhancements.js','/listening-timeline.js','/listening-edit-ui.js','/song-analysis.css','/metadata-review.js'].includes(route))return serveFile(req,res,path.join(root,'public',route));
    if(route==='/app-update-ui.js')return serveFile(req,res,path.join(root,'public','app-update-ui.js'));
    if(/^\/artwork\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(route))return serveFile(req,res,path.join(dataDir,route));
    if(/^\/wallpapers\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(route))return serveFile(req,res,path.join(dataDir,route));
    if(['/musical-layers.js','/sleeve-design.js','/','/listening-modes.js','/listening-modes.css','/constellation-effects.js','/constellation-navigation.js','/constellation.js','/constellation-space.js','/constellation-scene.js','/constellation-sky.js','/constellation-sky-texture.js','/constellation-model.js','/constellation.css','/menu-kit.js','/menu-layout.css','/settings-ui.js','/leveling-ui.js','/portable-update-ui.js','/sona-desktop.js','/sona-overlay.html','/sona-overlay.js','/artist-credits.js','/scene-camera.js','/scene-preparation.js','/storage-ui.js','/storage.css','/scene-reveal.js','/sleeve.css','/shader-loader.js','/startup.js','/startup.css','/visual-sync.js','/visual-sync-ui.js','/display-settings.js','/hdr-output.js','/sync-review.js','/desktop-audio.js','/kaleidoscope.js','/default-preferences.js','/brand.js','/brand.css','/signature.css','/sculpture-forms.js','/atmosphere-transition.js','/dance-companion.js','/companion-motion.js','/companion-model.js','/companion-renderer.js','/companion-emblem.js','/companion-atlas.js','/companion-registration.js','/sona-dance-a.png','/sona-dance-b.png','/sona-interactions.png','/dancer-interactions.png','/dancer-sprite-v2.png','/setting-resets.js','/wallpaper-ui.js','/interface-accent.js','/atmosphere-ui.js','/atmosphere.css','/song-details.js','/visual-settings.js','/track-character.js','/tempo.js','/sound-roles.js','/app.js','/styles.css','/cinema.css','/immersive.css','/window-controls.js','/listening-controls.js','/immersive-ui.js','/source-ui.js','/view-state.js','/particle-spectrum.js','/visual-conductor.js','/inertia.js','/artwork-palette.js','/nebula-live.js','/reactor.js','/analysis.js','/visual-dynamics.js','/classic-scenes.js','/queue.js','/gpu-scene.js','/scene-shaders.js','/nebula-original.js','/scene-catalog.js','/feedback.js','/icon.svg'].includes(route))return serveFile(req,res,path.join(root,'public',route==='/'?'index.html':route));
    return json(res,{error:'Not found'},404);
  }catch(e){if(!res.headersSent)json(res,{error:e.message},500);else res.destroy();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  let startupTimer;
  server.on('close',()=>{clearTimeout(startupTimer);clearTimeout(loudnessTimer);audioResearch.stop();research.stop();lib.genres.stop();});
  if(autoScan){
    const requestPath=path.join(dataDir,'research-request.json');
    try{const request=JSON.parse(await fsp.readFile(requestPath,'utf8'));if(request.version===1&&request.genres===true){lib.config.autoGenres=true;lib.config.autoEnrich=false;lib.setSetting('config',lib.config);await fsp.unlink(requestPath);}}catch{}
    startupTimer=setTimeout(()=>void lib.scan().then(()=>{if(lib.closed||!server.listening)return;lib.genres.seed();research.start();if(lib.config.autoGenres)void lib.genres.start();else if(lib.config.autoEnrich)void lib.enrich();}).catch(e=>{lib.scanJob.errors.push(e.message);}),1200);startupTimer.unref();
  }return {server,lib,sync,research,token,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))startServer({port:Number(process.env.PORT)||38721}).then(app=>{console.log(`Resonance listening at ${app.url}`);process.on('SIGTERM',()=>{app.sync.cancel();app.server.close();process.exit();});}).catch(e=>{console.error(e);process.exit(1);});
