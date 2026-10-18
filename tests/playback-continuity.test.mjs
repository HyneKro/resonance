import test from 'node:test';import assert from 'node:assert/strict';
import {VisualSyncBuffer} from '../public/visual-sync.js';
import {AudioFeatures} from '../public/analysis.js';
import {VisualConductor} from '../public/visual-conductor.js';
import {DanceMotion,CompanionClock,CompanionPlayback} from '../public/companion-motion.js';
import {CompanionRenderer} from '../public/companion-renderer.js';
import {Reactor} from '../public/reactor.js';

test('device latency jitter never turns continuous audio into pauses or extra shape pulses',()=>{
 const delayed=new VisualSyncBuffer(),reference=new VisualSyncBuffer(),f=new AudioFeatures(),a=new VisualConductor(),b=new VisualConductor();
 f.db=-20;f.bands.fill(.7);f.timbreBands.fill(.7);f.loudness=.8;reference.setDelay(192);
 for(let i=0;i<60*30;i++){
  if(i%30===0)delayed.setDelay(180+(i%60===0?12:-12));
  const t=i*1000/60,x=delayed.process(f,true,t),y=reference.process(f,true,t);
  const u=a.update(x,1/60,{active:delayed.active,responsiveness:2.5}),v=b.update(y,1/60,{active:reference.active,responsiveness:2.5});
  if(i>60){assert.equal(delayed.active,true);assert.equal(x.db,-20);assert.ok(Math.abs(u.loudness-v.loudness)<1e-7);}
 }
});
test('fractional delay interpolates the original measurements without gain changes or repeated hits',()=>{
 const buffer=new VisualSyncBuffer(),f=new AudioFeatures();buffer.setDelay(137);let hits=0;
 for(let i=0;i<180;i++){
  const time=i*1000/60;f.db=-50+time/1000;f.loudness=time/10000;f.bands.fill(time/10000);f.hits[0]=i===24?1:0;
  const out=buffer.process(f,true,time);hits+=out.hits[0];
  if(time>=137){assert.ok(Math.abs(out.loudness-(time-137)/10000)<1e-7);assert.ok(Math.abs(out.db-(-50+(time-137)/1000))<1e-7);}
 }
 assert.equal(hits,1);
});
test('offset edits keep their history and a monotonic read position through brief rendering stalls',()=>{
 const b=new VisualSyncBuffer(),f=new AudioFeatures();f.db=-24;let previous=-Infinity,hits=0;
 for(let i=0;i<600;i++){
  if(i===90)b.setDelay(400);if(i===300)b.setDelay(20);
  const time=i*16+(i>=400?350:0);f.hits[0]=i%80===0?1:0;const out=b.process(f,true,time);
  assert.equal(b.active,true);assert.equal(out.db,-24);assert.ok(b.readTime>=previous);previous=b.readTime;hits+=out.hits[0];
 }
 assert.equal(hits,8);
});
test('updating the device estimate preserves the established live beat tracker',()=>{
 const old=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});
 try{const r=new Reactor({paused:false});r.context={outputLatency:.18,baseLatency:.01};r.tempo.bpm=123;r.tempo.confidence=.9;r.refreshVisualSync(true,0);r.context.outputLatency=.2;r.refreshVisualSync(true,500);assert.equal(r.tempo.bpm,123);assert.equal(r.tempo.confidence,.9);}finally{globalThis.matchMedia=old;}
});
test('Sona delays genuine playback edges, never rhythm or analyser-buffer resets',()=>{
 const p=new CompanionPlayback();assert.equal(p.update(true,180,0),false);assert.equal(p.update(true,200,100),false);assert.equal(p.update(true,150,180),true);
 for(let t=181;t<10000;t+=17)assert.equal(p.update(true,t%500,t),true);
 assert.equal(p.update(false,180,10000),true);assert.equal(p.update(false,220,10180),false);
 assert.equal(p.update(true,0,10200),true);p.update(false,200,10300);assert.equal(p.update(true,200,10350),true);assert.equal(p.update(true,200,10600),true);
});
test('Sona shows every pose in order through irregular frames, without a catch-up burst',()=>{
 const clock=new CompanionClock(),motion=new DanceMotion();motion.setAppearance('sona');let t=0,previous,changes=0;
 const order=motion.routines.flatMap(name=>Array.from({length:3},()=>{const clip=motion.clips[name];return (clip.frames||[0,1,2,3,4,5,6,7]).map(frame=>clip.row+':'+frame);}).flat());
 const expected=order.filter((f,i)=>i===0||f!==order[i-1]);let cursor=0;
 for(let i=0;i<24000;i++){
  t+=i%137===0?280:i%31===0?95:1000/165;const dt=clock.step(t);if(dt===null)continue;
  assert.ok(dt<=1/24);const f=motion.update(dt,{active:true});
  const key=f.row+':'+f.frame;
  if(key!==previous){assert.equal(key,expected[cursor++%expected.length]);if(previous)changes++;}
  previous=key;
 }
 assert.ok(changes>500);
});
test('changing Sona hair colours reuses bounded paint surfaces instead of rebuilding a cache every frame',()=>{
 const old=globalThis.document;let surfaces=0,images=0,paints=0;
 const context={createImageData:()=>{images++;return {data:new Uint8ClampedArray(4)};},putImageData(){paints++;}};
 globalThis.document={createElement(){surfaces++;return {getContext:()=>context};}};
 try{
  const r=new CompanionRenderer({getContext:()=>context});r.size=1;r.frame=()=>({data:new Uint8ClampedArray([180,80,220,255])});
  for(let i=0;i<1000;i++){const colors=[[100+i%100,160,200],[160,100,200]];r.painted(Math.floor(i/8)%13,i%8,colors);}
  assert.equal(surfaces,16);assert.equal(images,16);assert.equal(r.tints.size,16);assert.equal(paints,1000);
 }finally{globalThis.document=old;}
});
