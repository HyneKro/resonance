import test from 'node:test';
import assert from 'node:assert/strict';
import {AstraMotion,keplerPoint} from '../public/astra-motion.js';
const silent=new Float32Array(48),tone=band=>Float32Array.from(silent,(_,i)=>i===band?.9:0);
const snapshot=m=>[m.time,...m.bands,...m.orbits,...m.events,...m.state,...m.cometTrail];
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
 assert.equal(m.emitted,1);assert.equal(m.comets.length,1);assert.ok(m.bands[7*4+2]>.8);
 const birth=m.bands[7*4+1];assert.ok(birth<.4);
 for(let n=301;n<=900;n++){const hit=n%30===0;m.update(n/60,hit?tone(7):silent,{onset:hit?1:0,energy:.8});}
 assert.ok(m.emitted>15);assert.equal(m.events.length,48);assert.equal(m.bands.length,192);
 assert.ok(m.events.every(Number.isFinite));
});
test('freeze, reduced motion, gaps and re-entry never advance time or emit catch-up events',()=>{
 const m=new AstraMotion();m.update(0,silent);m.update(.02,tone(4),{onset:1,energy:.8});const before=snapshot(m);
 m.update(.02,tone(4),{onset:1,energy:.8});assert.deepEqual(snapshot(m),before);
 const time=m.time,events=[...m.events,...m.state,...m.cometTrail],orbits=[...m.orbits];
 m.update(.12,tone(4),{onset:1,energy:.8,reduced:true});m.update(600,tone(4),{onset:1,energy:.8});
 assert.equal(m.time,time);assert.deepEqual([...m.events,...m.state,...m.cometTrail],events);assert.deepEqual([...m.orbits],orbits);
 m.suspend();m.update(800,tone(4),{onset:1,energy:.8});m.update(800.02,tone(4),{onset:1,energy:.8});assert.equal(m.emitted,1);
 m.reset();assert.equal(m.emitted,0);assert.ok(m.events.every(x=>x===0));assert.ok(m.orbits.every(x=>x===0));
});
test('orbital velocity integrates consistently at 30 and 120 fps and ignores invalid samples',()=>{
 const simulate=fps=>{const m=new AstraMotion();m.update(0,silent);for(let n=1;n<=fps*3;n++)m.update(n/fps,tone(21),{energy:.7});return m;};
 const a=simulate(30),b=simulate(120);assert.ok(Math.abs(a.orbits[84]-b.orbits[84])<.015);
 const before=snapshot(a);a.update(NaN,[NaN],{energy:NaN});assert.deepEqual(snapshot(a),before);
 a.update(3.02,Float32Array.from(silent,(_,i)=>i%2?Infinity:NaN),{energy:0});assert.ok(snapshot(a).every(Number.isFinite));
});

test('heavy bass sustains frequent eruptions without stealing the comet lifetime',()=>{
 const run=bass=>{const m=new AstraMotion();m.update(0,silent);for(let i=1;i<=600;i++)m.update(i/60,tone(2),{bass,energy:.8});return m;};
 const quiet=run(.2),heavy=run(.9);assert.equal(quiet.emitted,0);assert.ok(heavy.emitted>=25&&heavy.emitted<40);
 assert.ok(heavy.comets.length>=3&&heavy.comets.length<=6);assert.equal(heavy.cometTrail.length,384);
 assert.ok(heavy.cometTrail.some((v,i)=>i%4===3&&v>0));assert.ok(heavy.events.every(Number.isFinite));
 const count=heavy.emitted;for(let i=601;i<=960;i++)heavy.update(i/60,silent,{bass:1,energy:0});assert.equal(heavy.emitted,count);
});
test('silence has a very slow drift and music creates a pronounced speed contrast',()=>{
 const simulate=energy=>{const m=new AstraMotion();m.update(0,silent);for(let i=1;i<=600;i++)m.update(i/60,energy?tone(12):silent,{energy});return m;};
 const quiet=simulate(0),music=simulate(.8);assert.ok(quiet.state[0]<.061);assert.ok(music.state[0]>quiet.state[0]*12);
 assert.ok(music.orbits[48]>2);assert.equal(quiet.orbits[48],0);
 for(let i=601;i<=900;i++)music.update(i/60,silent);const angle=music.orbits[48];
 for(let i=901;i<=960;i++)music.update(i/60,silent);assert.ok(music.orbits[48]-angle<.001);
});
test('comets are closed ellipses with a solar focus and equal swept area per time',()=>{
 const a=2.2,e=.72,b=a*Math.sqrt(1-e*e),h=.0001;
 for(let i=0;i<200;i++){
  const m=i/200*Math.PI*2,[x,y]=keplerPoint(m,a,e);assert.ok(Math.abs((x+a*e)**2/a**2+y*y/b**2-1)<1e-10);
  const next=keplerPoint(m+h,a,e),area=(x*next[1]-y*next[0])/h;
  assert.ok(Math.abs(area-a*b)<.001,'angular momentum remains constant');
 }
 const speed=m=>{const p=keplerPoint(m,a,e),q=keplerPoint(m+h,a,e);return Math.hypot(q[0]-p[0],q[1]-p[1])/h;};
 assert.ok(speed(0)>speed(Math.PI)*6);assert.ok(Math.abs(keplerPoint(0,a,e)[0]-a*(1-e))<1e-10);
});
