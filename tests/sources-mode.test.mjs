import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {sourceFiles,validateSource,playlistId} from '../sources.mjs';
import {Library} from '../library.mjs';
import {startServer} from '../server.mjs';
import {Reactor} from '../public/reactor.js';
import {AudioFeatures,SPECTRAL_WINDOWS} from '../public/analysis.js';
import {VisualConductor} from '../public/visual-conductor.js';
const temp=async()=>{await fs.mkdir('test-output',{recursive:true});return fs.mkdtemp(path.resolve('test-output','sources-'));};
function wav(){const b=Buffer.alloc(44+88200);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(88200,40);return b;}
test('source validation accepts local and YouTube sources, rejects duplicates, overlaps and unrelated URLs',async()=>{
 const dir=await temp(),nested=path.join(dir,'nested');await fs.mkdir(nested);
 assert.equal(playlistId('https://music.youtube.com/playlist?list=PLtest_123456'), 'PLtest_123456');
 for(const link of ['https://youtube.com.evil.test/playlist?list=PLtest_123456','file:///test','https://www.youtube.com/watch?v=test'])assert.throws(()=>playlistId(link));
 const source=await validateSource({type:'youtube',name:'Music',path:dir,url:'https://youtube.com/playlist?list=PLtest_123456'},[]);
 await assert.rejects(validateSource({type:'folder',name:'Overlap',path:nested},[source]),/overlaps/);
 await assert.rejects(validateSource({...source,id:undefined},[source]),/already connected/);
 assert.equal((await validateSource({...source,name:'Renamed'},[source])).id,source.id);
});
test('M3U order, shared membership, manual metadata, and listening history survive disconnect and restart',async()=>{
 const dir=await temp(),music=path.join(dir,'music');await fs.mkdir(music);
 await fs.writeFile(path.join(music,'A.wav'),wav());await fs.writeFile(path.join(music,'B.wav'),wav());
 const playlist=path.join(dir,'Evening.m3u8');await fs.writeFile(playlist,'\uFEFF#EXTM3U\n#EXTINF:1,B\nmusic/B.wav\nmusic/A.wav\nmusic/B.wav\nhttps://example.org/radio.mp3\n');
 const files=await sourceFiles({type:'m3u',path:playlist,name:'Evening'});assert.deepEqual(files.files.map(f=>path.basename(f)),['B.wav','A.wav']);assert.equal(files.errors.length,1);
 let lib=new Library(process.cwd(),path.join(dir,'data'));
 try{
  assert.deepEqual(lib.config.sources,[],'a new library has no personal sources');
  const folder=await lib.saveSource({type:'folder',name:'Files',path:music});await lib.scan();
  const source=await lib.saveSource({type:'m3u',name:'Evening',path:playlist});await lib.scan();
  const b=lib.list().find(t=>path.basename(t.path)==='B.wav');lib.save({...b,title:'My title',favorite:true,plays:7});
  assert.deepEqual(source.trackIds.map(id=>path.basename(lib.tracks.get(id).path)),['B.wav','A.wav']);
  lib.disconnectSource(folder.id);assert.equal(lib.tracks.get(b.id).sourceId,source.id);assert.equal(lib.tracks.get(b.id).available,true);
  lib.disconnectSource(source.id);assert.equal(lib.tracks.get(b.id).available,false);assert.equal((await fs.stat(b.path)).isFile(),true);
  await lib.saveSource({type:'folder',name:'Reconnected',path:music});await lib.scan();assert.equal(lib.tracks.get(b.id).title,'My title');assert.equal(lib.tracks.get(b.id).plays,7);assert.equal(lib.tracks.get(b.id).favorite,true);
  lib.close();lib=new Library(process.cwd(),path.join(dir,'data'));assert.equal(lib.tracks.get(b.id).available,true);assert.equal(lib.config.sources[0].type,'folder');
 }finally{lib.close();}
});
test('source endpoints enforce auth, expose the native picker, invalidate sync previews and persist visual preferences',async()=>{
 const dir=await temp(),music=path.join(dir,'music');await fs.mkdir(music);const app=await startServer({port:0,dataDir:path.join(dir,'data'),autoScan:false,chooseSource:async()=>music});
 const request=(route,body,method='POST',token=app.token)=>fetch(app.url+route,{method,headers:{'Content-Type':'application/json','X-Resonance-Token':token},body:JSON.stringify(body)});
 try{
  assert.equal((await (await fetch(app.url+'/api/library')).json()).capabilities.sourcePicker,true);
  assert.equal((await request('/api/sources',{type:'folder',name:'Test',path:music},'POST','bad')).status,403);
  assert.equal((await (await request('/api/source-picker',{type:'folder'})).json()).path,music);
  app.sync.preview={entries:[{id:'stale'}]};const added=await request('/api/sources',{type:'folder',name:'Test',path:music});assert.equal(added.status,200);assert.equal(app.sync.preview,null);
  while(app.lib.scanJob.running)await new Promise(r=>setTimeout(r,10));
  app.sync.job.running=true;assert.equal((await request('/api/sources',{id:app.lib.config.sources[0].id},'DELETE')).status,409);app.sync.job.running=false;
  const cfg=await (await request('/api/config',{preferences:{musicOnly:true,targetFPS:165,fluidity:4,iridescence:.9,depth:.5,spectralDetail:1.2}})).json();assert.equal(cfg.preferences.musicOnly,true);assert.equal(cfg.preferences.targetFPS,165);assert.equal(cfg.preferences.fluidity,1.5);assert.deepEqual(cfg.preferences,app.lib.getSetting('config').preferences);
  await request('/api/config',{preferences:{targetFPS:999,musicOnly:'no'}});assert.equal(app.lib.config.preferences.targetFPS,165);assert.equal(app.lib.config.preferences.musicOnly,true);
  assert.equal((await fetch(app.url+'/source-ui.js')).status,200);
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
test('music only cancels all visual frames, releases GPU, bypasses analysis and preserves playback and EQ on return',()=>{
 const original={matchMedia:globalThis.matchMedia,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const queued=new Map();let seq=0,released=0,cloned=0;
 globalThis.matchMedia=()=>({matches:false});globalThis.document={querySelectorAll:()=>[{cloneNode:()=>({}),replaceWith:()=>cloned++}]};globalThis.requestAnimationFrame=fn=>{queued.set(++seq,fn);return seq;};globalThis.cancelAnimationFrame=id=>queued.delete(id);
 const node=()=>({links:[],connect(other){this.links.push(other);},disconnect(){this.links=[];},gain:{setTargetAtTime(){},cancelScheduledValues(){},setValueAtTime(v){this.value=v;}}});
 try{const audio={currentTime:123,paused:false,volume:.4},r=new Reactor(audio);r.context={destination:node(),currentTime:12,createGain:node};r.source=node();r.analyser=node();r.filters=[node(),node(),node()];r.gpu={dispose(){released++;}};r.eq([-2,0,1]);r.start();assert.equal(queued.size,1);
  r.setMusicOnly(true);assert.equal(queued.size,0);assert.equal(released,1);assert.equal(cloned,1);assert.equal(r.gpu,null);assert.equal(r.running,false);assert.equal(r.analyser.links.length,0);assert.deepEqual(r.filters[2].links,[r.levelGain]);assert.deepEqual(r.fadeGain.links,[r.context.destination]);assert.deepEqual(audio,{currentTime:123,paused:false,volume:.4});r.start();assert.equal(queued.size,0);
  r.setMusicOnly(false);assert.equal(queued.size,1);assert.deepEqual(r.filters[2].links,[r.analyser]);assert.deepEqual(r.analyser.links,[r.levelGain]);assert.deepEqual(r.fadeGain.links,[r.context.destination]);assert.deepEqual(r.eqValues,[-2,0,1]);r.setMusicOnly(true);r.eq([0,0,0]);assert.deepEqual(r.source.links,[r.levelGain]);assert.deepEqual(r.fadeGain.links,[r.context.destination]);assert.equal(queued.size,0);
 }finally{Object.assign(globalThis,original);}
});
test('narrow spectral windows isolate tones across sample rates, decay without fake beats, and remain smooth at 165 Hz',()=>{
 for(const rate of [44100,48000,96000])for(const hz of [110,440,1000,4000,10000]){
  const f=new AudioFeatures(),c=new VisualConductor(),frequency=new Float32Array(4096).fill(-160),wave=new Float32Array(8192).fill(.2);frequency[Math.round(hz/(rate/8192))]=-18;
  for(let i=0;i<165;i++)c.update(f.update(frequency,wave,rate,8192,1/165,i/165,true),1/165);
  const strongest=f.spectrum.indexOf(Math.max(...f.spectrum));assert.ok(Math.abs(Math.log2(SPECTRAL_WINDOWS[strongest].center/hz))<.2,`${hz}Hz detected at ${SPECTRAL_WINDOWS[strongest].center}`);
  const outside=[...c.spectrum].filter((_,i)=>Math.abs(i-strongest)>2);assert.ok(Math.max(...outside)<.001,'unrelated filaments stay dark');assert.ok(c.spectrum[strongest]>.5);
  for(let i=0;i<660;i++)c.update(f.update(frequency,wave,rate,8192,1/165,1+i/165,false),1/165,{active:false});assert.ok(Math.max(...c.spectrum)<.001);assert.ok(c.clock>0);
 }
});
test('the visual scheduler follows display refresh in Auto and respects manual caps',()=>{
 const original={matchMedia:globalThis.matchMedia,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 globalThis.matchMedia=()=>({matches:false});let next,frames=0;
 const canvas={getBoundingClientRect:()=>({width:1000,height:700})},room={hidden:false,clientWidth:1000,clientHeight:700};
 globalThis.document={hidden:false,querySelector:s=>s==='#listening-room'?room:canvas};globalThis.requestAnimationFrame=fn=>{next=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
 try{for(const target of [60,165]){const r=new Reactor({paused:true,ended:false});r.mode='resonance';r.targetFPS=target;r.gpu={draw:()=>{frames++;return true;}};r.updateMeters=()=>{};r.start();frames=0;for(let i=1;i<=165;i++)next(i*1000/165);assert.ok(frames<=target+1);assert.ok(frames>=target*.8,`${target} target drew ${frames}`);}
  const r=new Reactor({paused:true,ended:false});r.mode='resonance';r.targetFPS='auto';r.gpu={draw:()=>{frames++;return true;}};r.updateMeters=()=>{};r.start();let time=0;
  for(const hz of [60,75,120,144,165,240,360]){r.displayRefreshRate=hz;frames=0;for(let i=0;i<hz;i++){time+=1000/hz;next(time);}assert.equal(frames,hz,`Auto renders every display frame at ${hz} Hz`);}
 }
 finally{Object.assign(globalThis,original);}
});
