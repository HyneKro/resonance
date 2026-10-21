import test from 'node:test';
import assert from 'node:assert/strict';
import {ContourMotion} from '../public/contour-motion.js';

test('Contour emits on rising audible accents, not silence or a sustained loud note',()=>{
 const ink=new ContourMotion();ink.update(0);
 for(let i=1;i<=120;i++)ink.update(i/60,{onset:1,drums:1,energy:0});
 assert.equal(ink.emitted,0);
 for(let i=121;i<=150;i++)ink.update(i/60,{energy:.2});
 ink.update(151/60,{onset:.9,energy:.7});assert.equal(ink.emitted,1);
 for(let i=152;i<=300;i++)ink.update(i/60,{onset:.9,energy:.7});
 assert.equal(ink.emitted,1);
 for(let i=301;i<=330;i++)ink.update(i/60,{energy:.2});
 ink.update(331/60,{drums:.9,energy:.7});assert.equal(ink.emitted,2);
});

test('pause, reduced motion, seeks and inactive intervals do not paint or fast-forward',()=>{
 const ink=new ContourMotion();ink.update(0);ink.update(.02,{onset:.9,energy:.8});
 const snapshot=()=>({time:ink.time,events:[...ink.events],emitted:ink.emitted}),before=snapshot();
 for(let i=0;i<100;i++)ink.update(.02,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(.04,{onset:1,energy:1,reduced:true});assert.deepEqual(snapshot(),before);
 ink.update(120,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(3,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.suspend();ink.update(900,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(900.02,{onset:1,energy:1});assert.ok(ink.time-before.time<.021);assert.equal(ink.emitted,1);
});

test('the brush timeline and bounded accent pool are independent of frame rate',()=>{
 const results=[];
 for(const fps of [30,60,120]){
  const ink=new ContourMotion();ink.update(0);
  for(let i=1;i<=fps*120;i++)ink.update(i/fps,{onset:i%fps<fps/8?.85:0,energy:.7});
  assert.ok(Math.abs(ink.time-124.8)<1e-8);assert.equal(ink.events.length,32);
  assert.ok(ink.events.every(Number.isFinite));assert.ok(ink.next>=0&&ink.next<8);
  results.push(ink.emitted);
 }
 assert.deepEqual(results,[121,121,121]);
});

test('a new track clears drying marks and starts a composed sheet',()=>{
 const ink=new ContourMotion();ink.update(0);ink.update(.02,{onset:1,energy:1});
 assert.equal(ink.emitted,1);ink.reset();assert.ok(ink.events.every(x=>x===0));
 assert.equal(ink.emitted,0);assert.equal(ink.clock,null);assert.equal(ink.time,4.8);
});
