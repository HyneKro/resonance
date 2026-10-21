import test from 'node:test';
import assert from 'node:assert/strict';
import {createSynapseNetwork,SynapseSignals} from '../public/synapse-network.js';

test('Synapse topology is deterministic, connected and bounded, with finite graph-distance fields',async()=>{
 let yields=0;const a=await createSynapseNetwork(680,async()=>{yields++;}),b=await createSynapseNetwork(680);
 assert.deepEqual(a,b);assert.ok(yields>10);assert.ok(a.edgeCount>680&&a.edgeCount<=680*5);
 assert.ok(a.nodes.every(Number.isFinite));assert.ok(a.edges.every(Number.isFinite));
 const pairs=new Set(),adj=Array.from({length:a.count},()=>[]);
 for(let i=0;i<a.edges.length;i+=4){
  const [x,y,length]=a.edges.slice(i,i+3);assert.ok(x>=0&&y>=0&&x<a.count&&y<a.count&&x!==y);assert.ok(length>0);
  const key=[Math.min(x,y),Math.max(x,y)].join(':');assert.ok(!pairs.has(key));pairs.add(key);adj[x].push(y);adj[y].push(x);
  for(let source=0;source<4;source++){
   const dx=a.nodes[a.count*4+x*4+source],dy=a.nodes[a.count*4+y*4+source];
   assert.ok(dx>=0&&dy>=0);assert.ok(Math.abs(dx-dy)<=length+.00002,'Arrival times respect edge lengths');
  }
 }
 const reached=new Set([0]),queue=[0];for(let at=0;at<queue.length;at++)for(const next of adj[queue[at]])if(!reached.has(next)){reached.add(next);queue.push(next);}
 assert.equal(reached.size,a.count);
 for(let source=0;source<4;source++){let zeros=0;for(let i=0;i<a.count;i++)if(a.nodes[a.count*4+i*4+source]===0)zeros++;assert.equal(zeros,1);}
});

test('Synapse impulses need audible rising attacks and expire without held-note retriggers',()=>{
 const signals=new SynapseSignals();signals.update(0);signals.update(.02,{onset:1,energy:.7});assert.equal(signals.emitted,1);
 for(let i=2;i<600;i++)signals.update(i*.02,{onset:1,drums:1,energy:.7});assert.equal(signals.emitted,1);
 const last=signals.events[0];for(let i=600;i<700;i++)signals.update(i*.02,{});assert.ok(signals.time-last>10);
 signals.update(14,{onset:1,energy:0});assert.equal(signals.emitted,1);
 for(let i=701;i<1700;i++)signals.update(i*.02,{onset:i%25===0?1:0,energy:.7});assert.ok(signals.emitted>20);assert.equal(signals.events.length,32);assert.ok(signals.events.every(Number.isFinite));
});

test('Synapse discards missing time, holds frozen/reduced frames and clears a new track',()=>{
 const s=new SynapseSignals();s.update(0);s.update(.02,{onset:.9,energy:.8});const t=s.time,events=s.events.slice();
 s.update(.02);s.update(.04,{reduced:true});assert.equal(s.time,t);assert.deepEqual(s.events,events);
 s.update(300,{onset:1,energy:1});assert.equal(s.time,t);assert.equal(s.emitted,1);
 s.suspend();s.update(600,{onset:1,energy:1});assert.equal(s.time,t);assert.equal(s.emitted,1);
 s.update(600.02,{onset:1,energy:1});assert.equal(s.emitted,1);
 s.update(NaN);assert.ok(Number.isFinite(s.time));s.reset();assert.equal(s.emitted,0);assert.ok(s.events.every(x=>x===0));assert.equal(s.time,0);
});
