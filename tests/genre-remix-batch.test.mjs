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
