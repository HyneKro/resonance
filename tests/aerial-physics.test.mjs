import test from 'node:test';
import assert from 'node:assert/strict';
import {AerialPhysics} from '../public/aerial-physics.js';

test('Aerial advances the same world at different display refresh rates',()=>{
 const run=fps=>{const world=new AerialPhysics();world.update(0);for(let i=1;i<=fps*12;i++)world.update(i/fps,{bass:.7,lead:.5,drums:.3});return world;};
 const slow=run(30),fast=run(144);assert.equal(slow.steps,1440);assert.equal(fast.steps,1440);
 for(let i=0;i<slow.positions.length;i++)assert.ok(Math.abs(slow.positions[i]-fast.positions[i])<1e-5);
});

test('freeze and hidden gaps do not advance or queue sphere physics',()=>{
 const world=new AerialPhysics();world.update(1);world.update(1.1,{bass:1});
 const snapshot=world.rendered.slice(),steps=world.steps;
 for(let i=0;i<300;i++)assert.deepEqual(world.update(1.1,{drums:1}),snapshot);
 assert.equal(world.steps,steps);world.update(90);assert.equal(world.steps,steps);
 world.suspend();world.update(900);assert.equal(world.steps,steps);
 world.update(900+1/60);assert.equal(world.steps,steps+2);
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
    for(let k=i+1;k<count;k++){if(i<4&&k<4)continue;const a=k*4;assert.ok(Math.hypot(p[j]-p[a],p[j+1]-p[a+1],p[j+2]-p[a+2])>=(r+p[a+3])*.94);}
   }
  }
 }
});

test('collisions separate coincident centers and transfer motion by mass',()=>{
 const world=new AerialPhysics(8),p=world.positions;
 for(let i=0;i<8;i++)p.set([-2.8+i*.04,2,0,.01],i*4);
 p.set([0,0,0,1],16);p.set([.3,0,0,.2],20);world.velocities[15]=-1;
 world.update(0);world.update(1/60);
 assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[20]-p[16])>1.1);
 assert.ok(Math.abs(p[20])>Math.abs(p[16])*4);assert.ok(world.velocities[15]>0);
 p[20]=p[16];p[21]=p[17];p[22]=p[18];world.velocities.fill(0);world.update(2/60);assert.ok(p.every(Number.isFinite));
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


test('liquid lobes genuinely overlap and separate while solid bodies retain contacts',()=>{
 const w=new AerialPhysics();w.update(0);let closest=10,farthest=0;
 for(let i=1;i<=2400;i++){
  w.update(i/120,{bass:(1+Math.sin(i*.011))*.5,lead:.8,drums:i%60<4?1:0});
  const p=w.positions,ratio=Math.hypot(p[0]-p[4],p[1]-p[5],p[2]-p[6])/(p[3]+p[7]);closest=Math.min(closest,ratio);farthest=Math.max(farthest,ratio);
 }
 assert.ok(closest<.7);assert.ok(farthest>1.3);
});

test('a sustained percussion envelope fires once; separate attacks rearm and beat amount controls impulse',()=>{
 const held=new AerialPhysics();held.update(0);for(let i=1;i<=240;i++)held.update(i/120,{drums:1});assert.equal(held.hits,1);
 for(let i=241;i<=300;i++)held.update(i/120,{});held.update(301/120,{onset:1});assert.equal(held.hits,2);
 const impulse=beat=>{const w=new AerialPhysics();w.update(0);w.update(1/120,{drums:1},{beat});return w.velocities.reduce((s,x)=>s+Math.abs(x),0);};assert.ok(impulse(1)>impulse(0)*8);
});

test('reduced motion holds physics and track reset removes accumulated impulses',()=>{
 const w=new AerialPhysics();w.update(0);w.update(.1,{drums:1});const steps=w.steps,p=w.rendered.slice();
 for(let i=1;i<=60;i++)w.update(.1+i/60,{bass:1,drums:1},{reduced:true});assert.equal(w.steps,steps);assert.deepEqual(w.rendered,p);
 w.update(1.1+1/60);assert.equal(w.steps,steps+2);w.reset();assert.equal(w.hits,0);assert.equal(w.time,0);assert.deepEqual(w.positions,new AerialPhysics().positions);
});


test('zero merging makes central lobes collide as solid bodies',()=>{
 const w=new AerialPhysics();w.update(0);for(let i=1;i<=1200;i++)w.update(i/120,{bass:.5,lead:.6,drums:i%60<4?1:0},{liquid:0});
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const p=w.positions,a=i*4,b=j*4;assert.ok(Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2])>=(p[a+3]+p[b+3])*.97);}
});
