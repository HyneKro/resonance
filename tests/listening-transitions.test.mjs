import test from 'node:test';
import assert from 'node:assert/strict';
import {TrackLevel,SongDirector,directedAppearance} from '../public/song-analysis.js';
import {skippedEdges} from '../public/listening-timeline.js';
import {ListeningEnhancements} from '../public/listening-enhancements.js';
import {Reactor} from '../public/reactor.js';
import {CharacterMixer,createTrackCharacter} from '../public/track-character.js';
import {visualDefaults} from '../public/visual-settings.js';

const loud={integratedLufs:-8,truePeakDb:0},quiet={integratedLufs:-21,truePeakDb:-8};
test('leveling uses a stable per-play gain, applies cached levels before playback, and honors deliberate toggles',()=>{
 const level=new TrackLevel();assert.equal(level.select(loud,true),-8);
 assert.equal(level.update(null,true),-8);assert.equal(level.update(quiet,true),-8);
 assert.equal(level.select(quiet,true),5);assert.equal(level.update(quiet,false),0);
 assert.equal(level.update(quiet,true),5);assert.equal(level.select(null,true),0);
 assert.equal(level.update(loud,true),0);assert.equal(level.select(loud,true),-8);
});
test('async analysis and edit refresh never reset the current gain or change it halfway through a song',async()=>{
 let result=loud;const gains=[],audio={paused:true,duration:90,addEventListener(){}},reactor={setPlaybackGain:(db,options)=>gains.push([db,options]),setTransitionGain(){}};
 const c=new ListeningEnhancements({audio,reactor,api:async()=>({profile:result}),getTrack:()=>c.track,getPreferences:()=>({leveling:true,autoDirection:false}),next(){}});
 await c.select({id:'a'});assert.deepEqual(gains[0],[-8,{immediate:true}]);assert.ok(gains.every(([db])=>db===-8));
 audio.paused=false;result=quiet;await c.load(false);assert.equal(gains.at(-1)[0],-8);
 audio.paused=true;await c.select({id:'b'});assert.deepEqual(gains.at(-2),[5,{immediate:true}]);assert.ok(!gains.some(([db])=>db===0));
});
test('audio gain automation never stacks repeated targets and new tracks start at their measured level',()=>{
 const calls=[],param={value:1,cancelScheduledValues:t=>calls.push(['cancel',t]),cancelAndHoldAtTime:t=>calls.push(['hold',t]),setValueAtTime(v,t){this.value=v;calls.push(['set',v,t]);},setTargetAtTime:(v,t,s)=>calls.push(['target',v,t,s])},r={context:{currentTime:8,createGain:()=>({gain:param})}};
 const set=(db,options)=>Reactor.prototype.setPlaybackGain.call(r,db,options);set(-8,{immediate:true});assert.equal(calls.at(-1)[0],'set');const count=calls.length;set(-8);set(-8);assert.equal(calls.length,count);
 set(0);assert.equal(calls.at(-2)[0],'hold');assert.equal(calls.at(-1)[0],'target');set(5,{immediate:true});assert.deepEqual(calls.at(-1),['set',10**(5/20),8]);
});
const map=energy=>({duration:100,step:1,timeline:Array.from({length:100},(_,t)=>[t,-20,energy??(t<40?.05:.95),t<40?.1:.9,t<40?.1:.8])});
test('analysis arrival, absence, toggles and seeks blend all visual controls without a discontinuity',()=>{
 for(const fps of [30,60,165]){
  const director=new SongDirector(),profile=map(),base=visualDefaults();let previous=directedAppearance(base,director.update(null,0,0)),lastMix=0;
  for(let i=0;i<fps*18;i++){
   const seconds=i/fps,p=seconds<2||seconds>10&&seconds<10.1?null:profile,enabled=seconds<14;
   const d=director.update(p,seconds<6?3:85,1/fps,{enabled}),appearance=directedAppearance(base,d);
   assert.ok(Math.abs(d.mix-lastMix)<.05);lastMix=d.mix;
   for(const key of ['particleSpread','filigree','glow','bloom','motionAmount','textureDetail','turbulence'])assert.ok(Math.abs(appearance[key]-previous[key])<.035,`${fps}fps ${key}: no snap`);
   assert.ok(appearance.turbulence>=base.turbulence*.96-.00001&&appearance.turbulence<=base.turbulence*1.04+.00001);previous=appearance;
  }
 }
});
test('scrubbing waits for a settled chapter and missing analysis retains the current form',()=>{
 const d=new SongDirector(),p=map(),c=new CharacterMixer();c.select(createTrackCharacter({id:'a',genre:'Ambient'}),'one');let direction;
 for(let i=0;i<120;i++){direction=d.update(p,2,1/60);c.update(1/60,{direction});}
 const chapter=direction.chapter;assert.equal(chapter.kind,'Suspended');
 for(let i=0;i<24;i++){direction=d.update(p,i%2?80:1,1/60);assert.equal(direction.chapter,chapter);}
 direction=d.update(null,80,.016);assert.equal(direction.chapter,chapter);
 for(let i=0;i<60;i++)direction=d.update(p,80,1/60);assert.equal(direction.chapter.kind,'Expansive');
 const paused=d.update(p,1,.1,{frozen:true});assert.equal(paused.energy,direction.energy);assert.equal(paused.mix,direction.mix);
});
test('timeline shows exact automatic or manual skipped edges and clears them when bypassed',()=>{
 const profile={duration:80,trim:{start:2.7,end:76.3}};
 assert.deepEqual(skippedEdges(80,null,profile,false).segments,[]);
 const auto=skippedEdges(80,null,profile,true);assert.deepEqual(auto.segments,[{start:0,end:2.7},{start:76.3,end:80}]);assert.equal(auto.label,'Silent edges · skipping 0:00–0:02.7 & 1:16.3–1:20');
 const manual=skippedEdges(80,{enabled:true,start:12,end:80},profile,true);assert.deepEqual(manual.segments,[{start:0,end:12}]);assert.match(manual.label,/Listening edit/);
 assert.equal(skippedEdges(NaN,null,null,true).label,'');assert.equal(skippedEdges(80,{enabled:true,start:0,end:80},profile,true).label,'');
});
test('seeking clears audio history without zeroing the visible sculpture envelopes',()=>{
 const original=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});
 try{const r=new Reactor({paused:false,ended:false});r.roles.output={bass:.7,lead:.4,drums:.2,texture:.6,shimmer:.3};r.roles.previous={bass:.8};r.tempo.phase=12.25;r.tempo.pulse=.6;r.tempo.bpm=140;
 const roles={...r.roles.output};r.resetAnalysis();assert.deepEqual(r.roles.output,roles);assert.deepEqual(r.roles.previous,{});assert.equal(r.tempo.output.phase,12.25);assert.equal(r.tempo.output.pulse,.6);assert.equal(r.tempo.output.bpm,0);assert.equal(r.features.loudness,0);
 }finally{globalThis.matchMedia=original;}
});
