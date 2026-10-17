import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {AtmosphereTransition,nearbyAtmosphere} from '../public/atmosphere-transition.js';
import {SculptureMorph} from '../public/sculpture-forms.js';
import {spectralEnvelope} from '../public/analysis.js';
import {TempoTracker} from '../public/tempo.js';import {DanceMotion} from '../public/dance-companion.js';
import {createTrackSearch} from '../track-search.mjs';import {findExactLyrics,createLyricsReader,lyricKey} from '../track-lyrics.mjs';
import {Library} from '../library.mjs';import {startServer} from '../server.mjs';
const identity=n=>({signature:Array(4).fill(n),character:Array(4).fill(n),themes:Array(6).fill(n),recipe:Array(8).fill(n)});
test('short fluid travel is continuous, frame independent, settles quickly and remains bounded during rapid skips',()=>{
 const outputs=[];for(const fps of [30,60,165]){const m=new AtmosphereTransition(),a=identity(0),b=identity(1),colors=[[1,0,0]];let old=m.update(a,colors,0),first=m.update(b,colors,1/fps);assert.ok(first.identity.recipe[0]-old.identity.recipe[0]<.0003);
  for(let i=1;i<fps*2;i++)first=m.update(b,colors,1/fps);assert.ok(Math.abs(first.identity.recipe[0]-.509)<.00001);assert.strictEqual(first.colors,colors);assert.strictEqual(m.update(a,[],.1,{frozen:true}),first);outputs.push(first.identity.recipe[0]);
  for(let i=0;i<1000;i++){const out=m.update(identity(i%2),colors,1/fps);assert.ok(out.identity.recipe.every(x=>x>=.491&&x<=.509));}assert.deepEqual(m.update(a,colors,.1,{reduced:true}).identity,nearbyAtmosphere(a));
 }assert.ok(Math.max(...outputs)-Math.min(...outputs)<1e-8);
});
test('all 24 by 24 sculpture transitions keep source and destination recipes fixed',()=>{
 for(let a=0;a<24;a++)for(let b=0;b<24;b++){const m=new SculptureMorph(),one=[.1,.2,.3,.4],two=[.8,.7,.6,.5];m.update(a,0,{signature:one});m.update(b,.01,{signature:two});for(let i=0;i<30;i++)m.update(b,.1,{signature:two});assert.deepEqual(m.fromSignature,one);assert.deepEqual(m.toSignature,two);assert.ok(m.progress>.7&&m.progress<1);}
});
test('spectral envelopes preserve fast attacks and frame independent release',()=>{
 const release=[];for(const fps of [30,60,165]){let x=.2;for(let i=0;i<fps;i++)x=spectralEnvelope(x,0,1/fps,.5);release.push(x);}assert.ok(Math.max(...release)-Math.min(...release)<1e-12);assert.ok(spectralEnvelope(0,.2,1/60)>.15);
});
test('beat motion rejects irregular attacks and does not jump tempo on percussion bursts',()=>{
 const tracker=new TempoTracker();let seed=817,next=0,maxPulse=0;for(let i=0;i<120*35;i++){const now=i/120;let hit=0;if(now>=next){seed=(seed*1664525+1013904223)>>>0;next=now+.25+seed/2**32*.9;hit=1;}maxPulse=Math.max(maxPulse,tracker.update(1/120,[hit,0,.8*hit]).pulse);}assert.ok(maxPulse<.25,`random pulse ${maxPulse}`);
 const steady=new TempoTracker();let maxDelta=0,previous=0;for(let i=0;i<120*35;i++){const hit=i%60===0?1:i>2400&&i%31===0?.8:0;const out=steady.update(1/120,[hit,0,0]);if(previous)maxDelta=Math.max(maxDelta,Math.abs(out.bpm-previous));previous=out.bpm;}assert.ok(maxDelta<=3/120+.000001);assert.ok(Math.abs(steady.bpm-120)<3);
});
test('dance loops vary at a fixed pace, idle on pause and obey reduced motion',()=>{
 const d=new DanceMotion(),phrases=new Set();let old=d.bpm;for(let i=0;i<6000;i++){const o=d.update(1/60,{active:true,bpm:174,confidence:1});phrases.add(o.name);assert.ok(Math.abs(o.bpm-old)<.6);old=o.bpm;}assert.ok(phrases.size>=6);assert.equal(d.bpm,100);const beats=d.beats;for(const state of [{active:false},{active:true,reduced:true},{active:true,frozen:true}]){const o=d.update(.1,state);assert.equal(d.beats,beats);assert.ok(Object.values(o.pose).every(Number.isFinite));}
});
const track={id:'t',title:'Tidal (Official Audio)',artist:'Artist',album:'',duration:180,path:path.resolve('test-output/missing-audio.mp3'),available:false};
const lyric={id:42,trackName:'Tidal',artistName:'Artist',albumName:'Waves',duration:181,plainLyrics:'Ocean waves'};
function memory(){const values=new Map();return {tracks:new Map([['t',{...track}]]),getSetting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v),candidates:async()=>[{id:'record',title:'Tidal',artist:'Artist',album:'Waves',confidence:100}],applyCandidate:async(id,c,automatic,selected)=>selected};}
test('fresh detail search preserves partial results, exact candidates and explicit offline lyric choices',async()=>{
 const lib=memory(),search=createTrackSearch(lib,{json:async()=>[lyric,{...lyric,id:43,trackName:'Tidal live',duration:205}]});const found=await search.search('t');assert.equal(found.lyrics.length,2);assert.ok(found.lyrics[0].confidence>found.lyrics[1].confidence);
 const chosen=await search.apply('t',{request:found.request,kind:'lyrics',candidateId:'42'});assert.equal(chosen.confirmed,true);assert.equal(chosen.text,lyric.plainLyrics);const read=createLyricsReader(lib,{json:async()=>{throw Error('Must remain offline');}});assert.equal((await read('t')).text,lyric.plainLyrics);
 await assert.rejects(search.apply('t',{request:found.request,kind:'lyrics',candidateId:'900'}),/Choose/);
 lib.tracks.set('t',{...track,title:'Edited'});await assert.rejects(search.apply('t',{request:found.request,kind:'recording',candidateId:'record'}),/out of date/);
 const partial=await createTrackSearch(memory(),{json:async()=>{throw Error('offline');}}).search('t');assert.equal(partial.recordings.length,1);assert.match(partial.errors[0],/LRCLIB: offline/);
});
test('automatic lyric search falls back to catalogue results while rejecting wrong recordings',async()=>{
 const calls=[],json=async url=>{calls.push(url);return url.includes('/search?')?[{...lyric,id:2,trackName:'Tidal live'},lyric]:null;};assert.equal((await findExactLyrics(track,json)).id,42);assert.equal(calls.length,2);
 assert.equal(await findExactLyrics({...track,duration:250},json),null);
});
test('manual lyric choice wins over an automatic lookup already in flight',async()=>{
 const lib=memory();let release,started;const ready=new Promise(r=>started=r),network=new Promise(r=>release=r),reader=createLyricsReader(lib,{json:async()=>{started();return network;}}),loading=reader('t');await ready;
 lib.setSetting('trackLyrics:t',{stamp:lyricKey(track),confirmed:true,text:'My chosen lyrics'});release(lyric);assert.equal((await loading).text,'My chosen lyrics');assert.equal(lib.getSetting('trackLyrics:t').confirmed,true);
});
test('genre completion, fresh retries, protected edits and missing metadata save accurately',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/discovery-')),lib=new Library(process.cwd(),dir);try{
  const current={...track,available:true,genre:'',genreResearchVersion:5,genreLocalVersion:1,genreCheckedAt:Date.now(),genreArtistAt:Date.now(),metadataStatus:'embedded'};lib.save(current);let calls=0;lib.genres.artistEvidence=async()=>{calls++;return [];};lib.genres.discoverTrack=async id=>{calls++;return lib.tracks.get(id);};
  await lib.genres.start();assert.equal(lib.genres.job.total,0);assert.match(lib.genres.job.message,/already been checked/);lib.genres.stop();assert.equal(lib.genres.job.stop,false);
  await lib.genres.start({retryMissing:true});assert.equal(calls,2);assert.equal(lib.genres.job.found,0);assert.match(lib.genres.job.message,/Finished/);
  const saved=await lib.applyCandidate('t','c',true,{id:'c',title:'Tidal',artist:'Artist',album:'Waves',date:'2020',releaseIds:[],sourceUrl:'https://musicbrainz.org/recording/c'});assert.equal(saved.album,'Waves');assert.equal(saved.date,'2020');assert.equal(saved.title,current.title);
  lib.save({...saved,metadataStatus:'manual',album:'Mine'});await lib.applyCandidate('t','c',true,{id:'c',album:'Override',releaseIds:[]});assert.equal(lib.tracks.get('t').album,'Mine');
 }finally{lib.close();}
});
test('new search endpoints require local auth and bonus assets/preferences are available',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/refinement-api-')),app=await startServer({port:0,dataDir:dir,autoScan:false});try{
  for(const route of ['/api/track-search','/api/track-search/apply']){const r=await fetch(app.url+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);}
  for(const file of ['dance-companion.js','dancer-sprite-v2.png'])assert.equal((await fetch(app.url+'/'+file)).status,200,file);
  const cfg=await (await fetch(app.url+'/api/config',{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify({preferences:{kaleidoscope:true,oscilloscope:.8,danceCompanion:true}})})).json();assert.equal(cfg.preferences.kaleidoscope,true);assert.equal(cfg.preferences.oscilloscope,undefined);assert.equal(cfg.preferences.danceCompanion,true);
  assert.equal((await fetch(app.url+'/oscilloscope.js')).status,404);
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
