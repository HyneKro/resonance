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

test('ink color follows the track gradually, stays stable when held, and survives track changes',()=>{
 const ink=new ContourMotion(),colors=[[.02,.6,.9],[.3,.2,.1],[.04,.5,.8]],spectrum=new Float32Array(48).fill(.6);
 ink.update(0);const initial=[...ink.accent];ink.update(1/60,{colors,spectrum,energy:1});
 assert.ok(ink.accent[0]<initial[0]&&ink.accent[2]>initial[2]);assert.ok(Math.abs(ink.accent[0]-initial[0])<.015);
 for(let i=2;i<=300;i++)ink.update(i/60,{colors,spectrum,energy:1});
 assert.ok(ink.accent[2]>ink.accent[0]*2);
 const tint=[...ink.accent];ink.update(5,{colors:colors.map(()=>[1,0,0]),energy:1});assert.deepEqual([...ink.accent],tint);
 ink.update(200,{colors,energy:1});assert.deepEqual([...ink.accent],tint);
 ink.reset();assert.deepEqual([...ink.accent],tint);
 ink.update(0);ink.update(.02,{colors,energy:1,reduced:true});assert.deepEqual([...ink.accent],tint);
});

test('the accent responds to spectral balance and smooths independently of frame rate',()=>{
 const colors=[[1,.03,.02],[.7,.3,.1],[.03,.3,1]],results=[];
 for(const fps of [30,60,120]){
  const ink=new ContourMotion(),spectrum=new Float32Array(48);spectrum[42]=1;ink.update(0);
  for(let i=1;i<=fps*3;i++)ink.update(i/fps,{colors,spectrum,energy:1});results.push([...ink.accent]);
 }
 for(const row of results)for(let c=0;c<3;c++)assert.ok(Math.abs(row[c]-results[0][c])<1e-5);
 const low=new ContourMotion(),spectrum=new Float32Array(48);spectrum[3]=1;low.update(0);
 for(let i=1;i<=180;i++)low.update(i/60,{colors,spectrum,energy:1});
 assert.ok(low.accent[0]>results[0][0]+.4);assert.ok(results[0][2]>low.accent[2]+.4);
});
