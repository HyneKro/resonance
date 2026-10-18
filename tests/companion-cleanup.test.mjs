import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {COMPANION_APPEARANCES} from '../public/companion-appearances.js';
import {DanceMotion,SONA_ROUTINES,clipDurations} from '../public/companion-motion.js';
import {GUEST_CHOREOGRAPHY} from '../public/companion-choreography.js';
import {COMPANION_FRAMING} from '../public/companion-framing.js';

test('every bundled character has bounded registration and every scheduled pose fits its atlas',()=>{
 for(const a of COMPANION_APPEARANCES){
  const m=new DanceMotion();m.setAppearance(a.id);
  assert.equal(COMPANION_FRAMING[a.id].length,13);
  for(const row of COMPANION_FRAMING[a.id])for(const x of row)assert.ok(Number.isFinite(x)&&Math.abs(x)<=7);
  if(a.id!=='sona')assert.ok(GUEST_CHOREOGRAPHY[a.id]);
  for(const name of SONA_ROUTINES){
   const clip=m.clips[name],times=clipDurations(clip,100);
   assert.ok(Math.abs(times.reduce((a,b)=>a+b,0)-clip.beats*.6)<1e-8);
   for(const f of clip.frames||[0,1,2,3,4,5,6,7])assert.ok(Number.isInteger(f)&&f>=0&&f<(a.id==='sona'?8:12));
   if(a.id!=='sona')for(const time of times){assert.ok(time>=1/12);assert.ok(Math.abs(time*24-Math.round(time*24))<1e-8);}
  }
 }
});

test('guests stay suspended while held and start landing from that same drawing',()=>{
 for(const a of COMPANION_APPEARANCES.filter(a=>a.id!=='sona')){
  const m=new DanceMotion();m.setAppearance(a.id);m.pickUp();let f;
  for(let i=0;i<180;i++){f=m.update(1/24);if(i>9){assert.equal(f.state,'held');assert.equal(f.row,10);assert.equal(f.frame,2);}}
  assert.equal(m.update(0,{reduced:true}).frame,2);
  m.drop();const landing=m.update(0);assert.equal(landing.row,10);assert.equal(landing.frame,2);
  for(let i=0;i<24;i++)f=m.update(1/24,{active:true});assert.equal(f.name,'two-step');
 }
});

test('guest idle blinks close once briefly; greetings return through their approach',()=>{
 const m=new DanceMotion();m.setAppearance('miku');let closed=0,previous=-1,sequence=[];
 for(let i=0;i<120;i++){const f=m.update(1/24);if(f.frame!==previous){sequence.push(f.frame);previous=f.frame;}if(f.frame===4)closed++;}
 assert.deepEqual(sequence,[0,3,4,3,0]);assert.equal(closed,2);
 m.click();sequence=[];previous=-1;
 for(let i=0;i<24;i++){const f=m.update(i?1/24:0);if(f.state!=='clicked')break;if(f.frame!==previous){sequence.push(f.frame);previous=f.frame;}}
 assert.deepEqual(sequence,[0,1,2,1,0]);
});

test('PC, Android and floating desktop use the same cleaned animation modules',async()=>{
 for(const file of ['companion-motion.js','companion-choreography.js','companion-framing.js','companion-renderer.js','companion-appearances.js'])assert.deepEqual(await fs.readFile('public/'+file),await fs.readFile('android/shared/'+file),file);
 const overlay=await fs.readFile('public/sona-overlay.js','utf8');assert.ok(overlay.includes("from './companion-motion.js'"));assert.ok(overlay.includes("from './companion-renderer.js'"));
});
