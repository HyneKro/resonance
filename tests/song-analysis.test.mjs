import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ProfileReader,levelingDb,playbackRange,validateRange,SongDirector,songChapters} from '../public/song-analysis.js';
import {CharacterMixer,createTrackCharacter} from '../public/track-character.js';
import {analyzeFile,AudioResearch,audioStamp} from '../audio-research.mjs';
import {ListeningEnhancements,needsSongAnalysis} from '../public/listening-enhancements.js';

test('leveling preserves dynamics, limits boosts and leaves headroom for measured true peaks',()=>{
 assert.equal(levelingDb({integratedLufs:-23,truePeakDb:-10},true),7);
 assert.equal(levelingDb({integratedLufs:-8,truePeakDb:0},true),-8);
 assert.equal(levelingDb({integratedLufs:-25,truePeakDb:-2},true),1);
 for(const p of [null,{}, {integratedLufs:null,truePeakDb:-100},{integratedLufs:-70,truePeakDb:-100}])assert.equal(levelingDb(p,true),0);
 assert.equal(levelingDb({integratedLufs:-8,truePeakDb:0},false),0);
});
test('listening cuts validate bounds, retain internal passages and can be completely bypassed',()=>{
 const profile={duration:100,trim:{start:3,end:96}};
 assert.deepEqual(playbackRange(100,null,profile,false),{start:0,end:100});
 assert.deepEqual(playbackRange(100,null,profile,true),{start:3,end:96});
 assert.deepEqual(playbackRange(100,{enabled:true,start:15,end:90},profile,true),{start:15,end:90});
 for(const x of [{start:-1,end:90},{start:40,end:40.5},{start:0,end:101},{start:NaN,end:99}])assert.throws(()=>validateRange(x,100));
 assert.deepEqual(validateRange({enabled:false},100),{enabled:false,start:0,end:100});
 assert.equal(needsSongAnalysis({musicOnly:true,autoDirection:true}),false);
 assert.equal(needsSongAnalysis({musicOnly:true,leveling:true}),true);
});
test('streaming parser bounds memory and handles unknown-duration long files and silence',()=>{
 const p=new ProfileReader();p.line('frame:0 pts:0 pts_time:0');p.line('lavfi.astats.1.RMS_level=-inf');p.line('lavfi.r128.I=-70');p.line('frame:1 pts:0 pts_time:20000');p.line('lavfi.astats.1.RMS_level=-10');const result=p.finish();
 assert.equal(result.timeline.length,1);assert.equal(result.duration,20000.1);assert.equal(result.integratedLufs,null);assert.equal(result.timeline[0][4],0);assert.equal(result.trim.start,0);
});

function wave(amplitude){const rate=22050,seconds=12,bytes=rate*seconds*2,b=Buffer.alloc(44+bytes);b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);for(let i=0;i<rate*seconds;i++){const t=i/rate,active=t>=2.5&&t<8.5;b.writeInt16LE(active?Math.round(Math.sin(t*2*Math.PI*440)*amplitude*32767):0,44+i*2);}return b;}
test('real FFmpeg analysis measures loudness differences and keeps audible edges without touching files',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/song-analysis-'));const profiles=[];
 for(const amplitude of [.1,.5]){const file=path.join(dir,'tone-'+amplitude+'.wav'),data=wave(amplitude);await fs.writeFile(file,data);const before=createHash('sha256').update(data).digest('hex');const p=await analyzeFile(file,{duration:12,executable:path.resolve('tools/ffmpeg.exe')});profiles.push(p);assert.ok(p.trim.start>0&&p.trim.start<=2.5);assert.ok(p.trim.end>=8.5&&p.trim.end<12);assert.ok(p.timeline.length<=13);assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),before);}
 assert.ok(Math.abs((profiles[1].integratedLufs-profiles[0].integratedLufs)-20*Math.log10(5))<.2);
 assert.ok(Math.abs(profiles[1].truePeakDb-20*Math.log10(.5))<.15);
});

test('whole-file normalization matches independently measured outputs, including a very quiet master',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/normalized-audio-')),results=[];
 for(const amplitude of [.02,.65]){
  const input=path.join(dir,'input-'+amplitude+'.wav'),data=wave(amplitude);await fs.writeFile(input,data);
  const original=await analyzeFile(input,{duration:12,executable:path.resolve('tools/ffmpeg.exe')}),gain=10**(levelingDb(original,true)/20),adjusted=Buffer.from(data);
  for(let i=44;i<adjusted.length;i+=2){const value=Math.round(data.readInt16LE(i)*gain);assert.ok(Math.abs(value)<32768);adjusted.writeInt16LE(value,i);}
  const output=path.join(dir,'matched-'+amplitude+'.wav');await fs.writeFile(output,adjusted);
  const measured=await analyzeFile(output,{duration:12,executable:path.resolve('tools/ffmpeg.exe')});results.push(measured.integratedLufs);assert.ok(Math.abs(measured.integratedLufs+16)<.12);assert.ok(measured.truePeakDb<=-1);
 }
 assert.ok(Math.abs(results[0]-results[1])<.12);
});

test('song chapters drive related forms smoothly and never move the background identity',()=>{
 const profile={step:1,duration:80,timeline:Array.from({length:80},(_,t)=>[t,-20,t<40?.1:.9,.4,.2])};
 assert.deepEqual(songChapters(profile).map(c=>c.kind),['Suspended','Expansive']);
 const director=new SongDirector(),character=new CharacterMixer();character.select(createTrackCharacter({id:'a',genre:'Ambient'}),'one');let previous=director.update(profile,1,.016),background,shapes=new Set();
 for(let i=0;i<80*60;i++){const d=director.update(profile,i/60,1/60),c=character.update(1/60,{direction:d});assert.ok(Math.abs(d.energy-previous.energy)<.006);assert.ok(d.anticipation>=-1&&d.anticipation<=1);if(background)assert.deepEqual(c.backgroundTarget,background);background=c.backgroundTarget;shapes.add(c.sculpture[1]);previous=d;}
 assert.ok(shapes.size>=2);const frozen=director.update(profile,0,.1,{frozen:true});assert.equal(frozen.energy,previous.energy);assert.equal(director.update(profile,0,.1,{enabled:false}).available,false);
 const off=character.update(.1,{enabled:false,direction:previous});assert.equal(character.sculpture.to,-1);assert.ok(off.backgroundTarget.themes.every(x=>x===0));
});

test('cached analysis is reused, serialized, invalidated for changed files and retryable',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/profile-cache-')),file=path.join(dir,'file');await fs.writeFile(file,'fixture');const values=new Map(),t={id:'a',path:file,size:7,duration:2,available:true},lib={tracks:new Map([['a',t]]),root:dir,getSetting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v)},calls=[];let resolve;
 const service=new AudioResearch(lib,{decode:()=>{calls.push('run');return new Promise(r=>resolve=r);}});service.request('a');service.request('a');while(!resolve)await new Promise(r=>setTimeout(r,5));assert.equal(calls.length,1);resolve({version:1,duration:2});while(service.running)await new Promise(r=>setTimeout(r,10));assert.ok(service.read('a'));service.request('a');assert.equal(calls.length,1);t.size=8;assert.equal(service.read('a'),null);values.set('audioError:a',{stamp:audioStamp(t),message:'Not decodable'});assert.equal(service.status('a').error,'Not decodable');t.size=9;assert.equal(service.status('a').error,'');service.stop();
});

function controller(extra={}){const events={},audio={paused:false,seeking:false,currentTime:0,duration:100,addEventListener:(k,fn)=>events[k]=fn},reactor={setPlaybackGain(){},setTransitionGain(){},updateSongProfile(id,profile){this.songProfile=profile;}},prefs={autoDirection:false,crossfadeSeconds:0},calls=[];const c=new ListeningEnhancements({audio,reactor,getTrack:()=>({id:'a',duration:100}),getPreferences:()=>prefs,api:async()=>({profile:null,edit:{enabled:false}}),next:async seconds=>calls.push(seconds),...extra});return {c,audio,reactor,prefs,calls,events};}
test('natural ends belong to the player; cuts/crossfades advance once and respect pause, seek and album exclusions',async()=>{
 const {c,audio,prefs,calls}=controller();audio.currentTime=99.99;await c.tick();assert.deepEqual(calls,[]);
 c.edit={enabled:true,start:5,end:90};audio.currentTime=0;await c.tick();assert.equal(audio.currentTime,5);audio.currentTime=90;await c.tick();assert.deepEqual(calls,[0]);
 c.edit=null;prefs.crossfadeSeconds=4;audio.currentTime=96;await c.tick();assert.deepEqual(calls,[0,4]);c.canCrossfade=()=>false;await c.tick();assert.equal(calls.length,2);c.canCrossfade=()=>true;audio.paused=true;await c.tick();assert.equal(calls.length,2);audio.paused=false;audio.seeking=true;await c.tick();assert.equal(calls.length,2);
});
test('pending transition cannot advance twice, including while the next profile is loaded',async()=>{
 let finish;const {c,audio,prefs}=controller({next:()=>new Promise(r=>finish=r)});prefs.crossfadeSeconds=4;audio.currentTime=98;const p=c.tick();assert.ok(c.pending);await c.select({id:'b'});assert.ok(c.pending);await c.tick();finish();await p;assert.equal(c.pending,false);
});
test('late analysis results cannot replace the current track and music-only avoids new decoding',async()=>{
 let first;const requests=[];const {c,prefs,reactor}=controller({api:async(url,body)=>{requests.push(body);if(url.endsWith('a'))return new Promise(r=>first=r);return {profile:{integratedLufs:-20},edit:{enabled:false}};}});prefs.musicOnly=true;const a=c.select({id:'a'});await c.select({id:'b'});first({profile:{integratedLufs:-3}});await a;assert.equal(reactor.songProfile.integratedLufs,-20);assert.ok(requests.every(x=>x===undefined));
});

function fadeFixture(deferred=false){
 const f=controller(),parameters=[],nodes=[];const node=()=>{const param={value:1,setValueAtTime(v,t){this.value=v;parameters.push(['set',v,t]);},linearRampToValueAtTime(v,t){parameters.push(['ramp',v,t]);}};const n={gain:param,frequency:{value:100},Q:{value:1},connect(){},disconnect(){this.disconnected=true;}};nodes.push(n);return n;};
 const tail={src:'',volume:1,muted:false,duration:100,paused:true,load(){if(this.src&&!deferred)this.onloadedmetadata?.();},play:async function(){this.paused=false;},pause(){this.paused=true;},removeAttribute(){this.src='';}};
 f.audio.currentSrc='test.wav';f.audio.volume=.4;f.audio.muted=true;f.reactor.context={currentTime:10,destination:{},createGain:node,createMediaElementSource:node,createBiquadFilter:node};f.reactor.filters=[node()];f.reactor.eqValues=[-3];f.c.audioFactory=()=>tail;return {...f,tail,parameters,nodes};
}
test('crossfade copies volume, mute and EQ; outgoing ramp anchors at the current audio clock and is cleaned up',async()=>{
 const f=fadeFixture();assert.equal(await f.c.beginFade(2),true);assert.equal(f.tail.volume,.4);assert.equal(f.tail.muted,true);assert.equal(f.c.tail.filters[0].gain.value,-3);assert.equal(f.c.switching,true);f.c.finishFade(2);assert.deepEqual(f.parameters.slice(-2),[['set',1,10],['ramp',0,12]]);f.events.pause();assert.equal(f.tail.paused,true);assert.equal(f.tail.src,'');assert.equal(f.c.tail,null);assert.ok(f.nodes.slice(1).every(n=>n.disconnected));
});
test('pausing while the outgoing stream prepares cannot resurrect a cancelled crossfade',async()=>{
 const f=fadeFixture(true),pending=f.c.beginFade(2);f.audio.paused=true;f.events.pause();f.tail.onloadedmetadata();assert.equal(await pending,false);assert.equal(f.tail.paused,true);assert.equal(f.c.tail,null);assert.equal(f.c.switching,false);
});
