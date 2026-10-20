import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {AudioResearch} from '../audio-research.mjs';
import {ListeningEnhancements} from '../public/listening-enhancements.js';
import {levelingDb} from '../public/song-analysis.js';
const profile={version:1,integratedLufs:-8,truePeakDb:0};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400&&!fn();i++)await delay(5);assert.ok(fn(),'expected analysis progress');}
test('leveling prepares the whole library, prioritizes a selected song, and persists/reuses all results',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/level-library-')),values=new Map(),tracks=new Map();
 for(const id of ['background','selected','bad','last']){const file=path.join(dir,id);await fs.writeFile(file,id);tracks.set(id,{id,path:file,size:id.length,duration:20,available:true});}
 const lib={tracks,root:dir,getSetting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v)},calls=[];let started=false;
 const research=new AudioResearch(lib,{decode:async(file,{signal})=>{const id=path.basename(file);calls.push(id);if(id==='background'&&!started){started=true;await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('interrupted')),{once:true}));}if(id==='bad')throw Error('Not decodable');return profile;}});
 research.setLeveling(true);await until(()=>started);research.request('selected',false,true);await until(()=>!research.running);
 assert.deepEqual(calls,['background','selected','background','bad','last']);assert.equal(research.status('background').error,'');assert.deepEqual(research.coverage(),{total:4,ready:3,failed:1,enabled:true,running:false,progress:0});
 const next=new AudioResearch(lib,{decode:async()=>{throw Error('cached files must not decode again');}});next.setLeveling(true);await until(()=>!next.running);assert.equal(next.coverage().ready,3);research.stop();next.stop();
});
function fixture(){let response={profile:null,job:{running:true,id:'a',progress:.2}},finish;const gains=[],notifications=[],events={};const audio={paused:true,addEventListener:(name,fn)=>events[name]=fn},reactor={setPlaybackGain:(db,options)=>gains.push([db,options]),setTransitionGain(){}};
 const c=new ListeningEnhancements({audio,reactor,api:async()=>response,getTrack:()=>c.track,getPreferences:()=>({leveling:true,autoDirection:false}),next(){},onPreparation:p=>notifications.push(p),wait:()=>new Promise(r=>finish=r)});
 return {c,gains,notifications,events,set:r=>response=r,advance:()=>finish?.()};
}
test('a first listen waits for its full-song measurement and starts at the final fixed gain',async()=>{
 const f=fixture();await f.c.select({id:'a',title:'Song A'});const pending=f.c.prepare();await until(()=>f.notifications.some(x=>x?.progress===.2));f.set({profile});f.advance();await pending;assert.equal(f.c.level.db,-8);assert.deepEqual(f.gains.at(-1),[-8,{immediate:true}]);assert.equal(f.notifications.at(-1),null);f.c.cancelPreparation();
});
test('cancelling a preparation cannot later apply its result or resume a different selection',async()=>{
 const f=fixture();await f.c.select({id:'a'});const pending=f.c.prepare();await until(()=>f.c.preparing);f.c.cancelPreparation();f.set({profile});f.advance();await pending;assert.equal(f.c.level.db,0);assert.equal(f.notifications.at(-1),null);
});
test('original-level bypass is explicit, and a late cached result never changes an already-started song',async()=>{
 const f=fixture();await f.c.select({id:'a'});const pending=f.c.prepare();await until(()=>f.notifications.some(Boolean));f.set({profile});f.c.playOriginal();f.advance();await pending;assert.equal(f.c.level.db,0);f.events.playing();await f.c.load(false);await f.c.prepare();assert.equal(f.c.level.db,0);f.c.cancelPreparation();
});
test('failed measurement stays visibly paused until an explicit original-level choice',async()=>{
 const f=fixture();f.set({profile:null,error:'Unreadable',job:{running:false}});await f.c.select({id:'a'});const pending=f.c.prepare();await until(()=>f.notifications.some(p=>p?.error));assert.equal(await pending,false);assert.equal(f.c.preparing,false);f.c.playOriginal();assert.equal(await f.c.prepare(),true);assert.equal(f.c.level.db,0);assert.equal(f.c.preparing,false);f.c.cancelPreparation();
});
test('quiet masters can reach the target beyond the old 6dB boost cap without exceeding measured peak headroom',()=>{
 for(const p of [{integratedLufs:-8,truePeakDb:0},{integratedLufs:-30,truePeakDb:-18},{integratedLufs:-39,truePeakDb:-26}]){const db=levelingDb(p,true);assert.equal(p.integratedLufs+db,-16);assert.ok(p.truePeakDb+db<=-1);}
 const dynamic={integratedLufs:-25,truePeakDb:-2};assert.equal(levelingDb(dynamic,true),1);
});
