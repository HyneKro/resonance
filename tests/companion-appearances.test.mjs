import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {COMPANION_APPEARANCES,companionAppearance,appearanceCell} from '../public/companion-appearances.js';
import {DanceMotion} from '../public/companion-motion.js';
import {preferencesWithDefaults} from '../public/default-preferences.js';
import {startServer} from '../server.mjs';

test('all selectable appearances have identical bundled PC/Android artwork and safe saved IDs',async()=>{
 assert.equal(COMPANION_APPEARANCES.length,30);assert.equal(new Set(COMPANION_APPEARANCES.map(a=>a.id)).size,30);
 assert.equal(preferencesWithDefaults().companionAppearance,'sona');
 for(const value of [null,'../../config.json','https://example.com/a.webp','shrek',{},3])assert.equal(companionAppearance(value),'sona');
 for(const a of COMPANION_APPEARANCES){assert.equal(preferencesWithDefaults({companionAppearance:a.id}).companionAppearance,a.id);const pc=await fs.readFile('public'+a.src),android=await fs.readFile('android/shared'+a.src);assert.deepEqual(pc,android,a.id);assert.ok(pc.length>1000);}
 for(let row=0;row<13;row++)for(let frame=0;frame<8;frame++)assert.ok(appearanceCell(row,frame)>=0&&appearanceCell(row,frame)<24);
});

test('guest loops visit all eight poses three times, keep fixed pace, and respond to interactions',()=>{
 for(const a of COMPANION_APPEARANCES.filter(a=>a.id!=='sona')){
  const motion=new DanceMotion();motion.setAppearance(a.id);let previous,cycles=[],sequence=[];
  for(let i=0;i<Math.ceil((a.grooveSeconds+a.danceSeconds)*3*120)+3;i++){
   const s=motion.update(1/120,{active:true,bpm:i%2?180:60,energy:i%2});const key=s.row+':'+s.frame;
   if(key!==previous){sequence.push(key);previous=key;}
  }
  const expected=[...Array(3)].flatMap(()=>Array.from({length:8},(_,i)=>'0:'+i)).concat([...Array(3)].flatMap(()=>Array.from({length:8},(_,i)=>'1:'+i)));
  assert.deepEqual(sequence.slice(0,48),expected,a.id+' complete loops');assert.equal(motion.bpm,100);
  motion.pickUp();assert.equal(motion.update(.05,{active:true}).state,'pickup');for(let i=0;i<12;i++)motion.update(.05,{active:true});assert.equal(motion.state,'held');
  motion.drop();assert.equal(motion.update(.01,{active:true}).state,'drop');for(let i=0;i<24;i++)motion.update(.05,{active:true});assert.ok(['listening','dancing'].includes(motion.state));
  for(let i=0;i<400;i++)motion.update(.1,{active:false});assert.equal(motion.state,'sleep');
  motion.click();assert.equal(motion.update(.01,{}).state,'clicked');
 }
});

test('appearance survives restart and invalid API updates preserve the chosen mascot',async()=>{
 await fs.mkdir('test-output/release-work',{recursive:true});
 const dataDir=await fs.mkdtemp(path.resolve('test-output/release-work/mascot-api-'));let service=await startServer({port:0,dataDir,autoScan:false});
 const close=async()=>{service.server.closeAllConnections();await new Promise(r=>service.server.close(r));service.lib.close();};
 const patch=async preferences=>(await(await fetch(service.url+'/api/config',{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':service.token},body:JSON.stringify({preferences})})).json()).preferences;
 try{
  assert.equal((await patch({companionAppearance:'miku'})).companionAppearance,'miku');assert.equal((await patch({companionAppearance:'../../elsewhere'})).companionAppearance,'miku');
  await close();service=await startServer({port:0,dataDir,autoScan:false});const library=await(await fetch(service.url+'/api/library')).json();assert.equal(library.config.preferences.companionAppearance,'miku');
  assert.equal((await patch({companionAppearance:'sona'})).companionAppearance,'sona');
 }finally{await close();}
});
