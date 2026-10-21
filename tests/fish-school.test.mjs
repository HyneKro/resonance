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
  const speed=Math.hypot(...school.state.slice(i*6+3,i*6+6));assert.ok(speed>=.279&&speed<=.721);
 }
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
