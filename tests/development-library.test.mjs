import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectionTracks,normalizeCollections} from '../public/smart-collections.js';
import {exportPortable,validatePortable,planPortable} from '../public/portable-settings.js';
import {Library} from '../library.mjs';
import {applyTransfer,transferSnapshot,storeTransfer} from '../portable-settings.mjs';
const track={id:'one',title:'A song',artist:'Aster',youtubeId:'abcdefghijk',duration:180,available:true,favorite:true,plays:0,addedAt:Date.now(),path:'C:/private/audio.mp3',size:500,mtime:12};
const exported=(tracks=[track])=>exportPortable({tracks,preferences:{leveling:true,textSize:'large',quality:'high',visualSyncDevices:{privateHeadset:100},cookie:'secret'},sources:[{type:'youtube',name:'My list',playlist:'PLexample123',path:'C:/private/music'},{type:'folder',path:'C:/private/music'}]});
test('smart collections combine rules, update with listening history, and ignore unavailable files',()=>{
 const c={id:'new',name:'New favorites',rules:{favorite:true,unplayed:true,addedDays:7,genre:'ambient'},sort:'added'};
 const songs=[{...track,genre:'Ambient, Electronic'},{...track,id:'played',genre:'Ambient',plays:1},{...track,id:'missing',genre:'Ambient',available:false}];
 assert.deepEqual(collectionTracks(songs,c).map(t=>t.id),['one']);
 songs[0].plays=1;assert.equal(collectionTracks(songs,c).length,0);
 assert.deepEqual(normalizeCollections([{...c,path:'secret',rules:{...c.rules,credential:'secret'}}]),[c]);
});
test('portable export excludes device paths, credentials, artwork and automatic metadata',()=>{
 const bundle=exported([{...track,artwork:'private-cover.jpg',cookie:'secret',album:'Automatic',genre:'Ambient',metadataLocks:{title:true},playbackEdit:{enabled:true,start:4,end:175},lyricOffset:.2}]);
 const text=JSON.stringify(bundle);
 for(const forbidden of ['private','cookie','secret','artwork','Automatic','visualSyncDevices','quality'])assert.ok(!text.includes(forbidden),forbidden);
 assert.equal(bundle.sources.length,1);assert.equal(bundle.songs[0].edits.title,'A song');assert.equal(bundle.songs[0].edits.lyricOffset,.2);
 assert.equal(bundle.preferences.textSize,'large');
});

test('transfer rejects duplicate identities and protects conflicting provider aliases',()=>{
 const first=exported().songs[0];
 assert.throws(()=>validatePortable({...exported(),songs:[first,{...first,edits:{favorite:false}}]}),/conflicting entries/);
 const spotifyId='a'.repeat(22),target={...track,spotifyId,metadataLocks:{}};
 const songs=[
  {identity:{...first.identity},edits:{title:'First name'}},
  {identity:{title:'A song',artist:'Aster',duration:180,spotifyId},edits:{title:'Second name'}}
 ];
 const plan=planPortable(validatePortable({...exported(),songs}),[target],{replace:true});
 assert.equal(plan.ready.length,0);assert.equal(plan.conflicts.length,2);
});
test('transfer matching protects alternate recordings, ambiguous copies and existing edits',()=>{
 const bundle=exported([{...track,title:'My title',metadataLocks:{title:true}}]);
 const target={...track,id:'phone',path:'content://local/1',favorite:false};
 assert.equal(planPortable(bundle,[target]).ready.length,1);
 assert.equal(planPortable(bundle,[{...target,youtubeId:'lmnopqrstuv'}]).pending.length,1);
 assert.equal(planPortable(bundle,[target,{...target,id:'second'}]).pending.length,1);
 assert.equal(planPortable(bundle,[{...target,title:'Local title',metadataLocks:{title:true}}]).conflicts.length,1);
 assert.equal(planPortable(bundle,[{...target,title:'Local title',metadataLocks:{title:true}}],{replace:true}).ready.length,1);
 assert.equal(planPortable(bundle,[{...target,duration:240}]).pending.length,1);
});
test('portable files reject unsupported versions and cuts outside the recording',()=>{
 assert.throws(()=>validatePortable({...exported(),version:99}));
 const b=exported();b.songs[0].edits.playbackEdit={enabled:true,start:2,end:999};assert.throws(()=>validatePortable(b),/past/);
});
test('import persists edits and pending links across restart without replacing audio or unrelated settings',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'resonance-transfer-'));let lib;
 try{
  lib=new Library(root,path.join(root,'data'));lib.save({...track,favorite:false});lib.setSetting('unrelated',{keep:true});
  const bundle=exported([{...track,genre:'My genre',metadataLocks:{genre:true},playbackEdit:{enabled:true,start:5,end:178},lyricOffset:.5}]);
  storeTransfer(lib,{songs:bundle.songs,sources:bundle.sources});
  assert.equal(applyTransfer(lib,{bundle}).applied,1);
  assert.equal(lib.tracks.get('one').path,track.path);assert.equal(lib.tracks.get('one').genre,'My genre');
  assert.equal(lib.getSetting('playbackEdit:one').start,5);assert.equal(lib.getSetting('lyricOffset:one').value,.5);
  assert.equal(applyTransfer(lib,{bundle}).applied,0);
  lib.close();lib=new Library(root,path.join(root,'data'));
  assert.equal(transferSnapshot(lib).links.length,1);assert.equal(lib.getSetting('unrelated').keep,true);
 }finally{lib?.close();await fs.rm(root,{recursive:true,force:true});}
});
