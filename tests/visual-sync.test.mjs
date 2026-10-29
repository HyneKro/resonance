import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {VisualSyncBuffer,resolveVisualSync} from '../public/visual-sync.js';
import {AudioFeatures} from '../public/analysis.js';
import {preferencesWithDefaults} from '../public/default-preferences.js';
import {Reactor} from '../public/reactor.js';
import {startServer} from '../server.mjs';

test('device compensation includes reported processing latency, supports precise trim and never invents desktop latency',()=>{
 const context={outputLatency:.2,baseLatency:.01};
 assert.equal(resolveVisualSync(context).delayMs,210);
 assert.equal(resolveVisualSync(context,{visualSyncOffsetMs:37}).delayMs,247);
 assert.equal(resolveVisualSync(context,{visualSyncOffsetMs:-63}).delayMs,147);
 assert.equal(resolveVisualSync(context,{visualSyncAuto:false,visualSyncOffsetMs:137}).delayMs,137);
 assert.equal(resolveVisualSync(context,{visualSyncOffsetMs:-1000}).delayMs,0);
 for(const bad of [undefined,NaN,Infinity,-1,3,0]){
  const s=resolveVisualSync({outputLatency:bad,baseLatency:.02},{visualSyncOffsetMs:111});assert.equal(s.available,false);assert.equal(s.delayMs,111);
 }
 const desktop=resolveVisualSync(context,{visualSyncOffsetMs:321,desktopVisualSyncOffsetMs:167},true);
 assert.equal(desktop.delayMs,167);assert.equal(desktop.available,false);assert.equal(desktop.automatic,false);
 const p=preferencesWithDefaults({visualSyncAuto:'bad',visualSyncOffsetMs:10000,desktopVisualSyncOffsetMs:-4});assert.equal(p.visualSyncAuto,true);assert.equal(p.visualSyncOffsetMs,1000);assert.equal(p.desktopVisualSyncOffsetMs,0);
});
test('all frequency, loudness, waveform and playing-state measurements arrive at the requested time without duplicate beats',()=>{
 const b=new VisualSyncBuffer();b.setDelay(137);const f=new AudioFeatures();f.spectrum=new Float32Array(48);const wave=new Float32Array(1024).fill(.4);
 for(let t=0;t<=500;t++){
  f.bands.fill(t/1000);f.spectrum.fill(t/1000);f.lightingSpectrum.fill(t/1000);f.hits[0]=t===200?1:0;f.db=-30;f.loudness=t/1000;
  const out=b.process(f,t<300,t,wave);
  if(t<137){assert.equal(out.loudness,0);assert.equal(b.active,false);}
  else{assert.ok(Math.abs(out.loudness-(t-137)/1000)<1e-6);assert.ok(Math.abs(out.spectrum[4]-(t-137)/1000)<1e-6);assert.ok(Math.abs(out.lightingSpectrum[4]-(t-137)/1000)<1e-6);assert.ok(Math.abs(out.wave[77]-.4)<1e-6);assert.equal(b.active,t-137<300);}
  assert.equal(out.hits[0],t===337?1:0);
 }
});
test('delay holds samples, merges skipped hits once, clears stale material and stays bounded at high refresh rates',()=>{
 const b=new VisualSyncBuffer();b.setDelay(120);const f=new AudioFeatures();
 for(let t=0;t<=200;t+=10){f.hits.fill(0);f.hits[t===20?0:1]=t===20||t===30?1:0;b.process(f,true,t);}
 f.hits.fill(0);b.process(f,true,240);assert.deepEqual([...b.output.hits],[0,0,0]);
 b.clear();b.setDelay(50);
 f.hits[0]=1;b.process(f,true,0);f.hits[0]=0;b.process(f,true,10);assert.equal(b.process(f,true,70).hits[0],1);assert.equal(b.process(f,true,80).hits[0],0);
 b.process(f,true,2000);assert.equal(b.active,false);assert.equal(b.output.db,-100);
 b.setDelay(2000);for(let t=0;t<12000;t++)b.process(f,true,t);assert.ok(b.slots.length<=2048);assert.ok(b.count<=2048);
 b.clear();assert.equal(b.count,0);assert.equal(b.slots.length,0);
 b.setDelay(0);assert.equal(b.process(f,true,1),f);assert.equal(b.slots.length,1,'bypass keeps a little history for later delay adjustments');
});
test('Reactor delays the shared visual input and clears it on seek, without changing audio playback',()=>{
 const old=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});
 try{
  const audio={paused:false,ended:false,currentTime:42,volume:.7},r=new Reactor(audio);
  r.context={outputLatency:.1,baseLatency:.02};r.setVisualSync({visualSyncOffsetMs:17});assert.equal(r.visualSync.delayMs,137);
  r.rawFeatures.loudness=.8;r.rawFeatures.hits[0]=1;r.syncAnalysis(0);assert.equal(r.reactiveActive,false);assert.equal(r.features.loudness,0);
  r.rawFeatures.hits[0]=0;r.syncAnalysis(100);r.syncAnalysis(137);assert.equal(r.reactiveActive,true);assert.ok(r.features.loudness>.79);assert.equal(r.features.hits[0],1);
  r.resetAnalysis();assert.equal(r.visualSync.count,0);assert.equal(r.features.loudness,0);assert.equal(r.tempo.output.bpm,0);
  r.context.outputLatency=.23;r.refreshVisualSync(false,r.syncCheckedAt+1000);assert.equal(r.visualSync.delayMs,267);
  r.desktopSource={};r.setVisualSync({visualSyncOffsetMs:17,desktopVisualSyncOffsetMs:83});assert.equal(r.visualSync.delayMs,83);
  assert.deepEqual(audio,{paused:false,ended:false,currentTime:42,volume:.7});
 }finally{globalThis.matchMedia=old;}
});
test('sync preferences validate, persist locally, and the new modules are served',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/sync-api-')),app=await startServer({port:0,dataDir:dir,autoScan:false});
 const save=async preferences=>(await(await fetch(app.url+'/api/config',{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify({preferences})})).json()).preferences;
 try{
  let p=await save({visualSyncAuto:false,visualSyncOffsetMs:137,desktopVisualSyncOffsetMs:183});assert.equal(p.visualSyncOffsetMs,137);assert.equal(p.desktopVisualSyncOffsetMs,183);assert.equal(p.visualSyncAuto,false);
  p=await save({visualSyncOffsetMs:-46.8,desktopVisualSyncOffsetMs:9999,visualSyncAuto:true});assert.equal(p.visualSyncOffsetMs,-47);assert.equal(p.desktopVisualSyncOffsetMs,1000);assert.equal(app.lib.getSetting('config').preferences.visualSyncAuto,true);
  p=await save({visualSyncOffsetMs:'wrong',visualSyncAuto:'true'});assert.equal(p.visualSyncOffsetMs,-47);
  for(const file of ['visual-sync.js','visual-sync-ui.js'])assert.equal((await fetch(app.url+'/'+file)).status,200);
 }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.lib.close();}
});
