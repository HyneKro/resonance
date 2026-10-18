import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {COMPANION_APPEARANCES} from '../public/companion-appearances.js';
import {DanceMotion,SONA_ROUTINES,clipDurations} from '../public/companion-motion.js';
import {appearanceCell} from '../public/companion-appearances.js';
import {GUEST_CHOREOGRAPHY} from '../public/companion-choreography.js';
import {COMPANION_FRAMING} from '../public/companion-framing.js';

test('every bundled character has bounded registration and every scheduled pose fits its atlas',()=>{
 for(const a of COMPANION_APPEARANCES){
  const m=new DanceMotion();m.setAppearance(a.id);
  assert.equal(COMPANION_FRAMING[a.id].length,13);
  for(const row of COMPANION_FRAMING[a.id])for(const x of row)assert.ok(Number.isFinite(x)&&Math.abs(x)<=36);
  if(a.id!=='sona')assert.ok(GUEST_CHOREOGRAPHY[a.id]);
  for(const name of SONA_ROUTINES){
   const clip=m.clips[name],times=clipDurations(clip,100);
   assert.ok(Math.abs(times.reduce((a,b)=>a+b,0)-clip.beats*.6)<1e-8);
   for(const f of clip.frames||[0,1,2,3,4,5,6,7])assert.ok(Number.isInteger(f)&&f>=0&&f<(a.id==='sona'?8:12));
   for(const time of times)assert.ok(time>=1/12);
  }
 }
});

test('guests stay suspended while held and start landing from that same drawing',()=>{
 for(const a of COMPANION_APPEARANCES.filter(a=>a.id!=='sona')){
  const m=new DanceMotion();m.setAppearance(a.id);m.pickUp();let f;
  for(let i=0;i<180;i++){f=m.update(1/24);if(i>10){assert.equal(f.state,'held');assert.equal(f.row,10);assert.equal(appearanceCell(f.row,f.frame),110);}}
  assert.equal(appearanceCell(10,m.update(0,{reduced:true}).frame),110);
  m.drop();const landing=m.update(0);assert.equal(appearanceCell(landing.row,landing.frame),110);
  for(let i=0;i<24;i++)f=m.update(1/24,{active:true});assert.equal(f.name,'two-step');
 }
});

test('all appearances use Sona timing, accents, interaction states and three-cycle boundaries',()=>{
 const reference=new DanceMotion();reference.setAppearance('sona');
 for(const appearance of COMPANION_APPEARANCES.filter(a=>a.id!=='sona')){
  const m=new DanceMotion();m.setAppearance(appearance.id);
  for(const name of SONA_ROUTINES){assert.equal(m.clips[name].beats,reference.clips[name].beats);assert.deepEqual(clipDurations(m.clips[name],100),clipDurations(reference.clips[name],100));}
  const sona=new DanceMotion();sona.setAppearance('sona');
  for(let i=0;i<24*90;i++){
   if(i===300){sona.click();m.click();}if(i===600){sona.pickUp();m.pickUp();}if(i===650){sona.drop();m.drop();}
   const options={active:i<1500};const a=sona.update(1/24,options),b=m.update(1/24,options);
   assert.equal(b.state,a.state);assert.equal(b.name,a.name);assert.equal(b.row,a.row);assert.deepEqual(b.pose,a.pose);
  }
 }
});

test('guest waves keep the same raised arm; pickup and landing never flash to standing',()=>{
 for(const appearance of COMPANION_APPEARANCES.filter(a=>a.id!=='sona')){
  const m=new DanceMotion();m.setAppearance(appearance.id);
  if(appearance.id==='creeper')assert.equal(m.clips['hand-wave'].frames[0],0,'armless Creeper uses a head sway');
  else assert.ok(!m.clips['hand-wave'].frames.includes(0),appearance.id+' wave never inserts neutral');
  const blink=[0,1,2,3,4,5,6,7].map(f=>appearanceCell(12,f));
  assert.deepEqual(blink,[96,96,97,98,98,99,96,96]);
  for(const f of [3,4,5,6,7])assert.equal(appearanceCell(10,f),110);
  assert.equal(appearanceCell(11,0),110);assert.equal(appearanceCell(11,7),96);
 }
});

test('PC, Android and floating desktop use the same cleaned animation modules',async()=>{
 for(const file of ['companion-motion.js','companion-choreography.js','companion-framing.js','companion-renderer.js','companion-appearances.js'])assert.deepEqual(await fs.readFile('public/'+file),await fs.readFile('android/shared/'+file),file);
 const overlay=await fs.readFile('public/sona-overlay.js','utf8');assert.ok(overlay.includes("from './companion-motion.js'"));assert.ok(overlay.includes("from './companion-renderer.js'"));
});
