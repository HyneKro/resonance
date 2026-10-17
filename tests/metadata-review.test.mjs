import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer} from '../server.mjs';
import {metadataSnapshot,selectedMetadata,reviewReasons} from '../public/metadata-review.js';

test('selected fields protect existing choices and snapshots are independent',()=>{
 const t={title:'Song',artist:'Channel',genre:'Personal',metadataLocks:{genre:true}},c={title:'Other',artist:'Artist',genre:'Rock',artistIds:[{name:'Artist',id:'a'}]};
 const before=metadataSnapshot(t),patch=selectedMetadata(t,c,['artist']);assert.equal(patch.title,undefined);assert.equal(patch.genre,undefined);assert.equal(patch.artist,'Artist');assert.deepEqual(patch.recordingArtists,['Artist']);patch.metadataLocks.title=true;assert.equal(before.metadataLocks.title,undefined);assert.equal(t.metadataLocks.artist,undefined);
 assert.throws(()=>selectedMetadata(t,c,[]));assert.throws(()=>selectedMetadata(t,c,['path']));assert.ok(reviewReasons({artist:'Upload channel',channel:'Upload channel'}).includes('Artist needs checking'));
});
test('manual edits and selected recording details can be undone without reverting favorites or playback history',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/metadata-review-')),app=await startServer({port:0,dataDir:dir,autoScan:false});
 const request=async(route,body)=>{const r=await fetch(app.url+route,{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify(body)});return {status:r.status,value:await r.json()};};
 try{app.lib.save({id:'a',path:path.join(dir,'song.wav'),title:'Song',artist:'Channel',album:'Wrong album',genre:'Personal',genreLocked:true,plays:4,available:true,duration:100});
  const edit=await request('/api/track',{id:'a',artist:'Correct artist',album:''});assert.equal(edit.status,200);assert.equal(edit.value.metadataLocks.album,true);assert.equal(edit.value.metadataLocks.artist,true);
  await request('/api/track',{id:'a',favorite:true});app.lib.save({...app.lib.tracks.get('a'),plays:5,listenedSeconds:500});
  const restored=await request('/api/metadata/undo',{id:'a'});assert.equal(restored.status,200);assert.equal(restored.value.artist,'Channel');assert.equal(restored.value.album,'Wrong album');assert.equal(restored.value.favorite,true);assert.equal(restored.value.plays,5);assert.equal(restored.value.listenedSeconds,500);
  await app.lib.applyCandidate('a','r',false,{id:'r',title:'New title',artist:'Real artist',genre:'Other genre',releaseIds:[]},['artist']);assert.equal(app.lib.tracks.get('a').title,'Song');assert.equal(app.lib.tracks.get('a').genre,'Personal');assert.equal(app.lib.tracks.get('a').artist,'Real artist');
  app.lib.save({...app.lib.tracks.get('a'),title:'Concurrent change'});const stale=await request('/api/metadata/undo',{id:'a'});assert.ok(stale.status>=400);assert.equal(app.lib.tracks.get('a').title,'Concurrent change');
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
