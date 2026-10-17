import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {AtmosphereDrift,AtmosphereTransition} from '../public/atmosphere-transition.js';
import {Reactor} from '../public/reactor.js';

const identity=n=>({signature:Array(4).fill(n),character:Array(4).fill(n),themes:Array(6).fill(n),recipe:Array(8).fill(n)});
const rate=recipe=>.55+recipe*.85;

test('a new song changes future drift speed, never its accumulated position',()=>{
 for(const age of [0,60,7200,43200,172800]){
  const drift=new AtmosphereDrift();
  assert.equal(drift.update(age,.491),age*rate(.491));
  const before=drift.position;
  assert.equal(drift.update(age,.509),before);
  const moved=drift.update(age+1/60,.509)-before;
  assert.ok(Math.abs(moved-rate(.509)/60)<1e-10);
 }
});

test('short fluid transitions cover the same distance after minutes, hours and days',()=>{
 for(const fps of [30,60,165]){
  let first;
  for(const age of [0,60,7200,43200,172800]){
   const transition=new AtmosphereTransition(),drift=new AtmosphereDrift();
   let frame=transition.update(identity(0),[],0);
   const phase=()=>drift.position+frame.identity.signature[0]*33*rate(frame.identity.recipe[4]);
   drift.update(age,frame.identity.recipe[4]);
   const start=phase(),travel=[];
   for(let i=1;i<=fps*2;i++){
    frame=transition.update(identity(1),[],1/fps);
    drift.update(age+i/fps,frame.identity.recipe[4]);
    travel.push((phase()-start)*.067);
   }
   assert.ok(travel.at(-1)<.2,'keep the existing short travel');
   if(!first)first=travel;
   else for(let i=0;i<travel.length;i++)assert.ok(Math.abs(travel[i]-first[i])<1e-10,'transition must not scale with session age');
  }
 }
});

test('hundreds of track changes integrate forward without growing transition jumps',()=>{
 const drift=new AtmosphereDrift();let time=0,expected=0,previous=.491;
 drift.update(time,previous);
 for(let song=0;song<800;song++){
  time+=180;expected+=180*rate(previous);
  assert.ok(Math.abs(drift.update(time,previous)-expected)<1e-7);
  const next=song%2?.491:.509;
  assert.ok(Math.abs(drift.update(time,next)-expected)<1e-7);
  previous=next;
 }
});

test('drift stays still during freeze and does not rewind when a clock restarts',()=>{
 const drift=new AtmosphereDrift();drift.update(20,.5);
 const before=drift.update(21,.5);
 for(let i=0;i<600;i++)assert.equal(drift.update(21,.5),before);
 assert.equal(drift.update(0,.5),before);
 assert.ok(Math.abs(drift.update(1,.5)-before-rate(.5))<1e-12);
});

test('reactor owns drift through graphics replacement and honors freeze and reduced motion',()=>{
 const saved=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});
 try{
  const reactor=new Reactor({paused:true,ended:false});reactor.backgroundClock=43200;
  const initial=reactor.visualState(0);
  const drift=reactor.backgroundDrift;
  reactor.gpu={};reactor.backgroundClock+=1;
  const later=reactor.visualState(0);
  assert.equal(reactor.backgroundDrift,drift);
  assert.ok(later.backgroundDriftClock-initial.backgroundDriftClock<1.1);
  for(const key of ['frozen','reduced']){
   reactor[key]=true;
   const held=reactor.visualState(.1);
   assert.equal(held.backgroundClock,later.backgroundClock);
   assert.equal(held.backgroundDriftClock,later.backgroundDriftClock);
   reactor[key]=false;
  }
  // Disabling character/dynamic deformation must not halt ambient drift.
  reactor.dynamicVisuals=false;
  assert.ok(reactor.visualState(.1).backgroundDriftClock>later.backgroundDriftClock);
 }finally{if(saved===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=saved;}
});

test('Android uses the same corrected background clock and shader as desktop',async()=>{
 for(const file of ['atmosphere-transition.js','reactor.js','gpu-scene.js','nebula-live.js'])
  assert.equal(await fs.readFile(new URL('../public/'+file,import.meta.url),'utf8'),await fs.readFile(new URL('../android/shared/'+file,import.meta.url),'utf8'),file);
});
