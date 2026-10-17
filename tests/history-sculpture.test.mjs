import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousQueue} from '../public/queue.js';
import {VisualConductor} from '../public/visual-conductor.js';
import {birthDistribution} from '../public/particle-spectrum.js';
import {startServer} from '../server.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const tracks=Array.from({length:12},(_,i)=>({id:String(i),title:String(i),available:true}));
test('history records actual playback, not skipped queue entries; pausing does not duplicate a play',()=>{
 const q=new ContinuousQueue(()=>tracks);q.start('0',tracks.map(t=>t.id));
 assert.equal(q.recordPlayed('0','first',100),true);assert.equal(q.recordPlayed('0','first',200),false);
 q.select('5',5);q.recordPlayed('5','second',300);assert.deepEqual(q.history.map(e=>e.id),['0','5']);
 const future=q.items.slice(q.cursor+1);const at=q.replay('0');q.select('0',at);q.recordPlayed('0','third',400);
 assert.deepEqual(q.items.slice(q.cursor+1),future);assert.deepEqual(q.history.map(e=>e.id),['0','5','0']);
 q.start('8',['8','9']);assert.equal(q.history.length,3,'changing playlists preserves history');
 const saved={id:'8',...q.snapshot()},restored=new ContinuousQueue(()=>tracks);restored.restore(saved);assert.deepEqual(restored.history,q.history);
 saved.history[0].id='changed';assert.equal(q.history[0].id,'0','snapshot is independent');
 for(let i=0;i<220;i++)q.recordPlayed('0','repeat'+i,1000+i);assert.equal(q.history.length,200);
 assert.equal(q.recordPlayed('missing','fail'),false);
});
test('frequency births select only audible windows and weight stronger partials; silence stays neutral',()=>{
 const spectrum=new Float32Array(48);spectrum[11]=.9;const one=birthDistribution(spectrum);
 assert.ok(one.total>0);assert.equal(one.cdf[10],0);assert.equal(one.cdf[11],1);assert.equal(one.cdf[47],1);
 spectrum[31]=.45;const two=birthDistribution(spectrum);assert.ok(two.cdf[11]>.8&&two.cdf[11]<.9);assert.equal(two.cdf[30],two.cdf[11]);assert.equal(two.cdf[31],1);
 spectrum.fill(.04);const quiet=birthDistribution(spectrum);assert.equal(quiet.total,0);assert.ok(quiet.cdf.every(x=>x===0));
});
test('older libraries recover known listening timestamps without presenting skipped queue items as played',()=>{
 const source=tracks.map((t,i)=>({...t,lastPlayed:i===1?200:i===3?100:0})),q=new ContinuousQueue(()=>source);
 q.restore({id:'8',queue:tracks.map(t=>t.id),queueIndex:8});
 assert.deepEqual(q.history.map(e=>e.id),['3','1']);assert.ok(q.history.every(e=>e.session.startsWith('earlier-')));
 const empty=new ContinuousQueue(()=>source);empty.restore({id:'8',queue:['8'],history:[]});assert.equal(empty.history.length,0,'saved empty history is respected');
});
test('responsiveness changes attack and release while preserving inertia and physical input',()=>{
 const slow=new VisualConductor(),fast=new VisualConductor();const silent={db:-100,bands:new Float32Array(8),accents:new Float32Array(3),spectrum:new Float32Array(48)};
 const live={db:-24,bands:new Float32Array(8).fill(.7),accents:new Float32Array(3),spectrum:new Float32Array(48).fill(.8)};
 for(let i=0;i<180;i++){slow.update(silent,1/60,{responsiveness:.25});fast.update(silent,1/60,{responsiveness:2.5});}
 // Compare the initial 50 ms attack; the new detector is already settled by 167 ms.
 let previous=[...fast.morph];for(let i=0;i<3;i++){slow.update(live,1/60,{responsiveness:.25});fast.update(live,1/60,{responsiveness:2.5});fast.morph.forEach((x,j)=>assert.ok(Math.abs(x-previous[j])<.03));previous=[...fast.morph];}
 assert.ok(fast.spectrum[10]>slow.spectrum[10]*2);assert.ok(fast.energy>slow.energy*2);
 for(let i=0;i<600;i++){slow.update(live,1/60,{responsiveness:.25});fast.update(live,1/60,{responsiveness:2.5});}
 for(let i=0;i<20;i++){slow.update(silent,1/60,{responsiveness:.25});fast.update(silent,1/60,{responsiveness:2.5});}
 assert.ok(fast.spectrum[10]<slow.spectrum[10]*.1);assert.equal(live.db,-24);assert.ok(live.bands.every(x=>Math.abs(x-.7)<.00001));
});
test('history and visual preferences survive API persistence with validation and no extra fields',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/history-'));const app=await startServer({port:0,dataDir:dir,autoScan:false});
 const post=async(route,body)=>{const r=await fetch(app.url+route,{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
 try{
  app.lib.tracks.set('t',{id:'t',available:true});
  await post('/api/player',{id:'t',queue:['t'],history:[{id:'t',session:'one',at:123,extra:'discard'},{id:'missing',session:'two',at:124},{id:'t',session:8,at:125}]});
  assert.deepEqual(app.lib.getSetting('player').history,[{id:'t',session:'one',at:123}]);
  await post('/api/config',{preferences:{responsiveness:9,particleColor:'birth'}});assert.equal(app.lib.config.preferences.responsiveness,8);
  await post('/api/config',{preferences:{responsiveness:-1,particleColor:'invalid'}});assert.equal(app.lib.config.preferences.responsiveness,.25);assert.equal(app.lib.config.preferences.particleColor,'birth');
  for(const asset of ['view-state.js','particle-spectrum.js'])assert.equal((await fetch(app.url+'/'+asset)).status,200);
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
