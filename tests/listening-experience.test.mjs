import test from 'node:test';
import assert from 'node:assert/strict';
import {DanceMotion} from '../public/companion-motion.js';
import {SONA_CLIPS} from '../public/companion-atlas.js';
import {compileSceneProgram} from '../public/shader-loader.js';
import {trustedRecording,wikidataGenres,catalogueGenre} from '../genre-research.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Library} from '../library.mjs';
import {Feedback,interactionSound} from '../public/feedback.js';

test('Sona completes three full loops before changing, despite tempo and energy changes',()=>{
 const m=new DanceMotion();let name='',began=0,changes=0;
 for(let i=0;i<24*160;i++){
  const f=m.update(1/24,{active:true,bpm:i%1000<500?80:165,confidence:1,loudness:i%200<100?.08:.8});
  if(f.name!==name){if(name){assert.ok(f.beats-began>=SONA_CLIPS[name].beats*3-1e-6);const loops=(m.routineStart-began)/SONA_CLIPS[name].beats;assert.ok(loops>=3&&Math.abs(loops-Math.round(loops))<1e-6);changes++;}began=m.routineStart;name=f.name;}
 }
 assert.ok(changes>10);m.pickUp();assert.equal(m.update(1/24,{active:true}).state,'pickup');
});
test('shader preparation yields until compilation is complete, and cancellation releases resources',async()=>{
 let polls=0,yields=0,deleted=0,linked=false;
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,INTERLEAVED_ATTRIBS:4,getExtension:()=>({COMPLETION_STATUS_KHR:5}),createProgram:()=>({}),createShader:()=>({}),shaderSource(){},compileShader(){},attachShader(){},transformFeedbackVaryings(){},linkProgram(){linked=true;},flush(){},getProgramParameter:(_p,key)=>key===5?++polls>=3:true,getProgramInfoLog:()=>'',deleteShader(){deleted++;},deleteProgram(){deleted++;}};
 await compileSceneProgram(gl,'v','f',null,{yieldWork:async()=>{yields++;}});assert.ok(linked);assert.equal(yields,5);assert.equal(deleted,2);
 await assert.rejects(compileSceneProgram(gl,'v','f',null,{cancelled:()=>true,yieldWork:async()=>{}}),/cancelled/);assert.equal(deleted,3);
});


test('deeper recording matching accepts missing durations but rejects mismatched recordings and remixes',()=>{
 const track={title:'A Song',artist:'An Artist'},c={id:'a',title:'A Song',artist:'An Artist',confidence:80};assert.equal(trustedRecording(track,[c]).id,'a');assert.equal(trustedRecording({...track,duration:220},[{...c,duration:260}]),null);assert.equal(trustedRecording({...track,rawTitle:'A Song (remix)'},[c]),null);
});
test('Wikidata genres follow only a linked entity and ignore deprecated statements',async()=>{
 const entity={relations:[{type:'wikidata',url:{resource:'https://www.wikidata.org/wiki/Q1'}}]},data={Q1:{claims:{P136:[{mainsnak:{datavalue:{value:{id:'Q2'}}}},{rank:'deprecated',mainsnak:{datavalue:{value:{id:'Q3'}}}}]}},Q2:{labels:{en:{value:'ambient'}}}};
 const evidence=await wikidataGenres(entity,async id=>({entities:{[id]:data[id]}}));assert.equal(evidence.length,1);assert.equal(evidence[0].scope,'artist');assert.equal(evidence[0].name,'ambient');assert.deepEqual(await wikidataGenres({relations:[{type:'wikidata',url:{resource:'https://invalid.test/Q1'}}]},()=>{throw Error('Should not fetch');}),[]);
});



test('catalogue genres require matching artist, version and length, and preserve provider evidence',async()=>{
 const t={id:'a',path:path.resolve('test-output/catalogue-fixture.wav'),title:'The Song',artist:'The Artist',duration:180,available:true},result={kind:'song',trackName:'The Song',artistName:'The Artist',trackTimeMillis:181000,primaryGenreName:'Electronic',trackViewUrl:'https://music.apple.com/us/album/a/123?i=456'};
 assert.equal(catalogueGenre(t,[result])[0].name,'Electronic');for(const patch of [{artistName:'Cover Artist'},{trackName:'The Song (Remix)'},{trackTimeMillis:240000},{trackViewUrl:'https://invalid.test/a'}])assert.deepEqual(catalogueGenre(t,[{...result,...patch}]),[]);
 const dir=await fs.mkdtemp(path.resolve('test-output/catalogue-')),lib=new Library(process.cwd(),dir);
 try{lib.save(t);lib.candidates=async()=>[];lib.genres.artistEvidence=async()=>{throw Error('Artist provider offline');};let calls=0;lib.genres.searchCatalogue=async()=>{calls++;return [result];};await lib.genres.discoverTrack('a');const saved=lib.tracks.get('a');assert.equal(saved.genre,'Electronic');assert.equal(saved.genreBasis,'track');assert.equal(saved.genreStatus,'partial');assert.match(saved.genreError,/offline/);await lib.genres.discoverTrack('a');assert.equal(calls,1);
  lib.save({...saved,genre:'My personal tag',genreLocked:true});await lib.genres.discoverTrack('a');assert.equal(lib.tracks.get('a').genre,'My personal tag');
 }finally{lib.close();}
});





test('startup signature respects sound preferences, mute, and music already playing',async()=>{
 const score=interactionSound('startup');assert.equal(score.tones.length,5);assert.ok(score.tones.every((t,i,a)=>i===0||t[1]>a[i-1][1]));
 for(const [enabled,muted,paused,volume]of [[false,false,true,1],[true,true,true,1],[true,false,false,1],[true,false,true,0]]){
  const feedback=Object.create(Feedback.prototype);Object.assign(feedback,{enabled,audio:{muted,paused,volume},unlock(){throw Error('Must not open an audio device');}});await feedback.startup();
 }
});
