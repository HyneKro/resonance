import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneCadence,projectSegment} from '../public/constellation-space.js';
import {VisualConductor} from '../public/visual-conductor.js';
import {SongDirector} from '../public/song-analysis.js';

test('desktop follows 60/120/144/165 Hz; phone caps keep their fractional remainder',()=>{
 for(const hz of [60,120,144,165])for(const fps of [0,30,10]){
  const cadence=new SceneCadence();let frames=0;
  for(let i=0;i<hz*10;i++)if(cadence.step(i*1000/hz,fps?1000/fps:0)!==null)frames++;
  assert.ok(Math.abs(frames-(fps||hz)*10)<=1,`${hz} Hz / ${fps||'native'}: ${frames}`);
  cadence.reset();assert.equal(cadence.step(100000),1/60);
 }
});
test('world connections clip at canvas edges, independently of UI-safe projection centre',()=>{
 const pose={yaw:0,pitch:0,zoom:1,center:[0,0,0]};
 const segment=projectSegment([0,-5000,0],[0,5000,0],pose,900,500,{top:200,clipWidth:1200,clipHeight:900});
 assert.ok(Math.abs(segment.a.y)<1e-8);assert.ok(Math.abs(segment.b.y-900)<1e-8);
 assert.equal(segment.a.x,450);assert.ok(segment.start>0&&segment.end<1);
 const behind=projectSegment([0,0,-2000],[100,0,200],pose,900,500,{top:200,clipWidth:1200,clipHeight:900});assert.ok(behind);assert.ok(Object.values(behind.a).every(Number.isFinite));
});
test('musical detail rejects low-level chatter, sustains notes and releases without strobing',()=>{
 const c=new VisualConductor(),f={db:-20,bands:new Float32Array(8).fill(.4),spectrum:new Float32Array(48).fill(.5),harmonic:new Float32Array(48),percussive:new Float32Array(48),accents:[0,0,0]};
 for(let i=0;i<60;i++){f.percussive[0]=i%2?.04:.01;c.update(f,1/60,{responsiveness:2.5});}assert.equal(c.percussive[0],0);
 f.harmonic[12]=.8;f.percussive[18]=.9;
 for(let i=0;i<12;i++)c.update(f,1/60,{responsiveness:2.5});
 assert.ok(c.harmonic[12]>.65);assert.ok(c.percussive[18]>.75);
 const previous=c.percussive[18];f.percussive[18]=0;c.update(f,1/60,{responsiveness:2.5});assert.ok(c.percussive[18]>previous*.8);
 for(let i=0;i<120;i++)c.update(f,1/60,{active:false});assert.ok(c.harmonic.every(x=>x<.001));assert.ok(c.percussive.every(x=>x<.001));
});
test('short forthcoming peaks are anticipated; seeking does not inject a fresh impulse',()=>{
 const profile={step:.5,duration:30,timeline:Array.from({length:60},(_,i)=>[i*.5,-20,i>=20&&i<24?.9:.1,.4,.2])},d=new SongDirector();let before;
 for(let i=0;i<9*60;i++)before=d.update(profile,i/60,1/60);
 assert.ok(before.anticipation>.35,'a two-second peak is visible before it arrives');
 const after=d.update(profile,22,1/60);assert.ok(Math.abs(after.anticipation-before.anticipation)<.02);
 const held=d.update(profile,22,.1,{frozen:true});assert.equal(held.anticipation,after.anticipation);
});
