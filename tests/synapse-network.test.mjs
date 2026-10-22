import test from 'node:test';
import assert from 'node:assert/strict';
import {createSynapseNetwork,SynapseSignals} from '../public/synapse-network.js';

const input={bass:.8,drums:0,lead:.7,texture:.5,energy:.8,lights:new Float32Array(48).fill(.65)};
const advance=(network,signals,seconds,options=input)=>{for(let i=0;i<Math.round(seconds*60);i++){signals.update((signals.clock??0)+1/60,{...options,nodes:network.nodes,count:network.count});network.update(signals);}};

test('Synapse prepares deterministic volumetric nodes with bounded nearest connections',async()=>{
 let yields=0;const a=await createSynapseNetwork(680,async()=>{yields++;}),b=await createSynapseNetwork(680);
 assert.deepEqual(a,b);assert.ok(yields>4);assert.ok(a.links.size>680&&a.links.size<=680*3);assert.equal(a.capacity,680*5);
 assert.ok(a.nodes.every(Number.isFinite));assert.ok(a.edges.every(Number.isFinite));
 const degree=new Uint16Array(a.count),pairs=new Set();
 for(const link of a.links.values()){
  const [x,y,opacity]=a.edges.slice(link.slot*4,link.slot*4+3);assert.ok(x>=0&&y<a.count&&x<y);assert.equal(opacity,1);
  const key=x+':'+y;assert.ok(!pairs.has(key));pairs.add(key);degree[x]++;degree[y]++;
  assert.ok(Math.hypot(...[0,1,2].map(j=>a.nodes[x*4+j]-a.nodes[y*4+j]))<=1.35);
 }
 assert.ok(degree.every(x=>x>=3));
 for(const axis of [0,1,2]){const values=Array.from({length:a.count},(_,i)=>a.nodes[i*4+axis]);assert.ok(Math.max(...values)-Math.min(...values)>2,'Not a flat billboard');}
});

test('Synapse all nodes travel and nearest links genuinely rearrange while remaining bounded',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals(),before=n.nodes.slice(),pairs=new Set(n.links.keys());s.update(0);advance(n,s,12);
 let changed=0;for(let i=0;i<n.count;i++)if(Math.hypot(...[0,1,2].map(j=>n.nodes[i*4+j]-before[i*4+j]))>.1)changed++;
 assert.equal(changed,n.count);assert.ok([...n.links.keys()].filter(x=>!pairs.has(x)).length>pairs.size*.3);
 assert.ok(n.links.size<n.capacity);assert.equal(n.links.size+n.free.length,n.capacity);assert.ok(n.rewires>60);
 assert.ok(n.nodes.every(Number.isFinite));assert.ok(n.edges.every(Number.isFinite));
 for(let i=0;i<n.count;i++)assert.ok(Math.hypot(n.nodes[i*4],n.nodes[i*4+1],n.nodes[i*4+2])<8);
});

test('Synapse new links crossfade and disappearing links release their slots',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);advance(n,s,3);
 assert.ok([...n.links.values()].some(x=>n.edges[x.slot*4+2]>.01&&n.edges[x.slot*4+2]<.99));
 const before=n.edges.slice();advance(n,s,1/60);
 for(let i=2;i<n.edges.length;i+=4)assert.ok(Math.abs(n.edges[i]-before[i])<.1,'Rewiring must not blink');
 const slots=new Set([...n.links.values()].map(x=>x.slot));assert.equal(slots.size,n.links.size);for(const free of n.free)assert.ok(!slots.has(free));
});

test('Synapse attacks begin at one actual node and retain that origin as the node moves',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);s.update(.02,{...input,onset:1,nodes:n.nodes,count:n.count});
 assert.equal(s.emitted,1);const id=s.events[2],origin=s.origins.slice(0,3);assert.deepEqual(origin,n.nodes.slice(id*4,id*4+3));
 advance(n,s,1);assert.deepEqual(s.origins.slice(0,3),origin);assert.notDeepEqual(n.nodes.slice(id*4,id*4+3),origin);
});

test('Synapse impulses need audible rising attacks and expire without held-note retriggers',()=>{
 const signals=new SynapseSignals();signals.update(0);signals.update(.02,{onset:1,energy:.7});assert.equal(signals.emitted,1);
 for(let i=2;i<600;i++)signals.update(i*.02,{onset:1,drums:1,energy:.7});assert.equal(signals.emitted,1);
 const last=signals.events[0];for(let i=600;i<700;i++)signals.update(i*.02,{});assert.ok(signals.time-last>10);
 signals.update(14,{onset:1,energy:0});assert.equal(signals.emitted,1);
 for(let i=701;i<1700;i++)signals.update(i*.02,{onset:i%25===0?1:0,energy:.7});assert.ok(signals.emitted>20);assert.equal(signals.events.length,32);assert.ok(signals.events.every(Number.isFinite));
});

test('Synapse discards missing time and holds frozen/reduced frames without catchup',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);s.update(.02,{onset:.9,energy:.8});n.update(s);const t=s.time,events=s.events.slice(),nodes=n.nodes.slice();
 for(const [clock,options]of [[.02,{}],[.04,{reduced:true}],[.06,{hold:true}],[300,{onset:1,energy:1}]]){s.update(clock,options);n.update(s);assert.equal(s.time,t);assert.deepEqual(s.events,events);assert.deepEqual(n.nodes,nodes);}
 s.suspend();s.update(600,{onset:1,energy:1});assert.equal(s.time,t);assert.equal(s.emitted,1);s.update(600.02,{onset:1,energy:1});assert.equal(s.emitted,1);
 s.update(NaN);assert.ok(Number.isFinite(s.time));s.reset();assert.equal(s.emitted,0);assert.ok(s.events.every(x=>x===0));assert.equal(s.time,0);
});

test('Synapse pause settles smoothly, finishes existing waves and keeps slow idle motion',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);advance(n,s,2);s.update(s.clock+.02,{...input,onset:1});n.update(s);
 const emitted=s.emitted,activity=s.activity,phase=s.phase,time=s.time;advance(n,s,.2,{...input,onset:1,active:false});assert.ok(s.activity<activity&&s.activity>activity*.5);
 advance(n,s,6,{...input,onset:1,active:false});assert.equal(s.emitted,emitted);assert.ok(s.activity<.001);assert.ok(s.time-time>6);
 const idle=s.phase;advance(n,s,1,{active:false});assert.ok(s.phase-idle>.07&&s.phase-idle<.08);assert.ok(s.phase>phase);
});

test('Synapse track colours ease continuously and clearing old attacks preserves geometry phase',()=>{
 const s=new SynapseSignals(),a=Array(18).fill(.1),b=Array(18).fill(.9);s.update(0,{palette:a});s.update(.02,{...input,palette:a,onset:1});
 const phase=s.phase,time=s.time;s.clearEvents();assert.equal(s.phase,phase);assert.equal(s.time,time);assert.equal(s.emitted,0);
 s.update(.04,{palette:b});assert.ok(s.palette[0]>.1&&s.palette[0]<.12);for(let i=3;i<=300;i++)s.update(i*.02,{palette:b});assert.ok(s.palette[0]>.88);
});
