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

test('percussion drives a continuous response instead of a one-frame radius jump',()=>{
 const m=new AerialMotion(),world=new AerialPhysics();let previous=0,largest=0,largestBody=0,positions=world.rendered.slice();
 for(let i=0;i<1800;i++){
  const t=i/60,pulse=t%.48<.035?1:0;m.update(t,{...playing,onset:pulse,roles:{bass:.6,lead:.7,drums:pulse}});
  largest=Math.max(largest,Math.abs(m.hit-previous));previous=m.hit;
  world.update(m.simulationClock,{bass:m.roles[0],lead:m.roles[2],drums:m.roles[1],onset:m.hit},{continuous:true,detail:m.detail,drive:m.drive});
  for(let j=0;j<24;j++){const k=j*4;largestBody=Math.max(largestBody,Math.hypot(...[0,1,2].map(a=>world.rendered[k+a]-positions[k+a])));}positions.set(world.rendered);
 }
 assert.ok(largest<.08,'The old instantaneous hit was 1.0');assert.ok(largestBody<.05);assert.ok(m.emitted>10);
});

test('local frequency, harmonic and percussion envelopes retain different band identities',()=>{
 const m=new AerialMotion(),spectrum=new Float32Array(48),harmonic=new Float32Array(48),percussive=new Float32Array(48);spectrum[8]=.8;harmonic[8]=.9;percussive[36]=.9;
 const options={...playing,spectrum,harmonic,percussive};m.update(0,options);advance(m,2,options);
 assert.ok(m.detail[4*4]>.5);assert.ok(m.detail[4*4+1]>.45);assert.ok(m.detail[18*4+2]>.5);
 assert.ok(m.detail[4*4+2]<.001);assert.ok(m.detail[18*4+1]<.001);
 const before=m.detail.slice();m.beginTrack();assert.deepEqual(m.detail,before);
});

test('spectral colour balance changes strongly with timbre while silence holds its hue',()=>{
 const tone=band=>{const m=new AerialMotion(),s=new Float32Array(48);s[band]=1;const o={...playing,spectrum:s};m.update(0,o);advance(m,4,o);return m;};
 const low=tone(4),high=tone(40);assert.ok(high.tone[0]-low.tone[0]>.7);
 const hue=low.tone[0];advance(low,4,{...playing,active:false});assert.ok(Math.abs(low.tone[0]-hue)<.01);
 const held=[...high.tone,...high.detail];advance(high,1,{...playing,reduced:true});assert.deepEqual([...high.tone,...high.detail],held);
});

test('currents integrate a slow musical phase and retain it through track changes and freeze',()=>{
 const m=new AerialMotion();m.update(0,playing);advance(m,3);const before=m.currentPhase.slice();advance(m,1);
 for(let i=0;i<24;i++)assert.ok(m.currentPhase[i]-before[i]>.04&&m.currentPhase[i]-before[i]<.12);
 const held=m.currentPhase.slice();m.beginTrack();assert.deepEqual(m.currentPhase,held);advance(m,1,{...playing,hold:true});assert.deepEqual(m.currentPhase,held);
 advance(m,8,{...playing,active:false});const resting=m.currentPhase.slice();advance(m,1,{...playing,active:false});for(let i=0;i<24;i++)assert.ok(m.currentPhase[i]-resting[i]>.01&&m.currentPhase[i]-resting[i]<.015);
});

test('bass excites short lift while loudness spreads the sculpture without a bass jump',()=>{
 const m=new AerialMotion(),quiet={...playing,energy:0,roles:{}};m.update(0,quiet);advance(m,2,quiet);advance(m,.3,{...quiet,roles:{bass:.9}});
 assert.ok(m.drive[0]>.6);assert.ok(m.drive[1]<.001);assert.ok(m.drive[3]<.9);
 advance(m,3,{...quiet,roles:{bass:.9}});assert.ok(m.drive[0]<.06,'A held bass note must not repeatedly launch every sphere');
 const loud=new AerialMotion();loud.update(0,quiet);advance(loud,.5,{...quiet,energy:.95});assert.ok(loud.drive[1]>.35&&loud.drive[2]>.5);assert.ok(loud.drive[0]<.001);
 const held=loud.drive.slice();advance(loud,1,{...quiet,reduced:true});assert.deepEqual(loud.drive,held);advance(loud,5,{...quiet,active:false});assert.ok(loud.drive[1]<.01&&loud.drive[2]<.01&&loud.drive[3]>.99);
});
