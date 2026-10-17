import {DEFAULT_PREFERENCES} from '../public/default-preferences.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { inferName, normalize, matchScore, classifyEntry } from '../metadata.mjs';
import { parseRange, startServer } from '../server.mjs';
import { Library } from '../library.mjs';
import { PlaylistSync } from '../sync.mjs';

test('filename inference preserves remix identity and removes only known wrappers',()=>{
  const t=inferName('[DnB] - Feint - Snake Eyes (feat. CoMa) [Monstercat Release].flac');assert.equal(t.artist,'Feint');assert.equal(t.title,'Snake Eyes (feat. CoMa)');assert.equal(t.genre,'DnB');
  assert.equal(inferName('Undertale - Megalovania (Oscar Santos Remix).flac').title,'Megalovania (Oscar Santos Remix)');
});
test('fullwidth filenames and yt-dlp ID suffixes normalize correctly',()=>{assert.equal(normalize('＂Dream＂ ｜ Mors'),'dreammors');assert.equal(normalize('Song [aBcDeFgHi_1]'),'song');});
test('duplicate matching accepts exact title + duration and never guesses among ambiguous titles',()=>{
  const tracks=[{id:'local',available:true,rawTitle:'Artist - Song',duration:180,path:'x'}];
  assert.equal(classifyEntry({id:'abcdefghijk',title:'Artist - Song',duration:181},tracks).status,'existing');
  assert.equal(classifyEntry({id:'abcdefghijk',title:'Artist - Song',duration:400},tracks).status,'review');
  assert.equal(classifyEntry({id:'abcdefghijk',title:'Artist - Song (extended)',duration:400},tracks).status,'review');
  assert.equal(classifyEntry({id:'abcdefghijk',title:'New song',duration:180},tracks).status,'new');
  assert.equal(classifyEntry({id:'abcdefghijk',title:'Artist - Song',duration:180},[{...tracks[0],available:false}]).status,'new');
  assert.equal(classifyEntry({id:'abcdefghijk'},[],new Set(['abcdefghijk'])).status,'existing');
});
test('metadata matching rejects conflicting versions and duration mismatch',()=>{
  const t={title:'A Song',artist:'An Artist',duration:200,rawTitle:'An Artist - A Song'};
  assert.equal(matchScore(t,{title:'A Song',artist:'An Artist',duration:201}),1);
  assert.ok(matchScore(t,{title:'A Song (Live)',artist:'An Artist',duration:201})<.95);
  assert.ok(matchScore(t,{title:'A Song',artist:'An Artist',duration:400})<.95);
});
test('range parsing handles long mix offsets, suffixes, and unsatisfiable requests',()=>{
  assert.deepEqual(parseRange('bytes=3000000000-3000000010',4000000000),{start:3000000000,end:3000000010});
  assert.deepEqual(parseRange('bytes=-10',100),{start:90,end:99});assert.deepEqual(parseRange('bytes=95-200',100),{start:95,end:99});
  for(const s of ['bytes=100-','bytes=4-2','bytes=-0','bytes=0-1,5-6','bytes=-','cats=0-1'])assert.throws(()=>parseRange(s,100));
});
test('a stale download preview cannot redownload an archived video',async()=>{
  const base=path.resolve('test-output');await fs.mkdir(base,{recursive:true});const dir=await fs.mkdtemp(path.join(base,'archive-'));const lib=new Library(process.cwd(),dir);lib.config.sources=[];
  await fs.writeFile(path.join(dir,'downloads.txt'),'youtube abcdefghijk\n');const sync=new PlaylistSync(lib);sync.preview={entries:[{id:'abcdefghijk',sourceId:'test',status:'new',title:'Already downloaded'}]};sync.run=()=>{throw Error('Must not invoke yt-dlp for an archived ID');};
  try{await sync.download(['test:abcdefghijk']);assert.equal(sync.job.downloaded,0);assert.equal(sync.job.errors.length,0);assert.equal(sync.preview.entries[0].status,'existing');}finally{lib.close();}
});
test('local server imports audio, streams ranges, enforces write auth, and preserves edits',async()=>{
  const base=path.resolve('test-output');await fs.mkdir(base,{recursive:true});const dir=await fs.mkdtemp(path.join(base,'api-'));const music=path.join(dir,'music');await fs.mkdir(music);
  const wav=Buffer.alloc(44+88200);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(88200,40);await fs.writeFile(path.join(music,'Test Artist - Test Song.wav'),wav);
  const app=await startServer({port:0,dataDir:dir,autoScan:false});const request=async(route,body,token=app.token)=>fetch(app.url+route,{...(body?{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':token},body:JSON.stringify(body)}:{})});
  try{app.lib.config.sources=[{id:'test',kind:'track',name:'Test',path:music}];await app.lib.scan();assert.equal(app.lib.scanJob.errors.length,0);let t=app.lib.list()[0];assert.equal(t.duration,1);assert.equal(t.artist,'Test Artist');
    assert.equal((await request('/api/track',{id:t.id,title:'Edit'},'bad')).status,403);
    const cross=await fetch(app.url+'/api/track',{method:'POST',headers:{'Origin':'https://evil.example','X-Resonance-Token':app.token},body:JSON.stringify({id:t.id,title:'No'})});assert.equal(cross.status,403);
    const audio=await fetch(app.url+'/audio/'+t.id,{headers:{Range:'bytes=0-3'}});assert.equal(audio.status,206);assert.equal(await audio.text(),'RIFF');
    assert.equal((await fetch(app.url+'/audio/'+t.id,{headers:{Range:'bytes=999999-'}})).status,416);
    const artName=t.id+'.jpg';await fs.writeFile(path.join(dir,'artwork',artName),Buffer.from([255,216,255]));assert.equal((await fetch(app.url+'/artwork/'+artName)).status,200);
    const colors=[[.7,.2,.1],[.1,.4,.8],[.8,.85,.9]];
    assert.equal((await request('/api/artwork-palette',{artwork:artName,colors},'bad')).status,403);
    assert.equal((await request('/api/artwork-palette',{artwork:'../library.sqlite',colors})).status,400);
    assert.equal((await request('/api/artwork-palette',{artwork:artName,colors:[[2,0,0]]})).status,400);
    assert.equal((await request('/api/artwork-palette',{artwork:artName,colors})).status,200);
    assert.deepEqual((await (await request('/api/artwork-palette?artwork='+artName)).json()).colors,colors);
    assert.deepEqual(app.lib.getSetting('artworkPalette:'+artName).colors,colors,'palette saved in local SQLite');
    const six=[...colors,...colors];await request('/api/artwork-palette',{artwork:artName,colors:six});
    assert.equal((await (await request('/api/artwork-palette?artwork='+artName)).json()).version,2);
    assert.equal((await request('/artwork-palette.js?v=2')).headers.get('cache-control'),'no-cache','JavaScript named artwork must not be cached as a cover image');
    for(const asset of ['/window-controls.js','/listening-controls.js'])assert.equal((await request(asset)).status,200);
    await fs.appendFile(path.join(dir,'artwork',artName),Buffer.from([0]));
    assert.equal(await (await request('/api/artwork-palette?artwork='+artName)).json(),null,'changed artwork invalidates the cached palette');
    await request('/api/track',{id:t.id,title:'My title',favorite:true});await app.lib.scan();assert.equal(app.lib.tracks.get(t.id).title,'My title');assert.equal(app.lib.tracks.get(t.id).favorite,true);
    await request('/api/track',{id:t.id,genre:'Personal style'});assert.equal(app.lib.tracks.get(t.id).genreLocked,true);await app.lib.genres.discoverTrack(t.id);assert.equal(app.lib.tracks.get(t.id).genre,'Personal style');
    await request('/api/track',{id:t.id,genre:''});assert.equal(app.lib.tracks.get(t.id).genreLocked,true,'an intentionally empty genre is protected');
    const config=await (await request('/api/config',{preferences:{sfx:false,mode:'prism',quality:'eco',sfxVolume:7,intensity:-1,motion:false,unknown:'no'}})).json();assert.deepEqual(config.preferences,{...DEFAULT_PREFERENCES,sfx:false,motion:false,sfxVolume:1,intensity:.2,mode:'resonance',quality:'eco'});assert.deepEqual(app.lib.getSetting('config').preferences,config.preferences);
    const visuals=await (await request('/api/config',{preferences:{mode:'flux',dynamicVisuals:false,sort:'youtube'}})).json();assert.equal(visuals.preferences.dynamicVisuals,false);assert.equal(visuals.preferences.mode,'resonance');assert.equal(visuals.preferences.sort,'youtube');
    const rail=await (await request('/api/config',{preferences:{cameraSpeed:20}})).json();assert.equal(rail.preferences.cameraSpeed,20);assert.equal(app.lib.getSetting('config').preferences.cameraSpeed,20);
    const zoom=await (await request('/api/config',{preferences:{cameraZoom:true,cameraZoomIntensity:99}})).json();assert.equal(zoom.preferences.cameraZoom,true);assert.equal(zoom.preferences.cameraZoomIntensity,undefined);assert.equal(app.lib.getSetting('config').preferences.cameraZoomIntensity,undefined);
    for(const asset of ['queue.js','visual-dynamics.js','classic-scenes.js','gpu-scene.js','scene-catalog.js','scene-shaders.js','nebula-original.js','nebula-live.js','visual-conductor.js','immersive-ui.js','immersive.css','inertia.js','artwork-palette.js'])assert.equal((await request('/'+asset)).status,200);
    await request('/api/config',{preferences:{coverPalette:false}});assert.equal(app.lib.getSetting('config').preferences.coverPalette,false);
    for(const mode of ['collapse','tidal','attractor','aether','loom']){const saved=await (await request('/api/config',{preferences:{mode}})).json();assert.equal(saved.preferences.mode,'resonance');assert.equal(app.lib.getSetting('config').preferences.mode,'resonance');}
    await request('/api/player',{id:t.id,position:.7,volume:.2,queue:[t.id,t.id,t.id],queueIndex:1,queueContext:[t.id,t.id]});const player=app.lib.getSetting('player');assert.equal(player.queueIndex,1);assert.equal(player.queue.length,3);assert.deepEqual(player.queueContext,[t.id]);
    await request('/api/listen',{id:t.id,session:'test',seconds:.6,position:.6});await request('/api/listen',{id:t.id,session:'test',seconds:.6,position:.8});assert.equal(app.lib.tracks.get(t.id).plays,1);
    const p=await (await request('/api/playlists',{name:'Test mood',tracks:[t.id,t.id,'missing']})).json();assert.equal(p.tracks.length,1);
    assert.equal((await request('/audio/../../config.json')).status,404);
    app.lib.config.sources[0].path=path.join(dir,'missing');await app.lib.scan();assert.equal(app.lib.tracks.get(t.id).available,true,'unavailable drive retains tracks');assert.equal(app.lib.scanJob.errors.length,1);
    app.lib.config.sources[0].path=music;await fs.rename(path.join(music,'Test Artist - Test Song.wav'),path.join(dir,'moved.wav'));await app.lib.scan();assert.equal(app.lib.tracks.get(t.id).available,false,'missing files marked offline only after completed scan');
  }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
