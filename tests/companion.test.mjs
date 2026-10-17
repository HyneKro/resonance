import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {companionPosition,companionBounds,companionPoint,companionPlacement,tintCompanionPixels} from '../public/companion-model.js';
import {startServer} from '../server.mjs';
import {SONA_SHEETS} from '../public/companion-atlas.js';

test('companion placement validates input and stays reachable across fullscreen and small windows',()=>{
 assert.equal(companionPosition({x:'1',y:0}),null);assert.equal(companionPosition({x:NaN,y:Infinity}),null);assert.deepEqual(companionPosition({x:-2,y:8}),{x:0,y:1});
 for(const [w,h,size]of [[2560,1440,104],[1280,720,104],[640,400,84],[250,180,84]]){
  const bounds=companionBounds(w,h,size);
  for(const position of [null,{x:0,y:0},{x:1,y:1},{x:.23,y:.67}]){
   const p=companionPoint(position,bounds);assert.ok(p.x>=0&&p.x+size<=w);assert.ok(p.y>=0&&p.y+size<=h);
   if(bounds.bottom>bounds.top)assert.deepEqual(companionPlacement(p,bounds),position||{x:.99,y:.98});
  }
  assert.deepEqual(companionPlacement({x:-500,y:5000},bounds),{x:0,y:1});
 }
});
test('companion position saves locally across restart, ignores malformed updates, and resets to its home',async()=>{
 const dataDir=await fs.mkdtemp(path.resolve('test-output/companion-api-'));let app=await startServer({port:0,dataDir,autoScan:false});
 const close=async()=>{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.lib.close();};
 const patch=async preferences=>(await (await fetch(app.url+'/api/config',{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify({preferences})})).json()).preferences;
 try{
  for(const asset of ['/companion-model.js','/companion-renderer.js','/companion-atlas.js',...SONA_SHEETS.map(s=>s.src)])assert.equal((await fetch(app.url+asset)).status,200);
  const p=await patch({dancePosition:{x:.23,y:.67}});assert.deepEqual(p.dancePosition,{x:.23,y:.67});assert.equal(p.danceCompanion,false);
  assert.deepEqual((await patch({dancePosition:{x:'bad',y:0}})).dancePosition,p.dancePosition);
  await close();app=await startServer({port:0,dataDir,autoScan:false});const library=await (await fetch(app.url+'/api/library')).json();assert.deepEqual(library.config.preferences.dancePosition,p.dancePosition);
  assert.equal((await patch({dancePosition:null})).dancePosition,null);
 }finally{await close();}
});

test('sprite theme gradients preserve alpha, warm skin and the original brightness',()=>{
 const pixels=new Uint8ClampedArray([255,211,184,255,160,130,210,240,160,130,210,128,0,0,0,0]);
 const out=tintCompanionPixels(pixels,1,4,[[255,130,100],[100,210,255]]);assert.deepEqual([...out.slice(0,4)],[...pixels.slice(0,4)]);
 for(let i=3;i<pixels.length;i+=4)assert.equal(out[i],pixels[i]);assert.notDeepEqual([...out.slice(4,7)],[...pixels.slice(4,7)]);assert.notDeepEqual([...out.slice(4,7)],[...out.slice(8,11)]);
 assert.deepEqual([...pixels.slice(4,8)],[160,130,210,240],'source artwork remains unchanged');
});
