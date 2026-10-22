import test from 'node:test';
import assert from 'node:assert/strict';
import {ContourMotion,CONTOUR_RAIN_COUNT,CONTOUR_DROP_LIFE} from '../public/contour-motion.js';

const run=(ink,seconds,options={},fps=60)=>{ink.update(0);for(let i=1;i<=seconds*fps;i++)ink.update(i/fps,typeof options==='function'?options(i/fps):options);return ink;};

test('ink rain follows audible energy and accents, with no droplets born in silence',()=>{
 const quiet=run(new ContourMotion(),12,{energy:0,onset:1,drums:1});assert.equal(quiet.emitted,0);
 const low=run(new ContourMotion(),12,{energy:.12}),high=run(new ContourMotion(),12,{energy:.85,bass:.7});
 const beat=run(new ContourMotion(),12,t=>({energy:.85,bass:.7,onset:t%1<.1?1:0}));
 assert.ok(low.emitted>=10&&low.emitted<22);assert.ok(high.emitted>low.emitted*3);assert.ok(beat.emitted>high.emitted);
 const strength=m=>Array.from({length:CONTOUR_RAIN_COUNT},(_,i)=>m.drops[i*4+3]).filter(Boolean).reduce((a,b)=>a+b,0)/Math.min(CONTOUR_RAIN_COUNT,m.emitted);
 assert.ok(strength(high)>strength(low)*1.7,'louder bass creates larger impacts');
 const before=beat.emitted;for(let i=721;i<=900;i++)beat.update(i/60,{energy:0,onset:1});assert.equal(beat.emitted,before);
});

test('pause, reduced motion, seeks and inactive intervals do not paint or fast-forward',()=>{
 const ink=new ContourMotion();ink.update(0);ink.update(.02,{onset:.9,energy:.8});
 const snapshot=()=>({time:ink.time,drops:[...ink.drops],emitted:ink.emitted}),before=snapshot();
 for(let i=0;i<100;i++)ink.update(.02,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(.04,{onset:1,energy:1,reduced:true});assert.deepEqual(snapshot(),before);
 ink.update(120,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(3,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.suspend();ink.update(900,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(900.02,{energy:0});assert.ok(ink.time-before.time<.021);assert.equal(ink.emitted,before.emitted);
});

test('bounded rain never overwrites a visible mark and distributes impacts across the sheet',()=>{
 const ink=new ContourMotion();ink.update(0);let changed=0;const ranges=[1,-1,1,-1];
 for(let i=1;i<=3600;i++){
  const before=ink.drops.slice();ink.update(i/60,{energy:1,bass:1,texture:1,onset:i%18<3?1:0});
  assert.equal(ink.drops.length,CONTOUR_RAIN_COUNT*4);assert.ok(ink.drops.every(Number.isFinite));
  for(let k=0;k<CONTOUR_RAIN_COUNT;k++){
   const at=k*4;if(before[at+2]===ink.drops[at+2])continue;changed++;
   if(before[at+3])assert.ok(ink.time-before[at+2]>=CONTOUR_DROP_LIFE,'no still-wet stain is teleported');
   ranges[0]=Math.min(ranges[0],ink.drops[at]);ranges[1]=Math.max(ranges[1],ink.drops[at]);ranges[2]=Math.min(ranges[2],ink.drops[at+1]);ranges[3]=Math.max(ranges[3],ink.drops[at+1]);
  }
 }
 assert.ok(changed>500);assert.ok(ranges[1]-ranges[0]>1.7&&ranges[3]-ranges[2]>1.25);
});

test('rain density and placement remain consistent across frame rates; a new track starts a clean sheet',()=>{
 const results=[30,60,120].map(fps=>run(new ContourMotion(),20,{energy:.7,bass:.5},fps));
 assert.ok(Math.max(...results.map(m=>m.emitted))-Math.min(...results.map(m=>m.emitted))<=1);
 for(const ink of results){assert.ok(Math.abs(ink.time-20)<1e-8);ink.reset();assert.ok(ink.drops.every(x=>x===0));assert.equal(ink.emitted,0);assert.equal(ink.clock,null);assert.equal(ink.time,0);}
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
