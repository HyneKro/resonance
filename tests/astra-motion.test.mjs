import test from 'node:test';
import assert from 'node:assert/strict';
import {AstraMotion,keplerPoint} from '../public/astra-motion.js';
const silent=new Float32Array(48),tone=band=>Float32Array.from(silent,(_,i)=>i===band?.9:0);
const snapshot=m=>[m.time,...m.bands,...m.orbits,...m.events,...m.state,...m.cometTrail,...m.roles,...m.warm,...m.cool,...m.lights,...m.echoes,...m.history.data,m.history.head,m.history.accumulator];
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
 const quiet=simulate(0),music=simulate(.8);assert.ok(quiet.state[0]>.23&&quiet.state[0]<.25);assert.ok(music.state[0]>quiet.state[0]*5);
 assert.ok(music.orbits[48]>2);assert.equal(quiet.orbits[48],0);
 for(let i=601;i<=900;i++)music.update(i/60,silent);const angle=music.orbits[48];
 for(let i=901;i<=960;i++)music.update(i/60,silent);assert.ok(music.orbits[48]-angle<.001);
});
test('pause releases smoothly, ambient time continues, and a new palette cannot snap the scene',()=>{
 const m=new AstraMotion(),palette=[.1,.3,.8, .1,.5,.8, .4,.1,.7, .8,.4,.1, 1,.2,.04, .1,.4,.7];
 const options={energy:.8,bass:.8,lead:.4,drums:.7,palette,lights:tone(12)};
 m.update(0,silent,options);for(let i=1;i<=180;i++)m.update(i/60,tone(12),options);
 const before={band:m.bands[48],role:m.roles[0],warm:m.warm.slice(),phase:m.orbits[48],clock:m.state[0],events:m.emitted};
 m.update(181/60,tone(12),{...options,active:false,palette:palette.map((x,i)=>palette[(i+1)%18])});
 assert.ok(m.bands[48]<before.band&&m.bands[48]>before.band*.95);
 assert.ok(m.roles[0]<before.role&&m.roles[0]>before.role*.95);
 assert.ok(m.warm.every((x,i)=>Math.abs(x-before.warm[i])<.02));
 assert.ok(m.orbits[48]>before.phase&&m.state[0]>before.clock);assert.equal(m.emitted,before.events);
 for(let i=182;i<=480;i++)m.update(i/60,silent,{...options,active:false});
 assert.ok(m.roles[0]<.001&&m.bands[48]<.001);assert.ok(m.state[0]>before.clock+.12);
 const quiet=m.roles[0],phase=m.orbits[48];m.update(481/60,tone(12),options);
 assert.ok(m.roles[0]>quiet&&m.roles[0]<.1);assert.ok(m.orbits[48]-phase<.01);
 const frozen=snapshot(m);m.update(481/60,silent,{palette:palette.map(()=>1),active:false});assert.deepEqual(snapshot(m),frozen);
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

test('a new attack overlaps the visible front instead of replacing it after a skip',()=>{
 const m=new AstraMotion();m.update(0,silent);
 for(let i=1;i<=24;i++)m.update(i/60,silent,{energy:.8,onset:i===1?1:0});
 const before=m.echoes.slice(),first=m.fronts[0];
 m.update(25/60,tone(5),{energy:.8,onset:1});
 assert.equal(m.fronts.length,2);assert.deepEqual(m.fronts[0],first);
 assert.ok(m.echoes[0]>.7,'the first inner shockwave must not blink out on the new onset');
 assert.ok(m.echoes.every((v,i)=>Math.abs(v-before[i])<.07));
 // The inner burst must survive long enough to reach the remote ring groups.
 for(let i=26;i<=240;i++)m.update(i/60,silent,{energy:.8,onset:i%12===0?1:0});
 assert.ok(m.echoes[71]>.1);assert.ok(m.fronts.length<=24);
});

test('comet slot rollover preserves every other live trajectory and particle assignment',()=>{
 const m=new AstraMotion();m.update(0,silent);
 let previous=[];
 for(let i=1;i<=1800;i++){
  previous=m.comets.map(c=>({...c}));m.update(i/60,tone(2),{bass:.9,energy:.9});
  if(previous.length===6){
   const changed=m.comets.reduce((n,c,k)=>n+Number(c.birth!==previous[k].birth),0);
   assert.ok(changed<=1,'inserting a comet must never shift the remaining slots');
  }
 }
 assert.equal(m.comets.length,6);assert.ok(m.comets.some(c=>c.birth>25));
});

test('solar launch pressure varies with loudness',()=>{
 const run=energy=>{const m=new AstraMotion();m.update(0,silent);m.update(.02,tone(3),{onset:1,bass:.7,energy});return m;};
 const quiet=run(.15),loud=run(.95);
 assert.ok(loud.events[1]>quiet.events[1]*1.8);assert.ok(loud.events[3]>quiet.events[3]*1.8);

});

test('radial spectrum history carries old notes outward through silence and new music',()=>{
 const m=new AstraMotion();m.update(0,silent);
 for(let i=1;i<=60;i++)m.update(i/60,tone(3),{energy:.8});
 for(let i=61;i<=90;i++)m.update(i/60,silent,{active:false});
 for(let i=91;i<=120;i++)m.update(i/60,tone(35),{energy:.8});
 const row=age=>((m.history.head-age+128)%128)*48;
 assert.ok(m.history.data[row(0)+35]>200);
 assert.ok(m.history.data[row(35)+3]>200,'the previous note is still in the travelling echo');
 assert.equal(m.history.data[row(35)+35],0);
});
