import test from 'node:test';
import assert from 'node:assert/strict';
import {AfterglowMotion} from '../public/spectrum-history.js';
const live={spectrum:new Float32Array(48).fill(.8),lights:new Float32Array(48).fill(.7),roles:{bass:.8,drums:.7,lead:.6},palette:new Float32Array(18).fill(.6)};
const advance=(m,seconds,options=live)=>{for(let i=0;i<seconds*60;i++)m.update((m.clock??0)+1/60,options);};
test('Afterglow coasts smoothly on pause, stays alive at rest and resumes without a position jump',()=>{
 const m=new AfterglowMotion();m.update(0,live);advance(m,4);const world=[...m.world],level=m.roles[0];
 m.update(m.clock+1/60,{active:false});assert.ok(m.roles[0]>level*.95);assert.ok(m.world[1]>world[1]&&m.world[1]-world[1]<.1);
 advance(m,8,{active:false});assert.ok(m.roles[0]<.001);assert.ok(m.spectrum.every(x=>x<.001));
 const rest=[...m.world];advance(m,1,{active:false});assert.ok(m.world[1]>rest[1]&&m.world[1]-rest[1]<.05);
 const before=[...m.world];m.update(m.clock+1/60,live);assert.ok(m.world[1]>before[1]&&m.world[1]-before[1]<.01);assert.ok(m.world.every(Number.isFinite));
});
test('Afterglow song changes preserve road position and history, easing the new notes and palette',()=>{
 const m=new AfterglowMotion();m.update(0,live);advance(m,4);
 const world=[...m.world],historyClock=m.historyClock,spectrum=m.spectrum[0],color=m.palette[0];m.beginTrack();
 assert.deepEqual([...m.world],world);assert.equal(m.historyClock,historyClock);
 m.update(m.clock+1/60,{...live,spectrum:new Float32Array(48),palette:new Float32Array(18)});
 assert.ok(m.spectrum[0]>spectrum*.95);assert.ok(m.palette[0]>color*.98);assert.ok(m.world[1]>world[1]&&m.world[1]-world[1]<.12);
});
test('Afterglow freeze, reduced motion, backwards clocks and hidden gaps never advance or catch up',()=>{
 const m=new AfterglowMotion();m.update(0,live);advance(m,2);const world=[...m.world],history=m.historyClock;
 advance(m,1,{...live,hold:true});advance(m,1,{...live,reduced:true});assert.deepEqual([...m.world],world);assert.equal(m.historyClock,history);
 m.update(m.clock+120,live);m.update(m.clock-20,live);assert.deepEqual([...m.world],world);m.suspend();m.update(500,live);assert.deepEqual([...m.world],world);
 m.update(500+1/60,live);assert.ok(m.world[1]>world[1]&&m.world[1]-world[1]<.12);
});
