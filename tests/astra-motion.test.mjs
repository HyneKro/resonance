import test from 'node:test';
import assert from 'node:assert/strict';
import {AstraMotion} from '../public/astra-motion.js';
const silent=new Float32Array(48),tone=band=>Float32Array.from(silent,(_,i)=>i===band?.9:0);
const snapshot=m=>[m.time,...m.bands,...m.orbits,...m.events];
test('Astra displaces the played frequency and accelerates only its orbit',()=>{
 const m=new AstraMotion();m.update(0,silent);
 for(let n=1;n<=60;n++)m.update(n/60,tone(12),{energy:.8});
 assert.ok(m.bands[48]>.89);assert.ok(m.orbits[49]>.7);assert.ok(m.orbits[48]>.2);
 for(let i=0;i<48;i++)if(i!==12){assert.equal(m.bands[i*4],0);assert.equal(m.orbits[i*4],0);}
 const speed=m.orbits[49],angle=m.orbits[48];m.update(61/60,silent,{energy:0});
 assert.ok(m.orbits[49]<speed&&m.orbits[49]>speed*.9);assert.ok(m.orbits[48]>angle);
 for(let n=62;n<=420;n++)m.update(n/60,silent);assert.ok(m.orbits[49]<.001);
});
test('attacks create bounded bursts, comets and independent orbital echoes; held tones do not retrigger',()=>{
 const m=new AstraMotion();m.update(0,silent);
 for(let n=1;n<=300;n++)m.update(n/60,tone(7),{onset:1,energy:.8});
 assert.equal(m.emitted,1);assert.equal(m.events[3],1);assert.ok(m.bands[7*4+2]>.8);
 const birth=m.bands[7*4+1];assert.ok(birth<.4);
 for(let n=301;n<=900;n++){const hit=n%30===0;m.update(n/60,hit?tone(7):silent,{onset:hit?1:0,energy:.8});}
 assert.ok(m.emitted>15);assert.equal(m.events.length,48);assert.equal(m.bands.length,192);
 assert.ok(m.events.every(Number.isFinite));
});
test('freeze, reduced motion, gaps and re-entry never advance time or emit catch-up events',()=>{
 const m=new AstraMotion();m.update(0,silent);m.update(.02,tone(4),{onset:1,energy:.8});const before=snapshot(m);
 m.update(.02,tone(4),{onset:1,energy:.8});assert.deepEqual(snapshot(m),before);
 const time=m.time,events=[...m.events],orbits=[...m.orbits];
 m.update(.12,tone(4),{onset:1,energy:.8,reduced:true});m.update(600,tone(4),{onset:1,energy:.8});
 assert.equal(m.time,time);assert.deepEqual([...m.events],events);assert.deepEqual([...m.orbits],orbits);
 m.suspend();m.update(800,tone(4),{onset:1,energy:.8});m.update(800.02,tone(4),{onset:1,energy:.8});assert.equal(m.emitted,1);
 m.reset();assert.equal(m.emitted,0);assert.ok(m.events.every(x=>x===0));assert.ok(m.orbits.every(x=>x===0));
});
test('orbital velocity integrates consistently at 30 and 120 fps and ignores invalid samples',()=>{
 const simulate=fps=>{const m=new AstraMotion();m.update(0,silent);for(let n=1;n<=fps*3;n++)m.update(n/fps,tone(21),{energy:.7});return m;};
 const a=simulate(30),b=simulate(120);assert.ok(Math.abs(a.orbits[84]-b.orbits[84])<.015);
 const before=snapshot(a);a.update(NaN,[NaN],{energy:NaN});assert.deepEqual(snapshot(a),before);
 a.update(3.02,Float32Array.from(silent,(_,i)=>i%2?Infinity:NaN),{energy:0});assert.ok(snapshot(a).every(Number.isFinite));
});
