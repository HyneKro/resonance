import {GENRE_RESEARCH_VERSION} from '../genre-research.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Library } from '../library.mjs';
import { canonicalGenre, providerGenres, localGenreEvidence } from '../genres.mjs';
import { bandPower, levels, AudioFeatures, BANDS } from '../public/analysis.js';
const root=process.cwd();
async function library(){const base=path.resolve('test-output');await fs.mkdir(base,{recursive:true});return new Library(root,await fs.mkdtemp(path.join(base,'genre-test-')));}
const artistId='11111111-1111-1111-1111-111111111111';
const recordingId='22222222-2222-2222-2222-222222222222';
const track=(id='a')=>({id,path:path.resolve('test-output',id+'.flac'),artist:'The Artist',title:'The Song',kind:'track',available:true,genre:'',plays:0});

test('genre aliases merge while generic YouTube categories and unrelated tags are excluded',()=>{
  assert.equal(canonicalGenre('DnB'),'Drum & Bass');assert.equal(canonicalGenre('drum and bass',true),'Drum & Bass');assert.equal(canonicalGenre('Music',true),'');
  assert.deepEqual(providerGenres({genres:[{name:'future garage',count:4}],tags:[{name:'seen live',count:12},{name:'electronic',count:6},{name:'music video',count:3}]}),['Electronic','Future Garage']);
  assert.deepEqual(localGenreEvidence({rawTitle:'Our House',kind:'track'}),[]);
  assert.equal(localGenreEvidence({rawTitle:'[DnB] Artist - Song',kind:'track'})[0].name,'Drum & Bass');
  assert.equal(localGenreEvidence({rawTitle:'A Liquid DnB mix',kind:'mix'})[0].name,'Liquid Drum & Bass');
});
test('precise frequency bands remain correct at 44.1, 48 and 96 kHz',()=>{
  for(const sampleRate of [44100,48000,96000])for(let band=0;band<8;band++){
    const fft=8192,db=new Float32Array(fft/2).fill(-100);const hz=(BANDS[band].low+BANDS[band].high)/2;db[Math.round(hz/(sampleRate/fft))]=-12;
    const powers=BANDS.map(b=>bandPower(db,sampleRate,fft,b.low,b.high));assert.equal(powers.indexOf(Math.max(...powers)),band);
  }
});
test('RMS/peak levels, silence, and transient decay use audio samples rather than volume controls',()=>{
  const wave=Float32Array.from({length:4800},(_,i)=>.5*Math.sin(i*2*Math.PI/48));const l=levels(wave);assert.ok(Math.abs(l.db+9.0309)<.001);assert.ok(Math.abs(l.peakDb+6.0206)<.001);assert.equal(levels(new Float32Array(100)).rms,0);
  const f=new AudioFeatures(),freq=new Float32Array(4096).fill(-100);f.update(freq,wave,48000,8192,.016,0,false);assert.equal(f.loudness,0);
  freq.fill(-30);f.update(freq,wave,48000,8192,.016,1,true);assert.ok(f.onset>0);const first=f.onset;
  for(let i=0;i<60;i++)f.update(freq,wave,48000,8192,1/60,1+i/60,true);assert.ok(f.onset<first*.1);
  for(let i=0;i<100;i++)f.update(freq,wave,48000,8192,.02,3+i*.02,false);assert.ok(f.bands.every(b=>b<.002));
});
test('artist evidence is marked as suggested, cached across songs and survives restart',async()=>{
  const lib=await library();let calls=0;lib.mbFetch=async url=>{calls++;return url.includes('?query=')?{artists:[{id:artistId,name:'The Artist',score:100}]}:{genres:[{name:'drum and bass',count:3}]};};
  try{lib.save(track());lib.save(track('b'));await lib.genres.discoverTrack('a',{deep:false});await lib.genres.discoverTrack('b',{deep:false});assert.equal(calls,2);assert.equal(lib.tracks.get('a').genre,'Drum & Bass');assert.equal(lib.tracks.get('a').genreBasis,'artist');assert.equal(lib.tracks.get('b').genreEvidence[0].scope,'artist');
    const dir=lib.dataDir;lib.close();const reopened=new Library(root,dir);reopened.mbFetch=()=>{throw Error('Cache missed');};try{await reopened.genres.discoverTrack('a',{deep:false});assert.equal(reopened.tracks.get('a').genreBasis,'artist');}finally{reopened.close();}
  }finally{if(!lib.closed)lib.close();}
});
test('recording genres take precedence, manual edits made during a request are never overwritten',async()=>{
  const lib=await library();lib.save({...track(),metadataUrl:'https://musicbrainz.org/recording/'+recordingId});lib.mbFetch=async url=>url.includes('/recording/')?{genres:[{name:'ambient',count:2}],'artist-credit':[{artist:{id:artistId,name:'The Artist'}}]}:{genres:[{name:'techno',count:1}]};
  try{await lib.genres.discoverTrack('a');assert.equal(lib.tracks.get('a').genre,'Ambient');assert.equal(lib.tracks.get('a').genreBasis,'track');assert.equal(lib.tracks.get('a').genreEvidence.length,2);
    lib.save({...track('c'),musicbrainzArtists:[{id:'33333333-3333-3333-3333-333333333333',name:'Other'}]});lib.mbFetch=async()=>{const current=lib.tracks.get('c');lib.save({...current,genre:'My style',genreLocked:true,genreBasis:'manual'});return {genres:[{name:'techno',count:3}]};};await lib.genres.discoverTrack('c',{deep:false});assert.equal(lib.tracks.get('c').genre,'My style');assert.equal(lib.tracks.get('c').genreLocked,true);
  }finally{lib.close();}
});
test('ambiguous artist names and failed network requests never become confident cached labels',async()=>{
  const lib=await library();try{lib.mbFetch=async()=>({artists:[{id:artistId,name:'The Artist',score:100},{id:recordingId,name:'The Artist',score:100}]});assert.equal(await lib.genres.artistByName('The Artist'),null);
    let attempts=0;for(let i=0;i<2;i++)await assert.rejects(lib.genres.cached('failure',async()=>{attempts++;throw Error('offline');}),/offline/);assert.equal(attempts,2);
  }finally{lib.close();}
});

test('credit-aware fallback finds a featured recording, release genres, and reuses the saved lookup',async()=>{
 const lib=await library(),releaseId='33333333-3333-3333-3333-333333333333',groupId='44444444-4444-4444-4444-444444444444';let searches=0;
 lib.save({...track(),title:'The Song (feat. Guest) [Official Audio]',artist:'The Artist',duration:180});lib.candidates=async()=>[];
 lib.mbFetch=async url=>{
  if(url.includes('/recording?')){searches++;assert.match(decodeURIComponent(url),/artist:"The Artist"/);return {recordings:[{id:recordingId,title:'The Song',length:180000,'artist-credit':[{name:'The Artist',artist:{name:'The Artist',id:artistId}}]}]};}
  if(url.includes('/recording/'))return {'artist-credit':[{artist:{id:artistId,name:'The Artist'}}],releases:[{id:releaseId,status:'Official'}]};
  if(url.includes('/release/'))return {'release-group':{id:groupId}};
  if(url.includes('/release-group/'))return {tags:[{name:'neurofunk',count:2},{name:'seen live',count:20}]};
  return {genres:[{name:'electronic',count:3}]};
 };
 try{await lib.genres.discoverTrack('a');assert.equal(lib.tracks.get('a').genre,'Neurofunk');assert.equal(lib.tracks.get('a').genreBasis,'track');assert.equal(lib.tracks.get('a').genreResearchVersion,GENRE_RESEARCH_VERSION);await lib.genres.discoverTrack('a');assert.equal(searches,1);}finally{lib.close();}
});
