import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {libraryInsights,recordingGroups,artistExplanation,genreExplanation} from '../public/library-insights.js';
import {genreTitle,localRecordingCatalogue,localRecordingEvidence} from '../public/genre-identity.js';
import {metadataLocked} from '../public/metadata-locks.js';
import {artistNames,repairArtistCredits} from '../public/artist-credits.js';
import {startServer} from '../server.mjs';

const song=(id,patch={})=>({id,title:'Night',artist:'Aster',duration:180,available:true,...patch});
test('review separates missing genres, estimates and personal empty choices',()=>{
 const tracks=[song('a',{genre:''}),song('b',{genre:'Rock',genreBasis:'artist'}),song('c',{genre:'',genreLocked:true}),song('d',{genre:'Jazz',genreIdentityStale:true})];
 const i=libraryInsights(tracks);assert.equal(i.missing,1);assert.equal(i.estimates,1);assert.equal(i.counts.genres,3);
 assert.equal(genreExplanation(tracks[2]).review,false);assert.equal(genreExplanation(tracks[3]).kind,'stale');
 assert.equal(artistExplanation(song('x',{artistCreditSource:'Upload title'})).review,true);
 assert.equal(artistExplanation(song('x',{channel:'Aster',metadataLocks:{artist:true}})).review,false);
});
test('versions and copies never conflate a remix, cover artist or missing file',()=>{
 const tracks=[song('a'),song('b',{title:'Night (Official Audio)',duration:183}),song('c',{title:'Night (Nova Remix)',duration:240}),song('d',{artist:'Cover Band'}),song('e',{available:false})];
 const groups=recordingGroups(tracks);assert.equal(groups.length,1);assert.equal(groups[0].type,'versions');assert.deepEqual(groups[0].tracks.map(t=>t.id),['a','b','c']);
 assert.equal(recordingGroups(tracks.slice(0,2))[0].type,'copies');
 assert.equal(recordingGroups([song('a',{duration:0}),song('b')])[0].type,'versions');
});
test('local recording evidence requires matching credits and duration and cannot relay estimates',()=>{
 const original=song('a',{genre:'Rock, Indie Rock',genreEvidence:[{name:'Rock',scope:'embedded'}]}),target=song('b');
 const index=localRecordingCatalogue([original]);assert.deepEqual(localRecordingEvidence(target,index).map(e=>e.name),['Rock','Indie Rock']);
 for(const patch of [{artist:'Other'},{duration:200},{duration:0},{title:'Night (Remix)'},{genreLocked:true}])assert.deepEqual(localRecordingEvidence({...target,...patch},index),[]);
 for(const patch of [{genreBasis:'artist'},{genreIdentityStale:true},{genreEvidence:[{name:'Rock',scope:'local-recording'}]}])assert.equal(localRecordingCatalogue([{...original,...patch}]).size,0);
 const conflicts=localRecordingCatalogue([original,song('c',{genre:'Jazz'})]);assert.deepEqual(localRecordingEvidence(target,conflicts),[]);
});
test('editing one field keeps unrelated features discoverable, while legacy manual edits stay protected',()=>{
 const t=repairArtistCredits(song('a',{title:'Night feat. Nova (Official Video)',metadataStatus:'manual',metadataLocks:{genre:true}}));assert.deepEqual(artistNames(t),['Aster','Nova']);
 assert.equal(metadataLocked(t,'artist'),false);assert.equal(metadataLocked({...t,metadataLocks:undefined},'artist'),true);
});
test('review indexes thousands of songs without capping the collection at 150',()=>{
 const tracks=Array.from({length:2600},(_,i)=>song(String(i),{title:'Song '+i,genre:''}));const index=libraryInsights(tracks);assert.equal(index.tracks.length,2600);assert.equal(index.counts.genres,2600);assert.equal(index.groups.length,0);
});
test('saved field choices survive reopen and undo restores evidence without losing listening history',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/release-work/library-understanding-data-'));let app=await startServer({port:0,dataDir:dir,autoScan:false});
 const request=async(route,body)=>{const r=await fetch(app.url+route,{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify(body)});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;};
 try{app.lib.save({...song('a',{genre:'Rock',genreBasis:'artist',genreEvidence:[{name:'Rock',scope:'artist'}],metadataUrl:'https://musicbrainz.org/recording/old',artistCreditSource:'Upload title'}),path:path.join(dir,'a.opus'),favorite:true,plays:12});
  const saved=await request('/api/track',{id:'a',artist:'Peter, Paul and Mary; Nova',artistCredits:['Peter, Paul and Mary','Nova'],confirmFields:['artist']});
  assert.deepEqual(artistNames(saved),['Peter, Paul and Mary','Nova']);assert.equal(saved.metadataLocks.genre,undefined);assert.equal(saved.genreIdentityStale,true);assert.equal(saved.metadataUrl,'');
  const confirmed=await request('/api/track',{id:'a',genre:'Rock',confirmFields:['genre']});assert.equal(confirmed.genreLocked,true);assert.equal(confirmed.genreBasis,'manual');
  const restored=await request('/api/metadata/undo',{id:'a'});assert.equal(restored.genreBasis,'artist');assert.equal(restored.genreLocked,null);assert.equal(restored.favorite,true);assert.equal(restored.plays,12);
  await new Promise(r=>app.server.close(r));app.lib.close();app=await startServer({port:0,dataDir:dir,autoScan:false});assert.deepEqual(artistNames(app.lib.tracks.get('a')),['Peter, Paul and Mary','Nova']);
  const combined=await request('/api/track',{id:'a',artist:'Aster',genre:'Jazz'});assert.equal(combined.genreIdentityStale,false);assert.equal(combined.genreLocked,true);
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
test('new review and identity modules are identical on both platforms',async()=>{
 for(const name of ['metadata-locks.js','metadata-review.js','library-insights.js','library-review.js','library-review.css'])assert.deepEqual(await fs.readFile('public/'+name),await fs.readFile('android/shared/'+name));
});

test('words such as featured in a song title are not mistaken for artist credits',()=>{assert.equal(genreTitle({title:'A featured performer'}),'A featured performer');assert.equal(genreTitle({title:'My song (Featured edition)'}),'My song (Featured edition)');assert.equal(genreTitle({title:'Night feat. Nova'}),'Night');assert.equal(recordingGroups([song('a',{title:'A featured performer'}),song('b',{title:'A featured artist'})]).length,0);});
