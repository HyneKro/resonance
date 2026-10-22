import test from 'node:test';
import assert from 'node:assert/strict';
import {ContourMotion,contourAnchor,CONTOUR_RAIN_COUNT,CONTOUR_DROP_LIFE,CONTOUR_MEMORY_COUNT,CONTOUR_MEMORY_LIFE,CONTOUR_CURRENT_WIDTH} from '../public/contour-motion.js';

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
 const snapshot=()=>({time:ink.time,data:[...ink.data],currents:[...ink.currentData],phase:ink.flowPhase,material:[...ink.material],emitted:ink.emitted}),before=snapshot();
 for(let i=0;i<100;i++)ink.update(.02,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(.04,{onset:1,energy:1,reduced:true});assert.deepEqual(snapshot(),before);
 ink.update(120,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(3,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.suspend();ink.update(900,{onset:1,energy:1});assert.deepEqual(snapshot(),before);
 ink.update(900.02,{energy:0});assert.ok(ink.time-before.time<.021);assert.equal(ink.emitted,before.emitted);
});

test('currents bind landed pools to the brush in landscape and portrait, retaining pigment',()=>{
 for(const ratio of [1.6,.55]){
  const ink=new ContourMotion();ink.update(0);const anchor=contourAnchor(.4,ratio);
  ink.drops.set([anchor[0]+.15/ratio,anchor[1],0,.8]);ink.details.set([.03,.5,1,.37]);ink.tints.set([.1,.3,.8,1]);
  for(let i=1;i<=50;i++)ink.update(i/60,{energy:.5,ratio});
  assert.equal(ink.bound[0],1);assert.ok(ink.currents>=1);
  const row=CONTOUR_CURRENT_WIDTH*4,at=Array.from({length:32},(_,i)=>i*4).find(i=>Math.abs(ink.currentData[i]-ink.drops[0])<1e-6);
  assert.notEqual(at,undefined);const p=contourAnchor(ink.currentData[row+at],ratio);
  assert.ok(Math.hypot((p[0]-ink.currentData[at])*ratio,p[1]-ink.currentData[at+1])<.55);
  assert.deepEqual([...ink.currentData.subarray(row*2+at,row*2+at+4)],[...ink.tints.subarray(0,4)]);
  const pigment=ink.currentData.slice(row*2+at,row*2+at+4);
  for(let i=51;i<=180;i++)ink.update(i/60,{energy:0,ratio,colors:[[1,0,0],[1,0,0],[1,0,0]]});
  assert.deepEqual(ink.currentData.slice(row*2+at,row*2+at+4),pigment);
 }
});

test('branching blooms require distinct strong accents and never replace visible currents',()=>{
 const ink=new ContourMotion();ink.update(0);let changes=0;
 for(let i=1;i<=3600;i++){
  const before=ink.currentData.slice();ink.update(i/60,{energy:.9,bass:.7,onset:i%30<3?1:0});
  for(let slot=0;slot<40;slot++){const a=slot*4;if(before[a+2]!==ink.currentData[a+2]){changes++;if(before[a+3])assert.ok(ink.time-before[a+2]>=(slot<32?9:15));}}
 }
 assert.ok(ink.currents>30&&ink.blooms>8&&ink.blooms<22);assert.ok(changes>50);
 assert.equal(ink.currentData.length,40*4*4);assert.ok(ink.currentData.every(Number.isFinite));
 const count=[ink.currents,ink.blooms];for(let i=3601;i<=4200;i++)ink.update(i/60,{energy:0,onset:1});assert.deepEqual([ink.currents,ink.blooms],count);
 ink.reset();assert.ok(ink.currentData.every(v=>v===0));assert.equal(ink.flowPhase,0);
});

test('ink transport accelerates with bass and advances consistently across frame rates',()=>{
 const quiet=run(new ContourMotion(),6,{energy:.1,bass:0}),heavy=run(new ContourMotion(),6,{energy:.9,bass:.9});
 assert.ok(heavy.flowPhase>quiet.flowPhase*3);
 const phases=[30,60,120].map(fps=>run(new ContourMotion(),10,{energy:.8,bass:.7},fps).flowPhase);
 assert.ok(Math.max(...phases)-Math.min(...phases)<.015);
});

test('track changes keep the entire painting and held pose, then ease into the new spectrum',()=>{
 const ink=new ContourMotion();ink.selectTrack('first');run(ink,8,{energy:.8,bass:.7,lead:.6,onset:.9,spectrum:new Float32Array(48).fill(.8),lights:new Float32Array(48).fill(.7)});
 const snapshot={data:ink.data.slice(),currents:ink.currentData.slice(),spectrum:ink.spectrum.slice(),roles:ink.roles.slice(),time:ink.time,phase:ink.flowPhase};
 ink.selectTrack('second');ink.update(8,{energy:0,spectrum:new Float32Array(48)});
 assert.deepEqual(ink.data,snapshot.data);assert.deepEqual(ink.currentData,snapshot.currents);assert.deepEqual(ink.spectrum,snapshot.spectrum);assert.deepEqual(ink.roles,snapshot.roles);assert.equal(ink.time,snapshot.time);assert.equal(ink.flowPhase,snapshot.phase);
 ink.update(8+1/60,{energy:.8,spectrum:new Float32Array(48).fill(.1)});assert.ok(snapshot.spectrum[0]-ink.spectrum[0]<.03);
 for(let i=2;i<=180;i++)ink.update(8+i/60,{energy:.8,spectrum:new Float32Array(48).fill(.1)});
 assert.ok(Math.abs(ink.spectrum[0]-.1)<.001);assert.equal(ink.transition,0);
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

test('rain density and placement remain consistent across frame rates; an explicit canvas reset starts a clean sheet',()=>{
 const results=[30,60,120].map(fps=>run(new ContourMotion(),20,{energy:.7,bass:.5},fps));
 assert.ok(Math.max(...results.map(m=>m.emitted))-Math.min(...results.map(m=>m.emitted))<=1);
 for(const ink of results){assert.ok(Math.abs(ink.time-20)<1e-8);ink.reset();assert.ok(ink.drops.every(x=>x===0));assert.equal(ink.emitted,0);assert.equal(ink.clock,null);assert.equal(ink.time,0);}
});

test('rain contains fine mist, ordinary beads and occasional large accented impacts',()=>{
 const ink=new ContourMotion();ink.update(0);const seen=new Set(),counts=[0,0,0],radii=[[],[],[]];let merges=0;
 for(let i=1;i<=1800;i++){
  ink.update(i/60,{energy:.9,bass:.8,texture:.6,onset:i%30<3?1:0});
  for(let k=0;k<CONTOUR_RAIN_COUNT;k++){const at=k*4,key=k+':'+ink.drops[at+2];if(!ink.drops[at+3]||seen.has(key))continue;seen.add(key);const kind=ink.details[at+2];counts[kind]++;radii[kind].push(ink.details[at]);}
  merges=Math.max(merges,ink.links.filter((v,k)=>k%4===3&&v>.1).length);
 }
 assert.ok(counts.every(n=>n>5));assert.ok(counts[2]<seen.size*.10,'large splashes remain occasional');
 assert.ok(Math.max(...radii[0])<Math.min(...radii[1]));assert.ok(Math.max(...radii[1])<Math.min(...radii[2]));assert.ok(merges>=2);
});

test('wet pools join according to paper distance and release their connection as they dry',()=>{
 const ink=new ContourMotion();ink.update(0);
 ink.drops.set([0,0,0,.8, .075,0,0,.8]);ink.details.set([.05,.5,1,.7, .05,.5,1,.8]);
 for(let i=1;i<=90;i++)ink.update(i/60,{energy:0,ratio:1});assert.ok(ink.links[3]>.95&&ink.links[7]>.95);
 for(let i=91;i<=150;i++)ink.update(i/60,{energy:0,ratio:2});assert.ok(ink.links[3]<.001,'paper aspect is included in the connection distance');
 for(let i=151;i<=210;i++)ink.update(i/60,{energy:0,ratio:1});assert.ok(ink.links[3]>.5);
 for(let i=211;i<=300;i++)ink.update(i/60,{energy:0,ratio:1});assert.ok(ink.links[3]<.001&&ink.links[7]<.001);
});

test('absorbed memory stays faint, bounded, retains its deposited color and is never overwritten while visible',()=>{
 const ink=new ContourMotion();ink.update(0);let changes=0;
 for(let i=1;i<=5400;i++){
  const before=ink.memory.slice(),tints=ink.tints.slice();
  ink.update(i/60,{energy:.9,bass:.7,onset:i%30<3?1:0,colors:i<2400?[[1,.02,.01],[.8,.1,.1],[1,.04,.03]]:[[.02,.3,1],[.03,.6,.8],[.1,.4,.9]]});
  for(let k=0;k<CONTOUR_MEMORY_COUNT;k++){
   const at=k*4,dest=(CONTOUR_RAIN_COUNT+k)*4;
   if(before[at+2]!==ink.memory[at+2]){changes++;if(before[at+3])assert.ok(ink.time-before[at+2]>=CONTOUR_MEMORY_LIFE);}
   else if(before[at+3])assert.deepEqual([...ink.tints.subarray(dest,dest+4)],[...tints.subarray(dest,dest+4)]);
   assert.ok(ink.memory[at+3]<.08);
  }
 }
 assert.ok(changes>128);assert.equal(ink.memory.length,CONTOUR_MEMORY_COUNT*4);
 const material=[...ink.material];ink.reset();assert.ok(ink.data.every(v=>v===0));assert.deepEqual([...ink.material],material,'the brush does not collapse on a source change');
});

test('bass changes brush pressure smoothly while quiet sound leaves the continuous gesture visible',()=>{
 const ink=run(new ContourMotion(),3,{energy:.7,bass:.05});const light=[...ink.material];
 ink.update(181/60,{energy:.7,bass:.95});assert.ok(ink.material[0]-light[0]<.06);
 for(let i=182;i<=360;i++)ink.update(i/60,{energy:.7,bass:.95});assert.ok(ink.material[0]>.94);
 for(let i=361;i<=540;i++)ink.update(i/60,{energy:0});assert.ok(ink.material[0]<.001&&ink.material[1]<.001);
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
