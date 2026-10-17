import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Library} from '../library.mjs';
test('batch artist lookup separates a remixer from the original artist catalogue',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/genre-remix-')),lib=new Library(process.cwd(),dir),lookups=[];
 try{
  for(const [id,title] of [['a','Original'],['b','Original (Nova Remix)']])lib.save({id,title,artist:'Aster',genre:'',available:true,kind:'track',path:path.join(dir,id+'.opus'),genreLocalVersion:1});
  lib.genres.artistEvidence=async t=>{lookups.push(t.title);return [{name:t.title.includes('Remix')?'House':'Ambient',scope:'artist',source:'Test catalogue'}];};lib.genres.discoverTrack=async id=>lib.tracks.get(id);
  await lib.genres.start();assert.equal(lookups.length,2);assert.equal(lib.tracks.get('a').genre,'Ambient');assert.equal(lib.tracks.get('b').genre,'House');
 }finally{lib.close();}
});
test('a MusicBrainz outage does not prevent the independent artist catalogue fallback',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/genre-outage-')),lib=new Library(process.cwd(),dir);
 try{
  lib.mbFetch=async()=>{throw Error('Unavailable');};lib.genres.searchCatalogue=async()=>[{wrapperType:'artist',artistId:1,artistName:'Aster',primaryGenreName:'Electronic',artistLinkUrl:'https://music.apple.com/us/artist/aster/1'}];
  const evidence=await lib.genres.artistEvidence({artist:'Aster'});assert.equal(evidence[0].name,'Electronic');assert.equal(evidence[0].scope,'artist');
 }finally{lib.close();}
});
test('first successful lookup commits repaired artist credits and genre together',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/genre-credit-')),lib=new Library(process.cwd(),dir),recording='22222222-2222-2222-2222-222222222222',artist='11111111-1111-1111-1111-111111111111';
 try{
  lib.save({id:'g',title:'Guts',artist:'',channel:'Ellie Dixon',duration:126,path:path.join(dir,'song.opus'),genre:'',available:true});lib.candidates=async()=>[];
  lib.mbFetch=async url=>url.includes('/recording?')?{recordings:[{id:recording,title:'Guts',length:126000,'artist-credit':[{name:'Ellie Dixon',artist:{id:artist,name:'Ellie Dixon'}}]}]}:{genres:[{name:'pop',count:1}],'artist-credit':[{artist:{id:artist,name:'Ellie Dixon'}}]};
  const result=await lib.genres.discoverTrack('g');assert.equal(result.artist,'Ellie Dixon');assert.equal(result.genre,'Pop');assert.equal(result.genreBasis,'track');assert.equal(result.genreError,'');
 }finally{lib.close();}
});
