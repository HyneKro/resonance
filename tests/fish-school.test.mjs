import test from 'node:test';
import assert from 'node:assert/strict';
import {FishSchool} from '../public/fish-school.js';

test('school state persists through pause, hiding and long resume gaps',()=>{
 const school=new FishSchool(160);school.update(0);
 for(let i=1;i<=120;i++)school.update(i/60,{bass:.8,lead:.4});
 const pixels=school.texture.slice(),steps=school.steps;
 school.update(2);assert.deepEqual(school.texture,pixels);assert.equal(school.steps,steps);
 school.update(900);assert.deepEqual(school.texture,pixels);assert.equal(school.steps,steps);
 school.suspend();school.update(950);assert.deepEqual(school.texture,pixels);
 school.update(NaN);assert.deepEqual(school.texture,pixels);
});

test('school stays finite and bounded under sustained loud music with fixed storage',()=>{
 const school=new FishSchool(160),texture=school.texture;school.update(0);
 for(let i=1;i<=2400;i++)school.update(i/24,{bass:i%120<60?1:0,lead:1});
 assert.equal(school.texture,texture);assert.ok(school.state.every(Number.isFinite));
 for(let i=0;i<school.count;i++){
  assert.ok(Math.hypot(...school.state.slice(i*6,i*6+3))<4,'school remains in view');
  const speed=Math.hypot(...school.state.slice(i*6+3,i*6+6));assert.ok(speed>=.339&&speed<=.971);
 }
});

test('musical attacks are gated, recover, and respond to the beat control',()=>{
 const s=new FishSchool(80);s.update(0);
 for(let i=1;i<=120;i++)s.update(i/60,{onset:1,drums:1},{beat:1});
 assert.equal(s.attacks,1,'a held loud sound must not retrigger every frame');
 for(let i=121;i<150;i++)s.update(i/60,{});
 s.update(150/60,{onset:1},{beat:1});assert.equal(s.attacks,2);assert.ok(s.hit>1);
 const quiet=new FishSchool(80);quiet.update(0);quiet.update(1/30,{onset:1},{beat:0});assert.equal(quiet.hit,0);
 const frozen=s.texture.slice(),phase=s.phase;s.update(151/60,{onset:1},{reduced:true});assert.deepEqual(s.texture,frozen);assert.equal(s.phase,phase);
 s.reset();assert.equal(s.phase,0);assert.equal(s.attacks,0);assert.deepEqual(s.texture,new FishSchool(80).texture);
});

test('school openings, bass speed and turbulence change persistent motion',()=>{
 const run=(roles,options)=>{const s=new FishSchool(160);s.update(0);for(let i=1;i<=900;i++)s.update(i/60,roles,options);return s;};
 const closed=run({}, {opening:0}),open=run({}, {opening:1});
 const radius=s=>s.state.reduce((sum,x,i)=>i%6===0?sum+Math.hypot(x,s.state[i+1]-.2):sum,0)/s.count;
 assert.ok(radius(open)>radius(closed)*1.35,'an open school must reveal more water at its centre');
 const loud=run({bass:1,lead:1},{opening:1,turbulence:2});
 assert.ok(loud.state.some((x,i)=>Math.abs(x-open.state[i])>.2));
 const max=run({bass:1,lead:1,onset:1},{movement:3.5,turbulence:2,opening:1});
 assert.ok(max.state.every(Number.isFinite));for(let i=0;i<max.count;i++)assert.ok(Math.hypot(...max.state.slice(i*6,i*6+3))<6);
});

test('frame rate changes do not change the schooling simulation',()=>{
 const run=hz=>{const school=new FishSchool(80);school.update(0);for(let i=1;i<=hz*5;i++)school.update(i/hz,{bass:.6,lead:.3});return school;};
 const a=run(30),b=run(120);assert.ok(Math.abs(a.steps-b.steps)<=1);
 for(let i=0;i<a.texture.length;i++)assert.ok(Math.abs(a.texture[i]-b.texture[i])<.035);
 assert.equal(new FishSchool(100000).count,384);
});

test('nearby fish separate rather than continuing to overlap',()=>{
 const school=new FishSchool(16);school.state.set([1,0,-.7,0,0,.4],0);school.state.set([1.01,0,-.7,0,0,.4],6);
 const before=Math.abs(school.state[0]-school.state[6]);
 school.step(0,0);assert.ok(Math.abs(school.state[0]-school.state[6])>before);
});
