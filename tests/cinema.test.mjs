import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioFeatures } from '../public/analysis.js';
import { SCENES, visualMode, isVisualMode } from '../public/scene-catalog.js';

test('saved scene choices migrate to the new scene collection',()=>{
 for(const id of ['eclipse','nebula','vortex','relic','orbit','ribbons','spectrum','aurora','tunnel','prism','bloom','flux']){
   assert.equal(isVisualMode(id),true);assert.ok(SCENES.some(s=>s.id===visualMode(id)));
 }
 assert.equal(visualMode('nebula'),'resonance');assert.equal(visualMode('tunnel'),'resonance');
 assert.equal(isVisualMode('garbage'),false);assert.equal(visualMode(undefined),'resonance');
 assert.equal(visualMode('toString'),'resonance');assert.equal(visualMode('__proto__'),'resonance');
});

test('isolated bass, attack and air transients drive only their own accents at different sample rates',()=>{
 for(const sampleRate of [44100,48000,96000])for(const [index,hz]of [90,3000,10000].entries()){
   const f=new AudioFeatures(),freq=new Float32Array(4096).fill(-140),wave=new Float32Array(8192);
   f.update(freq,wave,sampleRate,8192,.016,0);
   freq[Math.round(hz*8192/sampleRate)]=-10;
   f.update(freq,wave,sampleRate,8192,.016,1);
   assert.ok(f.accents[index]>.1,`${hz} Hz at ${sampleRate}`);
   assert.ok([...f.accents].every((v,i)=>i===index||v===0));
   const peak=f.accents[index];
   for(let i=0;i<90;i++)f.update(freq,wave,sampleRate,8192,1/60,1+(i+1)/60);
   assert.ok(f.accents[index]<peak*.02,'a held note decays rather than retriggering');
   f.update(freq,wave,sampleRate,8192,.016,3,false);assert.ok(f.accents[index]<peak*.02);
 }
});

test('accents release smoothly on pause and a later isolated beat retriggers',()=>{
 const f=new AudioFeatures(),freq=new Float32Array(4096).fill(-30),wave=new Float32Array(8192).fill(.1);
 f.update(freq,wave,48000,8192,.016,1);assert.ok(f.accents.every(v=>v>0));
 const initial=[...f.accents];f.update(freq,wave,48000,8192,.05,1.05,false);
 assert.ok(f.accents.every((v,i)=>v<initial[i]&&v>0));
 for(let i=0;i<100;i++)f.update(freq,wave,48000,8192,.05,1.1+i*.05,false);
 assert.ok(f.accents.every(v=>v<.0001));
 f.update(freq,wave,48000,8192,.016,7);assert.ok(f.accents.every(v=>v>.1));
});
