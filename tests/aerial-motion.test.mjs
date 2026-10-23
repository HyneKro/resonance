import test from 'node:test';
import assert from 'node:assert/strict';
import {AerialMotion,AerialPhysics} from '../public/aerial-physics.js';
const palette=new Float32Array(18).fill(.3),spheres=new AerialPhysics().rendered;
const playing={palette,spheres,count:24,spectrum:new Float32Array(48).fill(.7),lights:new Float32Array(48).fill(.8),roles:{bass:.8,lead:.7,drums:0},energy:.8};
const advance=(m,seconds,options=playing)=>{for(let i=0;i<Math.round(seconds*120);i++)m.update((m.clock??0)+1/120,options);};

test('Aerial retains bodies and smooths spectrum, palette and idle motion across songs',()=>{
 const m=new AerialMotion();m.update(0,playing);advance(m,4);
 const clock=m.simulationClock,phase=m.phase,color=m.palette.slice(),spectrum=m.spectrum.slice(),events=m.bursts.slice();m.beginTrack();
 assert.equal(m.simulationClock,clock);assert.equal(m.phase,phase);assert.deepEqual(m.bursts,events);
 m.update(m.clock+1/120,{...playing,palette:new Float32Array(18).fill(1),spectrum:new Float32Array(48)});
 assert.ok(m.palette.every((x,i)=>Math.abs(x-color[i])<.01));assert.ok(m.spectrum.every((x,i)=>Math.abs(x-spectrum[i])<.02));
 advance(m,1,{...playing,active:false});assert.ok(m.activity>.2);assert.ok(m.energy>.2);
 advance(m,8,{...playing,active:false});assert.ok(m.activity<.001);assert.ok(m.energy<.001);
 const rest=m.simulationClock;advance(m,1,{...playing,active:false});assert.ok(m.simulationClock-rest>.119&&m.simulationClock-rest<.13);
});

test('attacks release bounded bubble groups, which finish after pause without reappearing',()=>{
 const m=new AerialMotion(),quiet={...playing,roles:{}};m.update(0,quiet);advance(m,.1,quiet);
 advance(m,.1,{...quiet,onset:1});assert.equal(m.emitted,1);const origin=m.bursts.slice(0,3);
 advance(m,1,{...quiet,onset:1});assert.equal(m.emitted,1,'A held transient is not a repeated attack');assert.deepEqual(m.bursts.slice(0,3),origin);
 advance(m,5,{...quiet,active:false});assert.ok(Array.from({length:12},(_,i)=>m.bursts[i*4+3]).every(age=>age<0));
 for(let i=0;i<60;i++){advance(m,.3,quiet);advance(m,.05,{...quiet,onset:1});}
 assert.ok(m.emitted>=40&&m.emitted<=61);assert.equal(m.bursts.length,48);assert.equal(m.powers.length,12);assert.ok(m.bursts.every(Number.isFinite));
});

test('Aerial freeze, reduced motion and hidden gaps neither age bubbles nor catch up',()=>{
 const m=new AerialMotion();m.update(0,playing);advance(m,.1,{...playing,onset:1});const snapshot=[m.phase,m.simulationClock,...m.bursts];
 for(const options of [{hold:true},{reduced:true}]){advance(m,1,{...playing,...options});assert.deepEqual([m.phase,m.simulationClock,...m.bursts],snapshot);}
 m.update(m.clock+900,playing);assert.deepEqual([m.phase,m.simulationClock,...m.bursts],snapshot);m.suspend();m.update(m.clock+900,playing);assert.deepEqual([m.phase,m.simulationClock,...m.bursts],snapshot);
});

test('a full burst pool skips a release instead of teleporting visible bubbles',()=>{
 const m=new AerialMotion();m.update(0,playing);for(let i=0;i<12;i++)m.bursts.set([i,0,0,1],i*4);
 const origins=m.bursts.slice();m.update(.01,{...playing,onset:1});assert.equal(m.emitted,0);
 for(let i=0;i<48;i++)if(i%4!==3)assert.equal(m.bursts[i],origins[i]);
});
