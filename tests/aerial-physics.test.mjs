import test from 'node:test';
import assert from 'node:assert/strict';
import {AerialPhysics} from '../public/aerial-physics.js';

test('Aerial advances the same world at different display refresh rates',()=>{
 const run=fps=>{const world=new AerialPhysics();world.update(0);for(let i=1;i<=fps*12;i++)world.update(i/fps,{bass:.7,lead:.5,drums:.3});return world;};
 const slow=run(30),fast=run(144);assert.equal(slow.steps,720);assert.equal(fast.steps,720);
 for(let i=0;i<slow.positions.length;i++)assert.ok(Math.abs(slow.positions[i]-fast.positions[i])<1e-5);
});

test('freeze and hidden gaps do not advance or queue sphere physics',()=>{
 const world=new AerialPhysics();world.update(1);world.update(1.1,{bass:1});
 const snapshot=world.rendered.slice(),steps=world.steps;
 for(let i=0;i<300;i++)assert.deepEqual(world.update(1.1,{drums:1}),snapshot);
 assert.equal(world.steps,steps);world.update(90);assert.equal(world.steps,steps);
 world.suspend();world.update(900);assert.equal(world.steps,steps);
 world.update(900+1/60);assert.equal(world.steps,steps+1);
});

test('long musical sessions remain bounded with finite velocities and stable contacts',()=>{
 for(const count of [16,24]){
  const world=new AerialPhysics(count);world.update(0);
  for(let frame=1;frame<=60*100;frame++){
   world.update(frame/60,{bass:(1+Math.sin(frame*.03))*.5,lead:.8,drums:frame%30<4?1:0});
   if(frame%60)continue;
   assert.ok(world.positions.every(Number.isFinite));assert.ok(world.velocities.every(v=>Number.isFinite(v)&&Math.abs(v)<5));
   const p=world.positions;
   for(let i=0;i<count;i++){
    const j=i*4,r=p[j+3];assert.ok(p[j+1]-r>=-1.801);assert.ok(Math.abs(p[j])<=3-r+.001);assert.ok(Math.abs(p[j+2])<=1.6-r+.001);
    for(let k=i+1;k<count;k++){const a=k*4;assert.ok(Math.hypot(p[j]-p[a],p[j+1]-p[a+1],p[j+2]-p[a+2])>=(r+p[a+3])*.94);}
   }
  }
 }
});

test('collisions separate coincident centers and transfer motion by mass',()=>{
 const world=new AerialPhysics(8),p=world.positions;
 p.set([0,0,0,1],0);p.set([.3,0,0,.2],4);world.velocities[3]=-1;
 world.update(0);world.update(1/60);
 assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[4]-p[0])>1.1);
 assert.ok(Math.abs(p[4])>Math.abs(p[0])*4);assert.ok(world.velocities[3]>0);
 p[4]=p[0];p[5]=p[1];p[6]=p[2];world.velocities.fill(0);world.update(2/60);assert.ok(p.every(Number.isFinite));
});

test('bass, melody and percussion each change physical motion, not only lighting',()=>{
 const run=role=>{const world=new AerialPhysics();world.update(0);for(let i=1;i<=360;i++)world.update(i/60,{[role]:role==='drums'?(i%30<5?1:0):.85});return world.positions;};
 const quiet=run('none');
 for(const role of ['bass','lead','drums']){const active=run(role),difference=active.reduce((sum,x,i)=>sum+Math.abs(x-quiet[i]),0);assert.ok(difference>.4,role+' movement: '+difference);}
});

test('invalid inputs cannot expand the bounded population or poison the world',()=>{
 const world=new AerialPhysics(1000);assert.equal(world.count,24);assert.equal(world.rendered.length,96);
 const snapshot=world.rendered.slice();assert.deepEqual(world.update(NaN),snapshot);
 world.update(0);world.update(.1,{bass:NaN,lead:Infinity,drums:-12});assert.ok(world.positions.every(Number.isFinite));
});
