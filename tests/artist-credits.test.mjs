import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Library} from '../library.mjs';
import {ARTIST_CREDIT_VERSION,artistNames,repairArtistCredits} from '../public/artist-credits.js';
import {genreArtists} from '../public/genre-identity.js';
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/artist-credits.json',import.meta.url)));
for(const fixture of cases)test('artist credits: '+fixture.case,()=>{
 const before=structuredClone(fixture.track),result=repairArtistCredits(fixture.track);
 assert.equal(result.artist,fixture.artist);assert.deepEqual(artistNames(result),fixture.names);
 assert.deepEqual(genreArtists(result),fixture.names);assert.equal(result.artistCreditVersion,ARTIST_CREDIT_VERSION);
 assert.deepEqual(fixture.track,before,'does not mutate caller');assert.deepEqual(repairArtistCredits(result),result,'repeated saves do not change credits');
});
test('credit migration repairs existing records once and preserves listening data and source evidence',()=>{
 fs.mkdirSync('test-output/release-work',{recursive:true});
 const directory=fs.mkdtempSync(path.resolve('test-output/release-work/artist-credits-')),database=path.join(directory,'library.sqlite');
 const db=new DatabaseSync(database);db.exec('CREATE TABLE tracks(id TEXT PRIMARY KEY,path TEXT UNIQUE,data TEXT NOT NULL)');
 const fixtures=[cases[1],...cases.filter(f=>['game name is not the explicitly credited cover performer','old filename-only cover credit is repaired without provider tags'].includes(f.case))];
 const originals=fixtures.map((f,i)=>({...f.track,id:String(i),path:i+'.opus',favorite:true,plays:13,position:75,genre:'Rock',genreLocked:true,available:true}));
 for(const original of originals)db.prepare('INSERT INTO tracks VALUES(?,?,?)').run(original.id,original.path,JSON.stringify(original));db.close();
 let library;try{
  library=new Library(process.cwd(),directory);const repaired=originals.map((original,i)=>{const t=library.tracks.get(original.id);assert.deepEqual(artistNames(t),fixtures[i].names);
   for(const field of ['id','path','title','rawTitle','recordingArtists','channel','favorite','plays','position','genre','genreLocked','available'])assert.deepEqual(t[field],original[field],field);return t;
  });
  library.close();library=new Library(process.cwd(),directory);for(const t of repaired)assert.deepEqual(library.tracks.get(t.id),t);
 }finally{library?.close();}
});
test('PC and Android ship the same frontend credit logic',()=>{
 for(const name of ['artist-credits.js','genre-identity.js'])assert.deepEqual(fs.readFileSync('public/'+name),fs.readFileSync('android/shared/'+name));
});
