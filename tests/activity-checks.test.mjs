import test from 'node:test';
import assert from 'node:assert/strict';
import {soundPreparation} from '../public/library-activity.js';
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
test('sound preparation skips cached/failed files and serializes missing work',async()=>{
 const calls=[],states=[];let finish;
 const prep=soundPreparation({tracks:()=>['a','b','c','d'].map(id=>({id})),load:async()=>({profiles:{a:{}},failed:['b']}),analyze:id=>{calls.push(id);return id==='c'?new Promise(r=>finish=r):Promise.resolve({profile:{}});},profile:async()=>({profile:{}}),update:v=>states.push(v)});
 prep.toggle();await settle();assert.deepEqual(calls,['c']);assert.ok(prep.running);
 finish({profile:{}});await settle();assert.deepEqual(calls,['c','d']);assert.equal(prep.running,false);assert.equal(states.at(-1).done,2);
});
test('pausing a sound pass prevents subsequent files; Android charging failures are shown',async()=>{
 let finish;const calls=[],states=[];
 const prep=soundPreparation({tracks:()=>[{id:'a'},{id:'b'}],load:async()=>({}),analyze:id=>{calls.push(id);return new Promise(r=>finish=r);},update:v=>states.push(v)});
 prep.toggle();await settle();prep.toggle();finish({profile:{}});await settle();assert.deepEqual(calls,['a']);assert.equal(prep.running,false);assert.equal(states.at(-1),null);
 const plugged=soundPreparation({tracks:()=>[],load:async()=>({canPrepare:false}),update:v=>states.push(v)});plugged.toggle();await settle();assert.match(states.at(-1).message,/charger/);assert.equal(plugged.running,false);
});
